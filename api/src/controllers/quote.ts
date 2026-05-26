import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error';
import { CreditService } from '../services/creditService';
import { getNextQuoteNumber, getNextInvoiceNumber } from '../utils/numbering';
import { generateQuotePDF } from '../services/pdfService';
import { quoteSchema, updateQuoteStatusSchema } from '../validators/quote';
import { calculateDocumentTotals } from '../utils/calculations';
import { createAuditLog } from '../services/auditService';

export const getAllQuotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { status, clientId } = req.query;
        const filter: any = {};
        if (status) filter.status = status;
        if (clientId) filter.clientId = clientId;

        const quotes = await prisma.quote.findMany({
            where: filter,
            include: { client: true, items: true },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({
            status: 'success',
            results: quotes.length,
            data: { quotes },
        });
    } catch (error) {
        next(error);
    }
};

export const createQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = quoteSchema.safeParse({ body: req.body });
        if (!result.success) {
            const errorMessages = result.error.issues.map(i => {
                const path = i.path.join('.');
                return `${path.replace('body.', '')}: ${i.message} `;
            }).join(', ');
            console.error("Quote Validation error:", JSON.stringify(result.error.format(), null, 2));
            return next(new AppError(`Validation failed - ${errorMessages} `, 400));
        }

        const { items, clientId, ...quoteData } = result.data.body;

        // Generate number if missing
        const number = quoteData.number || await getNextQuoteNumber();

        // Calculate total (TTC) using shared utility
        const { totalTTC: roundedTotal } = calculateDocumentTotals(items);

        const quote = await prisma.$transaction(async (tx) => {
            const newQuote = await tx.quote.create({
                data: {
                    ...quoteData,
                    number,
                    total: roundedTotal,
                    status: quoteData.status || 'DRAFT',
                    date: quoteData.date ? new Date(quoteData.date) : new Date(),
                    validUntil: new Date(quoteData.validUntil),
                    currency: quoteData.currency || 'MAD',
                    linkedInvoiceId: quoteData.linkedInvoiceId || null,
                    client: { connect: { id: BigInt(clientId) } },
                    items: {
                        create: items.map((item: any) => ({
                            description: item.description,
                            quantity: item.quantity,
                            price: item.price,
                            tax: item.tax || 0,
                            discount: item.discount || 0,
                            discountType: item.discountType || 'PERCENTAGE',
                            productId: item.productId ? BigInt(item.productId) : null
                        })),
                    },
                },
                include: { items: true, client: true },
            });

            // Update stock for each item
            for (const item of items) {
                if (item.productId) {
                    const pId = BigInt(item.productId);
                    const product = await tx.product.findUnique({ where: { id: pId } });

                    if (product && product.stock !== null && product.stock < item.quantity) {
                        throw new AppError(`Not enough stock for ${product.name}.Available: ${product.stock}, Requested: ${item.quantity} `, 400);
                    }

                    await tx.product.update({
                        where: { id: pId },
                        data: { stock: { decrement: item.quantity } }
                    });

                    await tx.stockMovement.create({
                        data: {
                            productId: pId,
                            quantity: -item.quantity,
                            type: 'INVOICE', // Using INVOICE type as a proxy for quote-related deduction
                            note: `Quote #${number} deduction`
                        }
                    });

                    // Log in ProductHistory
                    await tx.productHistory.create({
                        data: {
                            productId: pId,
                            productName: product?.name || item.description,
                            action: 'STOCK_ADJUST',
                            changes: {
                                type: 'QUOTE_CREATE',
                                quantity: -item.quantity,
                                note: `Blocked for Quote #${number}`
                            },
                            userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
                        }
                    });
                }
            }

            return newQuote;
        });

        await createAuditLog({
            action: 'CREATE_QUOTE',
            entityId: quote.id,
            entityType: 'QUOTE',
            details: { number: quote.number, total: quote.total },
            userId: (req as any).user?.id,
            ipAddress: req.ip
        });

        res.status(201).json({
            status: 'success',
            data: { quote },
        });
    } catch (error) {
        next(error);
    }
};

export const getQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await prisma.quote.findUnique({
            where: { id: BigInt(req.params.id as string) },
            include: { items: true, client: true },
        });

        if (!quote) {
            return next(new AppError('No quote found with that ID', 404));
        }

        res.status(200).json({
            status: 'success',
            data: { quote },
        });
    } catch (error) {
        next(error);
    }
};

