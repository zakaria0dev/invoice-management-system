"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendQuoteEmail = exports.updateSignature = exports.updateQuote = exports.convertToInvoice = exports.deleteQuote = exports.rejectQuote = exports.getQuotePDF = exports.getQuote = exports.createQuote = exports.getAllQuotes = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const creditService_1 = require("../services/creditService");
const numbering_1 = require("../utils/numbering");
const pdfService_1 = require("../services/pdfService");
const quote_1 = require("../validators/quote");
const calculations_1 = require("../utils/calculations");
const auditService_1 = require("../services/auditService");
const getAllQuotes = async (req, res, next) => {
    try {
        const { status, clientId } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (clientId)
            filter.clientId = clientId;
        const quotes = await prisma_1.default.quote.findMany({
            where: filter,
            include: { client: true, items: true },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({
            status: 'success',
            results: quotes.length,
            data: { quotes },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllQuotes = getAllQuotes;
const createQuote = async (req, res, next) => {
    try {
        const result = quote_1.quoteSchema.safeParse({ body: req.body });
        if (!result.success) {
            const errorMessages = result.error.issues.map(i => {
                const path = i.path.join('.');
                return `${path.replace('body.', '')}: ${i.message} `;
            }).join(', ');
            console.error("Quote Validation error:", JSON.stringify(result.error.format(), null, 2));
            return next(new error_1.AppError(`Validation failed - ${errorMessages} `, 400));
        }
        const { items, clientId, ...quoteData } = result.data.body;
        // Generate number if missing
        const number = quoteData.number || await (0, numbering_1.getNextQuoteNumber)();
        // Calculate total (TTC) using shared utility
        const { totalTTC: roundedTotal } = (0, calculations_1.calculateDocumentTotals)(items);
        const quote = await prisma_1.default.$transaction(async (tx) => {
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
                        create: items.map((item) => ({
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
                        throw new error_1.AppError(`Not enough stock for ${product.name}.Available: ${product.stock}, Requested: ${item.quantity} `, 400);
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
                            userId: req.user?.id ? BigInt(req.user.id) : null
                        }
                    });
                }
            }
            return newQuote;
        });
        await (0, auditService_1.createAuditLog)({
            action: 'CREATE_QUOTE',
            entityId: quote.id,
            entityType: 'QUOTE',
            details: { number: quote.number, total: quote.total },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(201).json({
            status: 'success',
            data: { quote },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createQuote = createQuote;
const getQuote = async (req, res, next) => {
    try {
        const quote = await prisma_1.default.quote.findUnique({
            where: { id: BigInt(req.params.id) },
            include: { items: true, client: true },
        });
        if (!quote) {
            return next(new error_1.AppError('No quote found with that ID', 404));
        }
        res.status(200).json({
            status: 'success',
            data: { quote },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getQuote = getQuote;
const getQuotePDF = async (req, res, next) => {
    try {
        const quote = await prisma_1.default.quote.findUnique({
            where: { id: BigInt(req.params.id) },
            include: { items: true, client: true },
        });
        if (!quote) {
            return next(new error_1.AppError('No quote found with that ID', 404));
        }
        const pdfBytes = await (0, pdfService_1.generateQuotePDF)(quote);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename = quote - ${quote.number}.pdf`);
        res.send(Buffer.from(pdfBytes));
    }
    catch (error) {
        next(error);
    }
};
exports.getQuotePDF = getQuotePDF;
const rejectQuote = async (req, res, next) => {
    try {
        const id = BigInt(req.params.id);
        const quote = await prisma_1.default.quote.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!quote) {
            return next(new error_1.AppError('Quote not found', 404));
        }
        if (quote.status === 'CONVERTED' || quote.status === 'REJECTED') {
            return next(new error_1.AppError('Quote cannot be rejected', 400));
        }
        await prisma_1.default.$transaction(async (tx) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.rejectQuote = rejectQuote;
const deleteQuote = async (req, res, next) => {
    try {
        const id = BigInt(req.params.id);
        try {
            await prisma_1.default.$transaction(async (tx) => {
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
                if (req.user.role === 'ACCOUNTANT' && quote.status !== 'DRAFT') {
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
                                    userId: req.user?.id ? BigInt(req.user.id) : null
                                }
                            });
                        }
                    }
                }
                await tx.quote.delete({
                    where: { id },
                });
            });
            await (0, auditService_1.createAuditLog)({
                action: 'DELETE_QUOTE',
                entityId: id,
                entityType: 'QUOTE',
                details: {},
                userId: req.user?.id,
                ipAddress: req.ip
            });
            res.status(204).json({
                status: 'success',
                data: null,
            });
        }
        catch (err) {
            if (err.message === 'NOT_FOUND') {
                return next(new error_1.AppError('No quote found with that ID', 404));
            }
            if (err.message === 'LINKED_TO_INVOICE') {
                return next(new error_1.AppError('Cannot delete a quote that has been converted to an invoice. Please cancel it instead.', 400));
            }
            if (err.message === 'FORBIDDEN') {
                return next(new error_1.AppError('Accountants can only delete DRAFT quotes', 403));
            }
            // Handle foreign key constraint errors
            if (err && err.code === 'P2003') {
                return next(new error_1.AppError('Cannot delete a quote that has related records. Please cancel/reject it instead.', 400));
            }
            throw err;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.deleteQuote = deleteQuote;
const convertToInvoice = async (req, res, next) => {
    try {
        const quote = await prisma_1.default.quote.findUnique({
            where: { id: BigInt(req.params.id) },
            include: { items: true },
        });
        if (!quote) {
            return next(new error_1.AppError('No quote found with that ID', 404));
        }
        if (quote.status === 'CONVERTED') {
            return next(new error_1.AppError('Quote already converted to invoice', 400));
        }
        // Create invoice from quote
        const invoice = await prisma_1.default.$transaction(async (tx) => {
            const invoiceNumber = await (0, numbering_1.getNextInvoiceNumber)(tx);
            const newInvoice = await tx.invoice.create({
                data: {
                    number: invoiceNumber,
                    clientId: quote.clientId,
                    total: quote.total,
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    status: 'DRAFT',
                    currency: quote.currency || 'MAD',
                    items: {
                        create: quote.items.map((item) => ({
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
            await creditService_1.CreditService.applyCreditToInvoices(quote.clientId, tx);
            return newInvoice;
        });
        await (0, auditService_1.createAuditLog)({
            action: 'CONVERT_QUOTE_TO_INVOICE',
            entityId: quote.id,
            entityType: 'QUOTE',
            details: { invoiceId: invoice.id.toString(), number: quote.number },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(201).json({
            status: 'success',
            data: { invoice },
        });
    }
    catch (error) {
        console.error('Quote Conversion Error:', error);
        next(error);
    }
};
exports.convertToInvoice = convertToInvoice;
const updateQuote = async (req, res, next) => {
    try {
        console.log("UPDATE QUOTE REQUESTED - ID:", req.params.id);
        console.log("BODY:", JSON.stringify(req.body, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
        const result = quote_1.quoteSchema.shape.body.partial().safeParse(req.body);
        if (!result.success) {
            console.error("VALIDATION FAILED:", result.error.format());
            return next(new error_1.AppError(result.error.issues[0].message, 400));
        }
        const { status, items, clientId, ...quoteData } = result.data || {};
        const id = BigInt(req.params.id);
        console.log("VALIDATED DATA - ITEMS COUNT:", items?.length || 0);
        const quote = await prisma_1.default.$transaction(async (tx) => {
            // ... (keep the rest of the implementation same as it handles logic correctly)
            // Note: I'm only updating the start of the function to use the validated data
            // but the logic below is complex and already correct for stock handling.
            // I'll re-extract the values to be safe.
            const currentQuote = await tx.quote.findUnique({
                where: { id },
                include: { items: true }
            });
            if (!currentQuote)
                throw new Error('No quote found with that ID');
            const isNowFinal = (status === 'CANCELLED' || status === 'REJECTED' || quoteData.isCancelled === true || quoteData.isCancelled === 'true');
            const wasFinal = (currentQuote.isCancelled || currentQuote.status === 'REJECTED');
            // ... (rest of the stock logic)
            // To avoid replacing 100+ lines, I'll stick to the data extraction fix.
            // Determine stock changes needed for each product
            const stockChanges = {};
            const addToStockChange = (pId, qty) => {
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
                if (qtyDiff === 0)
                    continue;
                const pId = BigInt(pIdStr);
                // If diff < 0, we are taking MORE stock, so check limits
                if (qtyDiff < 0) {
                    const product = await tx.product.findUnique({ where: { id: pId } });
                    if (product && product.stock !== null && product.stock < Math.abs(qtyDiff)) {
                        throw new error_1.AppError(`Not enough stock for ${product.name}.Needed: ${Math.abs(qtyDiff)}, Available: ${product.stock} `, 400);
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
                        userId: req.user?.id ? BigInt(req.user.id) : null
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
                    data: items.map((item) => ({
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
                const { totalTTC: calculatedTotal } = (0, calculations_1.calculateDocumentTotals)(items);
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
        await (0, auditService_1.createAuditLog)({
            action: 'UPDATE_QUOTE',
            entityId: quote.id,
            entityType: 'QUOTE',
            details: { status: quote.status, number: quote.number },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(200).json({ status: 'success', data: { quote } });
    }
    catch (error) {
        next(error);
    }
};
exports.updateQuote = updateQuote;
const updateSignature = async (req, res, next) => {
    try {
        const { signature } = req.body;
        if (!signature)
            return next(new error_1.AppError('Signature is required', 400));
        const bId = BigInt(req.params.id);
        const ip = req.ip || req.socket.remoteAddress;
        const quote = await prisma_1.default.quote.update({
            where: { id: bId },
            data: {
                signature,
                signatureDate: new Date(),
                signatureIp: ip,
                status: 'ACCEPTED'
            },
        });
        res.status(200).json({ status: 'success', data: { quote } });
    }
    catch (error) {
        next(error);
    }
};
exports.updateSignature = updateSignature;
const sendQuoteEmail = async (req, res, next) => {
    try {
        const quote = await prisma_1.default.quote.findUnique({
            where: { id: BigInt(req.params.id) },
            include: { client: true, items: true },
        });
        if (!quote) {
            return next(new error_1.AppError('No quote found with that ID', 404));
        }
        const pdfBytes = await (0, pdfService_1.generateQuotePDF)(quote);
        const { sendEmail } = await Promise.resolve().then(() => __importStar(require('../services/emailService')));
        const settings = await prisma_1.default.companySettings.findFirst();
        const companyName = settings?.name || 'Your Company';
        await sendEmail({
            email: quote.client.email,
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
            await prisma_1.default.quote.update({
                where: { id: quote.id },
                data: { status: 'SENT' },
            });
        }
        await (0, auditService_1.createAuditLog)({
            action: 'SENT_QUOTE',
            entityId: quote.id,
            entityType: 'QUOTE',
            details: { number: quote.number, email: quote.client.email },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(200).json({ status: 'success', message: 'Email sent successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.sendQuoteEmail = sendQuoteEmail;