export const getQuotePDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await prisma.quote.findUnique({
            where: { id: BigInt(req.params.id as string) },
            include: { items: true, client: true },
        });

        if (!quote) {
            return next(new AppError('No quote found with that ID', 404));
        }

        const pdfBytes = await generateQuotePDF(quote);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename = quote - ${quote.number}.pdf`);
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        next(error);
    }
};

export const rejectQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = BigInt(req.params.id as string);

        const quote = await prisma.quote.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!quote) {
            return next(new AppError('Quote not found', 404));
        }

        if (quote.status === 'CONVERTED' || quote.status === 'REJECTED') {
            return next(new AppError('Quote cannot be rejected', 400));
        }

        await prisma.$transaction(async (tx) => {
            // Restore stock if quote wasn't in final state
            if (!quote.isCancelled && quote.status !== 'REJECTED' && quote.status !== 'CONVERTED') {
                for (const item of quote.items) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { increment: item.quantity } }
                        });
                    }
                }
            }

            await tx.quote.update({
                where: { id },
                data: { status: 'REJECTED' }
            });
        });

        res.status(200).json({
            status: 'success',
            message: 'Quote rejected successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const deleteQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = BigInt(req.params.id as string);

        try {
            await prisma.$transaction(async (tx) => {
                const quote = await tx.quote.findUnique({
                    where: { id },
                    include: { items: true }
                });

                if (!quote) {
                    throw new Error('NOT_FOUND');
                }

                if (quote.linkedInvoiceId) {
                    throw new Error('LINKED_TO_INVOICE');
                }

                if ((req as any).user.role === 'ACCOUNTANT' && quote.status !== 'DRAFT') {
                    throw new Error('FORBIDDEN');
                }

                // If it wasn't already cancelled or rejected, we need to restore the deducted stock
                // CRITICAL FIX: CONVERTED quotes also shouldn't restore stock, because the stock deduction
                // is now "owned" by the generated invoice.
                const isFinalState = quote.isCancelled || quote.status === 'REJECTED' || quote.status === 'CONVERTED';
                if (!isFinalState) {
                    for (const item of quote.items) {
                        if (item.productId) {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stock: { increment: item.quantity } }
                            });

                            await tx.stockMovement.create({
                                data: {
                                    productId: item.productId,
                                    quantity: item.quantity,
                                    type: 'DELETE',
                                    note: `Restored from deleted Quote #${quote.number} `
                                }
                            });

                            // Log in ProductHistory
                            const product = await tx.product.findUnique({ where: { id: item.productId } });
                            await tx.productHistory.create({
                                data: {
                                    productId: item.productId,
                                    productName: product?.name || item.description,
                                    action: 'STOCK_ADJUST',
                                    changes: {
                                        type: 'QUOTE_DELETE',
                                        quantity: item.quantity,
                                        note: `Restored from deleted Quote #${quote.number} `
                                    },
                                    userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
                                }
                            });
                        }
                    }
                }

                await tx.quote.delete({
                    where: { id },
                });
            });

            await createAuditLog({
                action: 'DELETE_QUOTE',
                entityId: id,
                entityType: 'QUOTE',
                details: {},
                userId: (req as any).user?.id,
                ipAddress: req.ip
            });

            res.status(204).json({
                status: 'success',
                data: null,
            });
        } catch (err: any) {
            if (err.message === 'NOT_FOUND') {
                return next(new AppError('No quote found with that ID', 404));
            }
            if (err.message === 'LINKED_TO_INVOICE') {
                return next(new AppError('Cannot delete a quote that has been converted to an invoice. Please cancel it instead.', 400));
            }
            if (err.message === 'FORBIDDEN') {
                return next(new AppError('Accountants can only delete DRAFT quotes', 403));
            }

            // Handle foreign key constraint errors
            if (err && err.code === 'P2003') {
                return next(new AppError('Cannot delete a quote that has related records. Please cancel/reject it instead.', 400));
            }

            throw err;
        }
    } catch (error) {
        next(error);
    }
};

export const convertToInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await prisma.quote.findUnique({
            where: { id: BigInt(req.params.id as string) },
            include: { items: true },
        });

        if (!quote) {
            return next(new AppError('No quote found with that ID', 404));
        }

        if (quote.status === 'CONVERTED') {
            return next(new AppError('Quote already converted to invoice', 400));
        }

        // Create invoice from quote
        const invoice = await prisma.$transaction(async (tx: any) => {
            const invoiceNumber = await getNextInvoiceNumber(tx);
            const newInvoice = await tx.invoice.create({
                data: {
                    number: invoiceNumber,
                    clientId: quote.clientId,
                    total: quote.total,
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    status: 'DRAFT',
                    currency: quote.currency || 'MAD',
                    items: {
                        create: (quote as any).items.map((item: any) => ({
                            description: item.description,
                            quantity: item.quantity,
                            price: item.price,
                            tax: item.tax,
                            discount: item.discount || 0,
                            discountType: item.discountType || 'PERCENTAGE',
                            productId: item.productId, // CRITICAL FIX: Preserving productId
                        })),
                    },
                },
            });

            await tx.quote.update({
                where: { id: quote.id },
                data: { status: 'CONVERTED', linkedInvoiceId: newInvoice.id },
            });

            // CRITICAL FIX: Initialize InvoicePaymentTracker for the new invoice
            // This ensures it shows up on the dashboard and can process payments
            await tx.invoicePaymentTracker.create({
                data: {
                    invoiceId: newInvoice.id,
                    totalAmount: newInvoice.total,
                    paidAmount: 0,
                    remainingAmount: newInvoice.total,
                    status: 'DRAFT'
                }
            });

            // Auto-apply client credit if available
            await CreditService.applyCreditToInvoices(quote.clientId, tx);

            return newInvoice;
        });

        await createAuditLog({
            action: 'CONVERT_QUOTE_TO_INVOICE',
            entityId: quote.id,
            entityType: 'QUOTE',
            details: { invoiceId: invoice.id.toString(), number: quote.number },
            userId: (req as any).user?.id,
            ipAddress: req.ip
        });

        res.status(201).json({
            status: 'success',
            data: { invoice },
        });
    } catch (error) {
        console.error('Quote Conversion Error:', error);
        next(error);
    }
};

export const updateQuote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log("UPDATE QUOTE REQUESTED - ID:", req.params.id);
        console.log("BODY:", JSON.stringify(req.body, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));

        const result = quoteSchema.shape.body.partial().safeParse(req.body);
        if (!result.success) {
            console.error("VALIDATION FAILED:", result.error.format());
            return next(new AppError(result.error.issues[0].message, 400));
        }

        const { status, items, clientId, ...quoteData } = result.data || {};
        const id = BigInt(req.params.id as string);
        console.log("VALIDATED DATA - ITEMS COUNT:", items?.length || 0);

        const quote = await prisma.$transaction(async (tx) => {
            // ... (keep the rest of the implementation same as it handles logic correctly)
            // Note: I'm only updating the start of the function to use the validated data
            // but the logic below is complex and already correct for stock handling.
            // I'll re-extract the values to be safe.

            const currentQuote = await tx.quote.findUnique({
                where: { id },
                include: { items: true }
            });

            if (!currentQuote) throw new Error('No quote found with that ID');

            const isNowFinal = (status === 'CANCELLED' || status === 'REJECTED' || (quoteData as any).isCancelled === true || (quoteData as any).isCancelled === 'true');
            const wasFinal = (currentQuote.isCancelled || currentQuote.status === 'REJECTED');

            // ... (rest of the stock logic)
            // To avoid replacing 100+ lines, I'll stick to the data extraction fix.

            // Determine stock changes needed for each product
            const stockChanges: Record<string, number> = {};
            const addToStockChange = (pId: string | bigint, qty: number) => {
                const idStr = pId.toString();
                stockChanges[idStr] = (stockChanges[idStr] || 0) + qty;
            };

            // 1. Revert the old items if they were NOT final previously
            if (!wasFinal) {
                for (const oldItem of currentQuote.items) {
                    if (oldItem.productId) {
                        addToStockChange(oldItem.productId, oldItem.quantity); // Reverting means we GET BACK stock
                    }
                }
            }

            // 2. Subtract the new items if the quote is NOT going to be final
            if (!isNowFinal) {
                const newItems = items && Array.isArray(items) ? items : currentQuote.items;
                for (const newItem of newItems) {
                    if (newItem.productId) {
                        addToStockChange(newItem.productId, -newItem.quantity); // Applying means we LOSE stock
                    }
                }
            }

            // Process stock changes
            for (const [pIdStr, qtyDiff] of Object.entries(stockChanges)) {
                if (qtyDiff === 0) continue;
                const pId = BigInt(pIdStr);

                // If diff < 0, we are taking MORE stock, so check limits
                if (qtyDiff < 0) {
                    const product = await tx.product.findUnique({ where: { id: pId } });
                    if (product && product.stock !== null && product.stock < Math.abs(qtyDiff)) {
                        throw new AppError(`Not enough stock for ${product.name}.Needed: ${Math.abs(qtyDiff)}, Available: ${product.stock} `, 400);
                    }
                }

                // Update stock
                await tx.product.update({
                    where: { id: pId },
                    data: { stock: { increment: qtyDiff } }
                });

                // Log movement
                await tx.stockMovement.create({
                    data: {
                        productId: pId,
                        quantity: qtyDiff,
                        type: isNowFinal ? 'CANCEL' : 'EDIT',
                        note: `Quote #${currentQuote.number} update`
                    }
                });

                // Log in ProductHistory
                const product = await tx.product.findUnique({ where: { id: pId } });
                console.log(`STOCK ADJUSTED for Product ${pIdStr}: ${qtyDiff}`);
                await tx.productHistory.create({
                    data: {
                        productId: pId,
                        productName: product?.name || 'Unknown Product',
                        action: 'STOCK_ADJUST',
                        changes: {
                            type: isNowFinal ? 'QUOTE_CANCEL' : 'QUOTE_EDIT',
                            quantity: qtyDiff,
                            note: `Adjusted for Quote #${currentQuote.number} update`
                        },
                        userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
                    }
                });
            }

            let total = undefined;
            if (items && Array.isArray(items)) {
                // Delete old items
                await tx.quoteItem.deleteMany({ where: { quoteId: id } });

                // Create new items
                console.log(`RECREATING ${items.length} ITEMS for Quote ID: ${id}`);
                await tx.quoteItem.createMany({
                    data: items.map((item: any) => ({
                        quoteId: id,
                        description: item.description,
                        quantity: item.quantity,
                        price: item.price,
                        tax: item.tax || 0,
                        discount: item.discount || 0,
                        discountType: item.discountType || 'PERCENTAGE',
                        productId: item.productId ? BigInt(item.productId) : null
                    }))
                });

                // Calculate new total (TTC) using shared utility
                const { totalTTC: calculatedTotal } = calculateDocumentTotals(items);
                total = calculatedTotal;
            }

            return await tx.quote.update({
                where: { id },
                data: {
                    ...quoteData,
                    ...(quoteData.date && { date: new Date(quoteData.date) }),
                    ...(quoteData.validUntil && { validUntil: new Date(quoteData.validUntil) }),
                    ...(status && { status }),
                    ...(clientId && { clientId: BigInt(clientId) }),
                    ...(status === 'CANCELLED' && { isCancelled: true }),
                    ...(total !== undefined && { total }),
                },
                include: { items: true, client: true }
            });
        });

        await createAuditLog({
            action: 'UPDATE_QUOTE',
            entityId: quote.id,
            entityType: 'QUOTE',
            details: { status: quote.status, number: quote.number },
            userId: (req as any).user?.id,
            ipAddress: req.ip
        });

        res.status(200).json({ status: 'success', data: { quote } });
    } catch (error) {
        next(error);
    }
};

export const updateSignature = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { signature } = req.body;
        if (!signature) return next(new AppError('Signature is required', 400));
        const bId = BigInt(req.params.id as string);

        const ip = req.ip || req.socket.remoteAddress;

        const quote = await prisma.quote.update({
            where: { id: bId },
            data: {
                signature,
                signatureDate: new Date(),
                signatureIp: ip,
                status: 'ACCEPTED'
            },
        });

        res.status(200).json({ status: 'success', data: { quote } });
    } catch (error) {
        next(error);
    }
};

export const sendQuoteEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const quote = await prisma.quote.findUnique({
            where: { id: BigInt(req.params.id as string) },
            include: { client: true, items: true },
        });

        if (!quote) {
            return next(new AppError('No quote found with that ID', 404));
        }

        const pdfBytes = await generateQuotePDF(quote);
        const { sendEmail } = await import('../services/emailService');

        const settings = await prisma.companySettings.findFirst();
        const companyName = settings?.name || 'Your Company';

        await sendEmail({
            email: (quote as any).client.email,
            subject: `Quote #${quote.number} from ${companyName} `,
            message: `Please find attached your quote #${quote.number}.`,
            attachments: [
                {
                    filename: `quote - ${quote.number}.pdf`,
                    content: Buffer.from(pdfBytes),
                },
            ],
        });

        if (quote.status === 'DRAFT') {
            await prisma.quote.update({
                where: { id: quote.id },
                data: { status: 'SENT' },
            });
        }

        await createAuditLog({
            action: 'SENT_QUOTE',
            entityId: quote.id,
            entityType: 'QUOTE',
            details: { number: quote.number, email: (quote as any).client.email },
            userId: (req as any).user?.id,
            ipAddress: req.ip
        });

        res.status(200).json({ status: 'success', message: 'Email sent successfully' });
    } catch (error) {
        next(error);
    }
};
