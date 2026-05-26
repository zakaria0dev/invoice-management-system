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
exports.bulkDeleteInvoices = exports.bulkStatusUpdate = exports.sendRefundEmail = exports.getRefundPDF = exports.getAllRefunds = exports.refundInvoice = exports.deleteInvoice = exports.updateInvoice = exports.cancelInvoice = exports.updateSignature = exports.sendInvoiceEmail = exports.createCreditNote = exports.getInvoicePDF = exports.getInvoice = exports.createInvoice = exports.getAllInvoices = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const pdfService_1 = require("../services/pdfService");
const numbering_1 = require("../utils/numbering");
const calculations_1 = require("../utils/calculations");
const emailService_1 = require("../services/emailService");
const invoiceUtils_1 = require("../utils/invoiceUtils");
const creditService_1 = require("../services/creditService");
const auditService_1 = require("../services/auditService");
const getAllInvoices = async (req, res, next) => {
    try {
        const { status, clientId } = req.query;
        const filter = {};
        if (status)
            filter.status = status;
        if (clientId)
            filter.clientId = clientId;
        const invoices = await prisma_1.default.invoice.findMany({
            where: filter,
            include: {
                client: true,
                items: true,
                payments: true,
                refunds: {
                    include: { items: true }
                },
                creditNotes: {
                    include: { items: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({
            status: 'success',
            results: invoices.length,
            data: { invoices },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllInvoices = getAllInvoices;
const createInvoice = async (req, res, next) => {
    try {
        const { items, clientId, date, dueDate, notes, number: manualNumber, status, currency, terms, legalMentions, remindersEnabled } = req.body;
        let invoice;
        let lastError;
        const maxAttempts = 5;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                invoice = await prisma_1.default.$transaction(async (tx) => {
                    // Calculate totals using shared utility
                    const { totalTTC: roundedTotal } = (0, calculations_1.calculateDocumentTotals)(items);
                    let numberToUse = manualNumber || null;
                    // If manual number is provided, ensure it's not already used
                    if (numberToUse) {
                        const existing = await tx.invoice.findUnique({
                            where: { number: numberToUse },
                            select: { id: true }
                        });
                        if (existing) {
                            // Fall back to auto-generated number
                            numberToUse = await (0, numbering_1.getNextInvoiceNumber)(tx);
                        }
                    }
                    else {
                        // Auto-generate number inside the transaction
                        numberToUse = await (0, numbering_1.getNextInvoiceNumber)(tx);
                    }
                    const newInvoice = await tx.invoice.create({
                        data: {
                            number: numberToUse,
                            total: roundedTotal,
                            date: date ? new Date(date) : new Date(),
                            dueDate: new Date(dueDate),
                            notes: notes || null,
                            status: status || 'DRAFT',
                            currency: currency || 'MAD',
                            terms: terms || null,
                            legalMentions: legalMentions || null,
                            remindersEnabled: remindersEnabled !== undefined ? remindersEnabled : true,
                            client: { connect: { id: clientId } },
                            items: {
                                create: items.map((item) => ({
                                    description: item.description,
                                    quantity: item.quantity,
                                    price: item.price,
                                    tax: item.tax || 0,
                                    discount: item.discount || 0,
                                    discountType: item.discountType || 'PERCENTAGE',
                                    productId: item.productId || null
                                }))
                            }
                        },
                        include: { items: true, client: true }
                    });
                    // Decrement stock for products and log movements
                    for (const item of items) {
                        if (item.productId) {
                            // Verify stock first
                            const pId = BigInt(item.productId);
                            const product = await tx.product.findUnique({
                                where: { id: pId }
                            });
                            if (!product) {
                                throw new error_1.AppError(`Product not found`, 404);
                            }
                            if (product.stock !== null && product.stock < item.quantity) {
                                throw new error_1.AppError(`Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`, 400);
                            }
                            await tx.product.update({
                                where: { id: pId },
                                data: { stock: { decrement: item.quantity } }
                            });
                            await tx.stockMovement.create({
                                data: {
                                    productId: pId,
                                    quantity: -item.quantity,
                                    type: 'INVOICE',
                                    note: `Invoice #${numberToUse}`
                                }
                            });
                            // Log in ProductHistory
                            await tx.productHistory.create({
                                data: {
                                    productId: pId,
                                    productName: product.name,
                                    action: 'STOCK_ADJUST',
                                    changes: {
                                        type: 'INVOICE_CREATE',
                                        quantity: -item.quantity,
                                        note: `Deducted for Invoice #${numberToUse}`
                                    },
                                    userId: req.user?.id ? BigInt(req.user.id) : null
                                }
                            });
                        }
                    }
                    let invoiceWithCorrectStatus = newInvoice;
                    const initialStatus = (0, invoiceUtils_1.calculateInvoiceStatus)(newInvoice);
                    if (initialStatus !== newInvoice.status) {
                        invoiceWithCorrectStatus = await tx.invoice.update({
                            where: { id: newInvoice.id },
                            data: { status: initialStatus },
                            include: { items: true, client: true }
                        });
                    }
                    // Create initial payment tracker
                    await tx.invoicePaymentTracker.create({
                        data: {
                            invoiceId: invoiceWithCorrectStatus.id,
                            totalAmount: roundedTotal,
                            paidAmount: 0,
                            remainingAmount: roundedTotal,
                            status: initialStatus
                        }
                    });
                    // Auto-apply client credit if available (Forced for accountants/admins on creation)
                    const userId = req.user?.id ? BigInt(req.user.id) : undefined;
                    await creditService_1.CreditService.applyCreditToInvoices(clientId, tx, true, userId);
                    return invoiceWithCorrectStatus;
                });
                break; // If we reach here, it's a success
            }
            catch (err) {
                lastError = err;
                // P2002 is Prisma's Unique Constraint Failed error
                if (err && err.code === 'P2002' && !manualNumber && attempt < maxAttempts) {
                    console.log(`Retry attempt ${attempt} due to collision on ${err.meta?.target}`);
                    continue;
                }
                throw err;
            }
        }
        if (invoice) {
            await (0, auditService_1.createAuditLog)({
                action: 'CREATE_INVOICE',
                entityId: invoice.id,
                entityType: 'INVOICE',
                details: { number: invoice.number, total: invoice.total },
                userId: req.user?.id,
                ipAddress: req.ip
            });
        }
        res.status(201).json({
            status: 'success',
            data: { invoice },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createInvoice = createInvoice;
const getInvoice = async (req, res, next) => {
    try {
        const invoice = await prisma_1.default.invoice.findUnique({
            where: { id: BigInt(req.params.id) },
            include: {
                items: true,
                client: true,
                payments: true,
                paymentTracker: true,
                refunds: {
                    include: { items: true }
                },
                creditNotes: {
                    include: { items: true }
                }
            },
        });
        if (!invoice) {
            return next(new error_1.AppError('No invoice found with that ID', 404));
        }
        // --- SELF-HEALING STATUS CHECK ---
        const calculatedStatus = (0, invoiceUtils_1.calculateInvoiceStatus)(invoice);
        const metrics = (0, invoiceUtils_1.calculateInvoiceMetrics)(invoice);
        const needsSync = invoice.status !== calculatedStatus ||
            (invoice.paymentTracker && (Number(invoice.paymentTracker.remainingAmount) !== metrics.remainingBalance ||
                invoice.paymentTracker.status !== calculatedStatus));
        if (needsSync) {
            console.log(`[Invoice Controller] Self-healing status for INV #${invoice.number}: ${invoice.status} -> ${calculatedStatus}`);
            await prisma_1.default.invoice.update({
                where: { id: invoice.id },
                data: { status: calculatedStatus }
            });
            if (invoice.paymentTracker) {
                await prisma_1.default.invoicePaymentTracker.update({
                    where: { id: invoice.paymentTracker.id },
                    data: {
                        paidAmount: metrics.netPaid,
                        remainingAmount: metrics.remainingBalance,
                        status: calculatedStatus
                    }
                });
            }
            // Refetch to return the updated object
            const updatedInvoice = await prisma_1.default.invoice.findUnique({
                where: { id: invoice.id },
                include: {
                    items: true,
                    client: true,
                    payments: true,
                    paymentTracker: true,
                    refunds: { include: { items: true } },
                    creditNotes: { include: { items: true } }
                },
            });
            return res.status(200).json({
                status: 'success',
                data: { invoice: updatedInvoice },
            });
        }
        // ---------------------------------
        res.status(200).json({
            status: 'success',
            data: { invoice },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getInvoice = getInvoice;
const getInvoicePDF = async (req, res, next) => {
    try {
        const id = BigInt(req.params.id);
        const invoice = await prisma_1.default.invoice.findUnique({
            where: { id },
            include: {
                items: true,
                client: true,
                payments: true,
                refunds: {
                    include: { items: true },
                    orderBy: { createdAt: 'desc' }
                }
            },
        });
        if (!invoice) {
            return next(new error_1.AppError('No invoice found with that ID', 404));
        }
        // If fully refunded, provide the latest Refund PDF instead of the invoice
        if (invoice.status === 'REFUNDED' && invoice.refunds.length > 0) {
            const refundId = invoice.refunds[0].id;
            const pdfBytes = await (0, pdfService_1.generateRefundPDF)(refundId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=refund-${refundId}.pdf`);
            return res.send(Buffer.from(pdfBytes));
        }
        const pdfBytes = await (0, pdfService_1.generateInvoicePDF)(invoice);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.number}.pdf`);
        res.send(Buffer.from(pdfBytes));
    }
    catch (error) {
        next(error);
    }
};
exports.getInvoicePDF = getInvoicePDF;
const createCreditNote = async (req, res, next) => {
    try {
        const { reason, type, amount, items: reqItems } = req.body;
        const invoiceId = BigInt(req.params.id);
        const creditNote = await prisma_1.default.$transaction(async (tx) => {
            const originalInvoice = await tx.invoice.findUnique({
                where: { id: invoiceId },
                include: {
                    items: true,
                    client: true,
                    payments: true,
                    paymentTracker: true,
                    refunds: { include: { items: true } },
                    creditNotes: { include: { items: true } }
                }
            });
            if (!originalInvoice)
                throw new error_1.AppError('Original invoice not found', 404);
            // --- NEW RULE: 365-Day Time Limit ---
            const oneYearAgo = new Date();
            oneYearAgo.setDate(oneYearAgo.getDate() - 365);
            if (originalInvoice.date < oneYearAgo) {
                throw new error_1.AppError('Cannot create credit note for invoices older than 365 days', 400);
            }
            if (originalInvoice.status === 'DRAFT' || originalInvoice.status === 'CANCELLED' || originalInvoice.status === 'CREDITED') {
                throw new error_1.AppError(`Cannot create credit note for invoice with status ${originalInvoice.status}`, 400);
            }
            const { getNextCreditNoteNumber } = await Promise.resolve().then(() => __importStar(require('../utils/numbering')));
            const number = await getNextCreditNoteNumber();
            let creditItems = [];
            let totalAmountToCredit = 0;
            let taxAmount = 0;
            const totalRefunds = originalInvoice.refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
            const totalPreviousCredits = originalInvoice.creditNotes?.reduce((sum, c) => sum + Number(c.total), 0) || 0;
            const availableRemainingToCredit = Number(originalInvoice.total) - totalRefunds - totalPreviousCredits;
            // Helper to get already credited quantity for an item on this invoice
            const getAlreadyCreditedQty = (itemId, description, productId) => {
                let total = 0;
                originalInvoice.creditNotes.forEach(cn => {
                    cn.items.forEach(item => {
                        // Match by productId if available, otherwise by description
                        if (productId && item.productId === productId) {
                            total += item.quantity;
                        }
                        else if (!productId && item.description === description) {
                            total += item.quantity;
                        }
                    });
                });
                return total;
            };
            if (type === 'FULL') {
                totalAmountToCredit = availableRemainingToCredit;
                if (availableRemainingToCredit < Number(originalInvoice.total) - 0.01) {
                    creditItems = [{
                            description: `Full Credit for Remaining Balance of Invoice #${originalInvoice.number}`,
                            quantity: 1,
                            price: availableRemainingToCredit,
                            tax: 0
                        }];
                    taxAmount = 0;
                }
                else {
                    creditItems = originalInvoice.items.map((item) => {
                        const netPrice = (0, calculations_1.calculateLineNetPrice)({
                            price: Number(item.price),
                            discount: Number(item.discount),
                            discountType: item.discountType,
                            quantity: Number(item.quantity)
                        });
                        const alreadyCredited = getAlreadyCreditedQty(item.id, item.description, item.productId);
                        const remainingQty = Math.max(0, item.quantity - alreadyCredited);
                        if (remainingQty <= 0)
                            return null;
                        const itemTotalHT = netPrice * remainingQty;
                        const itemTax = itemTotalHT * (Number(item.tax) / 100);
                        taxAmount += itemTax;
                        return {
                            description: item.description,
                            quantity: remainingQty,
                            price: netPrice,
                            tax: item.tax || 0,
                            productId: item.productId,
                        };
                    }).filter(Boolean);
                    // Recalculate total for FULL if it's item-based
                    totalAmountToCredit = creditItems.reduce((acc, i) => acc + (i.price * i.quantity * (1 + i.tax / 100)), 0);
                }
            }
            else if (type === 'PARTIAL') {
                totalAmountToCredit = Number(amount);
                if (!totalAmountToCredit || totalAmountToCredit <= 0)
                    throw new error_1.AppError('Amount is required for partial credit', 400);
                creditItems = [{
                        description: `Partial Credit for Invoice #${originalInvoice.number}`,
                        quantity: 1,
                        price: totalAmountToCredit,
                        tax: 0
                    }];
                taxAmount = 0;
            }
            else if (type === 'ITEM') {
                if (!reqItems || reqItems.length === 0)
                    throw new error_1.AppError('Items are required for item credit', 400);
                for (const reqItem of reqItems) {
                    const originalItem = originalInvoice.items.find((i) => i.id === BigInt(reqItem.id));
                    if (!originalItem)
                        throw new error_1.AppError(`Item ${reqItem.id} not found on invoice`, 404);
                    const alreadyCredited = getAlreadyCreditedQty(originalItem.id, originalItem.description, originalItem.productId);
                    if (reqItem.quantity + alreadyCredited > originalItem.quantity) {
                        throw new error_1.AppError(`Cannot credit ${reqItem.quantity} units for ${originalItem.description}. Already credited: ${alreadyCredited}/${originalItem.quantity}`, 400);
                    }
                    const netPrice = (0, calculations_1.calculateLineNetPrice)({
                        price: Number(originalItem.price),
                        discount: Number(originalItem.discount),
                        discountType: originalItem.discountType,
                        quantity: Number(originalItem.quantity)
                    });
                    const itemTotalExclTax = netPrice * reqItem.quantity;
                    const itemTax = itemTotalExclTax * (Number(originalItem.tax) / 100);
                    totalAmountToCredit += (itemTotalExclTax + itemTax);
                    taxAmount += itemTax;
                    creditItems.push({
                        description: originalItem.description,
                        quantity: reqItem.quantity,
                        price: netPrice,
                        tax: originalItem.tax || 0,
                        productId: originalItem.productId
                    });
                }
            }
            else {
                throw new error_1.AppError('Invalid credit note type', 400);
            }
            if (totalAmountToCredit > availableRemainingToCredit + 0.01) {
                throw new error_1.AppError(`Credit amount (${totalAmountToCredit}) exceeds available remaining invoice balance (${availableRemainingToCredit})`, 400, 'CREDIT_NOTE_EXCEEDS');
            }
            const totalPaid = originalInvoice.payments?.filter((p) => !p.isRefund).reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            const openUnpaidBalance = Math.max(0, availableRemainingToCredit - totalPaid);
            let status = 'APPLIED';
            let resolution = 'Reduce_Balance';
            // --- NEW RULE: Approval Threshold ---
            const userRole = req.user?.role;
            if (totalAmountToCredit > 1000 && userRole === 'ACCOUNTANT') {
                status = 'PENDING_APPROVAL';
                resolution = 'To_Be_Decided';
            }
            else if (totalAmountToCredit > openUnpaidBalance) {
                status = 'ISSUED';
                resolution = 'To_Be_Decided';
            }
            else if (totalAmountToCredit === 0) {
                throw new error_1.AppError('Credit note total cannot be zero', 400);
            }
            // --- NEW RULE: Expiry Date ---
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 365);
            const cn = await tx.creditNote.create({
                data: {
                    number,
                    clientId: originalInvoice.clientId,
                    invoiceId: originalInvoice.id,
                    userId: req.user?.id ? BigInt(req.user.id) : null,
                    type: type || 'FULL',
                    total: totalAmountToCredit,
                    taxAmount,
                    status,
                    resolution,
                    notes: reason || `Credit note for invoice #${originalInvoice.number}`,
                    originalInvoiceTotal: Number(originalInvoice.total),
                    remainingAmount: totalAmountToCredit,
                    expiryDate,
                    taxCalculationMethod: 'Original_Rates',
                    items: {
                        create: creditItems,
                    },
                },
                include: { items: true }
            });
            // Only increment stock if approved/issued immediately
            if (status !== 'PENDING_APPROVAL') {
                for (const item of creditItems) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stock: { increment: item.quantity } }
                        });
                        await tx.stockMovement.create({
                            data: {
                                productId: item.productId,
                                quantity: item.quantity,
                                type: 'CREDIT_NOTE',
                                note: `Restored stock from Credit Note #${number} (Invoice #${originalInvoice.number})`
                            }
                        });
                        const productInfo = await tx.product.findUnique({ where: { id: item.productId } });
                        await tx.productHistory.create({
                            data: {
                                productId: item.productId,
                                productName: productInfo?.name || item.description,
                                action: 'STOCK_ADJUST',
                                changes: { type: 'CREDIT_NOTE', creditNoteNumber: number, quantity: item.quantity },
                                userId: req.user?.id ? BigInt(req.user.id) : null
                            }
                        });
                    }
                }
                const refetchedInvoice = await tx.invoice.findUnique({
                    where: { id: invoiceId },
                    include: { payments: true, refunds: true, creditNotes: true }
                });
                const { calculateInvoiceStatus } = await Promise.resolve().then(() => __importStar(require('../utils/invoiceUtils')));
                const newStatus = calculateInvoiceStatus(refetchedInvoice);
                await tx.invoice.update({
                    where: { id: originalInvoice.id },
                    data: { status: newStatus }
                });
                await tx.invoicePaymentTracker.updateMany({
                    where: { invoiceId },
                    data: { status: newStatus, remainingAmount: Math.max(0, Number(refetchedInvoice.total) - totalRefunds - totalPreviousCredits - totalAmountToCredit) }
                });
            }
            console.log(`[AUDIT] CREATION_EVENT: CreditNote ${number} created for Invoice ${originalInvoice.id} by User ${req.user?.id}. Total: ${totalAmountToCredit}. Status: ${status}`);
            return cn;
        });
        await (0, auditService_1.createAuditLog)({
            action: 'CREATE_CREDIT_NOTE',
            entityId: creditNote.id,
            entityType: 'CREDIT_NOTE',
            details: { number: creditNote.number, total: creditNote.total, invoiceId: invoiceId.toString() },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(201).json({ status: 'success', data: { creditNote } });
    }
    catch (error) {
        next(error);
    }
};
exports.createCreditNote = createCreditNote;
const sendInvoiceEmail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const invoice = await prisma_1.default.invoice.findUnique({
            where: { id: BigInt(id) },
            include: { client: true, items: true, payments: true },
        });
        if (!invoice) {
            return next(new error_1.AppError('No invoice found with that ID', 404));
        }
        const pdfBytes = await (0, pdfService_1.generateInvoicePDF)(invoice);
        const totalPaid = invoice.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const remaining = Number(invoice.total) - totalPaid;
        const balanceInfo = remaining < Number(invoice.total)
            ? `\n\nTotal: ${Number(invoice.total).toFixed(2)} ${invoice.currency}\nPaiements reçus: ${totalPaid.toFixed(2)} ${invoice.currency}\nRESTE À PAYER: ${remaining.toFixed(2)} ${invoice.currency}`
            : "";
        const settings = await prisma_1.default.companySettings.findFirst();
        const companyName = settings?.name || 'Your Company';
        await (0, emailService_1.sendEmail)({
            email: invoice.client.email,
            subject: `Invoice #${invoice.number} from ${companyName}`,
            message: `Please find attached your invoice #${invoice.number}.${balanceInfo}`,
            attachments: [
                {
                    filename: `invoice-${invoice.number}.pdf`,
                    content: Buffer.from(pdfBytes),
                },
            ],
        });
        if (invoice.status === 'DRAFT') {
            await prisma_1.default.invoice.update({
                where: { id: invoice.id },
                data: { status: 'SENT' },
            });
        }
        await (0, auditService_1.createAuditLog)({
            action: 'SENT_INVOICE',
            entityId: invoice.id,
            entityType: 'INVOICE',
            details: { number: invoice.number, email: invoice.client.email },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(200).json({ status: 'success', message: 'Email sent successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.sendInvoiceEmail = sendInvoiceEmail;
const updateSignature = async (req, res, next) => {
    try {
        const { signature } = req.body;
        if (!signature)
            return next(new error_1.AppError('Signature is required', 400));
        const bId = BigInt(req.params.id);
        const invoice = await prisma_1.default.invoice.update({
            where: { id: bId },
            data: { signature },
        });
        res.status(200).json({ status: 'success', data: { invoice } });
    }
    catch (error) {
        next(error);
    }
};
exports.updateSignature = updateSignature;
const cancelInvoice = async (req, res, next) => {
    try {
        // Enforce secure cancellation payload
        req.body = {
            status: 'CANCELLED',
            isCancelled: true,
            voidReason: req.body.voidReason || 'Cancelled by user via dedicated endpoint'
        };
        // Delegate to the robust updateInvoice logic which handles stock restoration and logging
        return await (0, exports.updateInvoice)(req, res, next);
    }
    catch (error) {
        next(error);
    }
};
exports.cancelInvoice = cancelInvoice;
const updateInvoice = async (req, res, next) => {
    try {
        const { status, items, clientId, date, dueDate, ...invoiceData } = req.body;
        const id = BigInt(req.params.id);
        const invoice = await prisma_1.default.$transaction(async (tx) => {
            const currentInvoice = await tx.invoice.findUnique({
                where: { id },
                include: { items: true, payments: true }
            });
            if (!currentInvoice) {
                throw new error_1.AppError('No invoice found with that ID', 404);
            }
            // --- NEW: CONCURRENT_MODIFICATION Check ---
            const lastUpdatedAt = req.body.lastUpdatedAt;
            if (lastUpdatedAt && new Date(currentInvoice.updatedAt).getTime() !== new Date(lastUpdatedAt).getTime()) {
                throw new error_1.AppError('Another user modified this record. Please refresh and try again.', 409, 'CONCURRENT_MODIFICATION');
            }
            // HANDLE CANCELLATION & STOCK RESTORATION
            const isNowCancelled = req.body.isCancelled === true || req.body.isCancelled === 'true' || status === 'CANCELLED';
            const wasCancelled = currentInvoice.isCancelled;
            // Determine stock changes needed for each product
            const stockChanges = {};
            const addToStockChange = (pId, qty) => {
                const idStr = pId.toString();
                stockChanges[idStr] = (stockChanges[idStr] || 0) + qty;
            };
            // 1. Revert the old items if they were NOT cancelled previously
            if (!wasCancelled) {
                for (const oldItem of currentInvoice.items) {
                    if (oldItem.productId) {
                        addToStockChange(oldItem.productId, oldItem.quantity); // Reverting means we GET BACK stock
                    }
                }
            }
            // 2. Subtract the new items if the invoice is NOT going to be cancelled
            if (!isNowCancelled) {
                const newItems = items && Array.isArray(items) ? items : currentInvoice.items;
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
                        throw new error_1.AppError(`Not enough stock for ${product.name}. Needed: ${Math.abs(qtyDiff)}, Available: ${product.stock}`, 400);
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
                        quantity: qtyDiff, // positive for RESTORE, negative for DEDUCT
                        type: isNowCancelled ? 'CANCEL' : 'EDIT',
                        note: `Invoice #${currentInvoice.number} update`
                    }
                });
                // Log in ProductHistory
                const product = await tx.product.findUnique({ where: { id: pId } });
                await tx.productHistory.create({
                    data: {
                        productId: pId,
                        productName: product?.name || 'Unknown Product',
                        action: 'STOCK_ADJUST',
                        changes: {
                            type: isNowCancelled ? 'CANCEL' : 'EDIT',
                            quantity: qtyDiff,
                            note: `Adjusted for Invoice #${currentInvoice.number} update`
                        },
                        userId: req.user?.id ? BigInt(req.user.id) : null
                    }
                });
            }
            // If items are provided, update them and recalculate total
            let total = undefined;
            if (items && Array.isArray(items)) {
                // Delete old items
                await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
                // Create new items
                await tx.invoiceItem.createMany({
                    data: items.map((item) => ({
                        invoiceId: id,
                        description: item.description,
                        quantity: item.quantity,
                        price: item.price,
                        tax: item.tax || 0,
                        discount: item.discount || 0,
                        discountType: item.discountType || 'PERCENTAGE',
                        productId: item.productId ? BigInt(item.productId) : null
                    }))
                });
                // Calculate new total using shared utility
                const { totalTTC: calculatedTotal } = (0, calculations_1.calculateDocumentTotals)(items);
                total = calculatedTotal;
            }
            const dataToUpdate = {
                ...invoiceData,
                ...(clientId && { clientId: BigInt(clientId) }),
                ...(date && { date: new Date(date) }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
                ...(status && { status }),
                ...(total !== undefined && { total }),
            };
            if (isNowCancelled && !wasCancelled) {
                // --- NEW RULE: No Financial Impact ---
                const hasPayments = currentInvoice.payments && currentInvoice.payments.length > 0;
                if (hasPayments) {
                    throw new error_1.AppError('Cannot void an invoice that has registered payments. Please refund or credit it instead.', 400);
                }
                dataToUpdate.isCancelled = true;
                dataToUpdate.status = 'CANCELLED';
                // --- NEW RULE: Voiding Metadata ---
                dataToUpdate.voidReason = invoiceData.voidReason || 'No reason provided';
                dataToUpdate.voidedBy = req.user?.id ? BigInt(req.user.id) : null;
                dataToUpdate.voidedAt = new Date();
            }
            const updated = await tx.invoice.update({
                where: { id },
                data: dataToUpdate,
                include: { items: true, client: true, payments: true }
            });
            // Recalculate status
            let newStatus = (0, invoiceUtils_1.calculateInvoiceStatus)(updated);
            // Force status to CANCELLED if isCancelled is true
            const isCancelledVal = updated.isCancelled === true || updated.isCancelled === 'true';
            if (isCancelledVal) {
                newStatus = 'CANCELLED';
            }
            // Sync payment tracker status
            await tx.invoicePaymentTracker.updateMany({
                where: { invoiceId: id },
                data: { status: newStatus }
            });
            console.log(`[AUDIT] UPDATE_EVENT: Invoice #${currentInvoice.number} updated. Status: ${newStatus}. Cancelled: ${isCancelledVal}`);
            const finalInvoice = await tx.invoice.update({
                where: { id },
                data: { status: newStatus },
                include: { items: true, client: true, payments: true }
            });
            // Auto-apply client credit if status is active (SENT, PARTIALLY_PAID)
            if (newStatus === 'SENT' || newStatus === 'PARTIALLY_PAID' || newStatus === 'OVERDUE') {
                const userId = req.user?.id ? BigInt(req.user.id) : undefined;
                await creditService_1.CreditService.applyCreditToInvoices(updated.clientId, tx, true, userId);
            }
            return finalInvoice;
        });
        await (0, auditService_1.createAuditLog)({
            action: 'UPDATE_INVOICE',
            entityId: invoice.id,
            entityType: 'INVOICE',
            details: { number: invoice.number, status: invoice.status },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(200).json({ status: 'success', data: { invoice } });
    }
    catch (error) {
        next(error);
    }
};
exports.updateInvoice = updateInvoice;
const deleteInvoice = async (req, res, next) => {
    try {
        const id = BigInt(req.params.id);
        try {
            await prisma_1.default.$transaction(async (tx) => {
                const invoice = await tx.invoice.findUnique({
                    where: { id },
                    include: { items: true }
                });
                if (!invoice) {
                    throw new Error('NOT_FOUND');
                }
                if (req.user.role === 'ACCOUNTANT' && invoice.status !== 'DRAFT') {
                    throw new Error('FORBIDDEN');
                }
                // If it wasn't already cancelled, we need to restore the deducted stock
                if (!invoice.isCancelled) {
                    for (const item of invoice.items) {
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
                                    note: `Restored from deleted Invoice #${invoice.number}`
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
                                        type: 'INVOICE_DELETE',
                                        quantity: item.quantity,
                                        note: `Restored from deleted Invoice #${invoice.number}`
                                    },
                                    userId: req.user?.id ? BigInt(req.user.id) : null
                                }
                            });
                        }
                    }
                }
                await tx.invoice.delete({
                    where: { id },
                });
            });
            await (0, auditService_1.createAuditLog)({
                action: 'DELETE_INVOICE',
                entityId: id,
                entityType: 'INVOICE',
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
                return next(new error_1.AppError('No invoice found with that ID', 404));
            }
            if (err.message === 'FORBIDDEN') {
                return next(new error_1.AppError('Accountants can only delete DRAFT invoices', 403));
            }
            // Handle foreign key constraint errors (e.g. existing payments/credit notes)
            if (err && err.code === 'P2003') {
                return next(new error_1.AppError('Cannot delete an invoice that has related payments or credit notes. Please cancel it instead.', 400));
            }
            throw err;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.deleteInvoice = deleteInvoice;
const refundInvoice = async (req, res, next) => {
    try {
        const id = BigInt(req.params.id);
        const { reason, items: refundItemsData, refundToCreditBalance } = req.body;
        const result = await prisma_1.default.$transaction(async (tx) => {
            const invoice = await tx.invoice.findUnique({
                where: { id },
                include: { items: true, payments: true }
            });
            if (!invoice) {
                throw new error_1.AppError('No invoice found with that ID', 404);
            }
            if (invoice.status !== 'PAID' && invoice.status !== 'PARTIALLY_PAID' && invoice.status !== 'PARTIALLY_REFUNDED') {
                throw new error_1.AppError('Only paid or partially paid invoices can be refunded', 400);
            }
            let amountOfItemsReturned = 0;
            let itemsToProcess = [];
            let isFullRefund = false;
            if (!refundItemsData || refundItemsData.length === 0) {
                // Full refund - all items returned
                isFullRefund = true;
                itemsToProcess = invoice.items.map(item => {
                    const netPrice = (0, calculations_1.calculateLineNetPrice)({
                        price: Number(item.price),
                        discount: Number(item.discount),
                        discountType: item.discountType,
                        quantity: Number(item.quantity)
                    });
                    return {
                        productId: item.productId,
                        description: item.description,
                        quantity: item.quantity,
                        price: netPrice,
                        tax: item.tax
                    };
                });
                // Calculate the value of all items returned (with tax)
                amountOfItemsReturned = itemsToProcess.reduce((sum, item) => sum + Number(item.price) * item.quantity * (1 + Number(item.tax) / 100), 0);
            }
            else {
                // Partial refund - based on specific items
                let fullyRefundedItemsCount = 0;
                for (const itemData of refundItemsData) {
                    const invoiceItem = invoice.items.find(i => i.id === BigInt(itemData.id));
                    if (!invoiceItem)
                        throw new error_1.AppError(`Item with ID ${itemData.id} not found in this invoice`, 404);
                    // Check if already refunded in previous transactions
                    const previouslyRefundedQty = (await tx.refundItem.aggregate({
                        where: {
                            productId: invoiceItem.productId,
                            description: invoiceItem.description, // Added description for better matching of custom items
                            refund: { invoiceId: id }
                        },
                        _sum: { quantity: true }
                    }))._sum.quantity || 0;
                    if (itemData.quantity > (invoiceItem.quantity - previouslyRefundedQty)) {
                        throw new error_1.AppError(`Cannot refund more than available for ${invoiceItem.description}. Purchased: ${invoiceItem.quantity}, Already Refunded: ${previouslyRefundedQty}`, 400);
                    }
                    const netPrice = (0, calculations_1.calculateLineNetPrice)({
                        price: Number(invoiceItem.price),
                        discount: Number(invoiceItem.discount),
                        discountType: invoiceItem.discountType,
                        quantity: Number(invoiceItem.quantity)
                    });
                    const itemValueTotal = netPrice * itemData.quantity * (1 + (Number(invoiceItem.tax) / 100));
                    amountOfItemsReturned += itemValueTotal;
                    itemsToProcess.push({
                        productId: invoiceItem.productId,
                        description: invoiceItem.description,
                        quantity: itemData.quantity,
                        price: netPrice,
                        tax: invoiceItem.tax
                    });
                    if (Number(itemData.quantity) + Number(previouslyRefundedQty) >= Number(invoiceItem.quantity)) {
                        fullyRefundedItemsCount++;
                    }
                }
                isFullRefund = (fullyRefundedItemsCount === invoice.items.length);
            }
            /**
             * REFUND MATH MINI-SPEC:
             *
             * 1. RV_new (Current Return Value) = Sum of items requested for refund now.
             * 2. ET_new (New Effective Total) = Original Total - (Previous Returns + RV_new) - Credits.
             * 3. NP (Net Paid) = Total Paid - Total Cash Refunded So Far.
             * 4. Cash to Give = MAX(0, NP - ET_new).
             * 5. The return value first reduces any remaining balance, and only results in cash back if overpaid.
             */
            const currentMetrics = (0, invoiceUtils_1.calculateInvoiceMetrics)(invoice);
            const newTotalReturns = currentMetrics.returnsValue + amountOfItemsReturned;
            const newEffectiveTotal = Math.max(0, parseFloat(invoice.total.toString()) - newTotalReturns - currentMetrics.appliedCredits);
            // Cash refund is only given if the client has already paid more than the new reduced total
            const cashToRefund = Math.max(0, currentMetrics.netPaid - newEffectiveTotal);
            // 1. Create Refund Record
            const refund = await tx.refund.create({
                data: {
                    invoiceId: id,
                    amount: cashToRefund,
                    reason: reason || (isFullRefund ? 'Full refund' : 'Partial refund'),
                    userId: req.user?.id ? BigInt(req.user.id) : null,
                    metadata: {
                        policy: 'Standard return policy',
                        originalRequestedValue: amountOfItemsReturned,
                        isFullReturn: isFullRefund
                    },
                    items: {
                        create: itemsToProcess.map(item => ({
                            productId: item.productId,
                            description: item.description,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                }
            });
            // 2. Restore stock
            for (const item of itemsToProcess) {
                if (item.productId) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            quantity: item.quantity,
                            type: 'REFUND',
                            note: `Stock restored from refund of Invoice #${invoice.number}`,
                            invoiceId: id
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
                                type: 'REFUND',
                                quantity: item.quantity,
                                note: `Restored from refund of Invoice #${invoice.number}`
                            },
                            userId: req.user?.id ? BigInt(req.user.id) : null
                        }
                    });
                }
            }
            // 3. Handle Payment / Credit Balance
            if (cashToRefund > 0) {
                if (refundToCreditBalance) {
                    // Update Client Balance
                    await tx.client.update({
                        where: { id: invoice.clientId },
                        data: { creditBalance: { increment: cashToRefund } }
                    });
                    // Create negative Payment record (The Balance Path)
                    await tx.payment.create({
                        data: {
                            amount: -cashToRefund,
                            method: 'CREDIT_LEDGER',
                            invoiceId: id,
                            isRefund: true,
                            refundId: refund.id,
                            date: new Date(),
                            userId: req.user?.id ? BigInt(req.user.id) : null
                        }
                    });
                    // Log Credit Audit
                    await tx.auditLog.create({
                        data: {
                            action: 'REFUND_TO_LEDGER',
                            entityId: invoice.clientId,
                            entityType: 'CLIENT',
                            details: {
                                amount: cashToRefund,
                                invoiceId: id.toString(),
                                refundId: refund.id.toString()
                            },
                            userId: req.user?.id ? BigInt(req.user.id) : null
                        }
                    });
                }
                else {
                    // Create negative Payment record (The Cash Path)
                    await tx.payment.create({
                        data: {
                            amount: -cashToRefund,
                            method: 'REFUND',
                            invoiceId: id,
                            isRefund: true,
                            refundId: refund.id,
                            date: new Date(),
                            userId: req.user?.id ? BigInt(req.user.id) : null
                        }
                    });
                }
            }
            // 4. Update Invoice Status & Tracker using formalized logic
            // We fetch the updated invoice with all relations to use the utility
            const updatedRawInvoice = await tx.invoice.findUnique({
                where: { id },
                include: {
                    payments: true,
                    refunds: true,
                    creditNotes: true
                }
            });
            if (!updatedRawInvoice)
                throw new Error('Invoice not found during update');
            const metrics = (0, invoiceUtils_1.calculateInvoiceMetrics)(updatedRawInvoice);
            const nextStatus = (0, invoiceUtils_1.calculateInvoiceStatus)(updatedRawInvoice);
            const updatedInvoice = await tx.invoice.update({
                where: { id },
                data: {
                    status: nextStatus,
                    ...(isFullRefund && metrics.remainingBalance <= 0.01 && { isCancelled: true })
                }
            });
            await tx.invoicePaymentTracker.upsert({
                where: { invoiceId: id },
                create: {
                    invoiceId: id,
                    status: nextStatus,
                    paidAmount: metrics.netPaid,
                    remainingAmount: metrics.remainingBalance,
                    totalAmount: Number(updatedRawInvoice.total)
                },
                update: {
                    status: nextStatus,
                    paidAmount: metrics.netPaid,
                    remainingAmount: metrics.remainingBalance
                }
            });
            return { refund, updatedInvoice, metrics };
        });
        await (0, auditService_1.createAuditLog)({
            action: 'REFUND_INVOICE',
            entityId: id,
            entityType: 'INVOICE',
            details: { refundId: result.refund.id.toString(), amount: result.refund.amount },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(200).json({
            status: 'success',
            data: result
        });
    }
    catch (error) {
        next(error);
    }
};
exports.refundInvoice = refundInvoice;
const getAllRefunds = async (req, res, next) => {
    try {
        const refunds = await prisma_1.default.refund.findMany({
            include: {
                invoice: {
                    include: { client: true }
                },
                items: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({
            status: 'success',
            results: refunds.length,
            data: { refunds }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllRefunds = getAllRefunds;
const getRefundPDF = async (req, res, next) => {
    try {
        const { id } = req.params;
        const pdfBuffer = await (0, pdfService_1.generateRefundPDF)(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=refund-${id}.pdf`);
        res.send(Buffer.from(pdfBuffer));
    }
    catch (error) {
        next(error);
    }
};
exports.getRefundPDF = getRefundPDF;
const sendRefundEmail = async (req, res, next) => {
    try {
        const { id } = req.params;
        const refund = await prisma_1.default.refund.findUnique({
            where: { id: BigInt(id) },
            include: { invoice: { include: { client: true } } }
        });
        if (!refund)
            throw new error_1.AppError('Refund not found', 404);
        const pdfBuffer = await (0, pdfService_1.generateRefundPDF)(id);
        await (0, emailService_1.sendEmail)({
            email: refund.invoice.client.email,
            subject: `Remboursement - Reçu RF-${refund.id}`,
            message: `Bonjour,\n\nVeuillez trouver ci-joint votre reçu de remboursement RF-${refund.id}.\n\nCordialement,`,
            attachments: [
                {
                    filename: `refund-${refund.id}.pdf`,
                    content: Buffer.from(pdfBuffer),
                },
            ],
        });
        res.status(200).json({ status: 'success', message: 'Email sent successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.sendRefundEmail = sendRefundEmail;
const bulkStatusUpdate = async (req, res, next) => {
    try {
        const { ids, status } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return next(new error_1.AppError('No invoice IDs provided', 400));
        }
        if (!status) {
            return next(new error_1.AppError('No status provided', 400));
        }
        // Convert string IDs to BigInt
        const bigIntIds = ids.map(id => BigInt(id));
        const invoices = await prisma_1.default.invoice.findMany({
            where: { id: { in: bigIntIds } },
            select: { id: true, clientId: true }
        });
        await prisma_1.default.invoice.updateMany({
            where: { id: { in: bigIntIds } },
            data: { status: status }
        });
        // Sync payment tracker status
        await prisma_1.default.invoicePaymentTracker.updateMany({
            where: { invoiceId: { in: bigIntIds } },
            data: { status: status }
        });
        // Auto-apply credit for active statuses
        if (['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(status)) {
            const clientIds = [...new Set(invoices.map(i => i.clientId))];
            const userId = req.user?.id ? BigInt(req.user.id) : undefined;
            for (const cId of clientIds) {
                await creditService_1.CreditService.applyCreditToInvoices(cId, undefined, true, userId);
            }
        }
        res.status(200).json({
            status: 'success',
            message: `${ids.length} invoices updated successfully`
        });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkStatusUpdate = bulkStatusUpdate;
const bulkDeleteInvoices = async (req, res, next) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return next(new error_1.AppError('No invoice IDs provided', 400));
        }
        const stats = { deleted: 0, skipped: 0 };
        await prisma_1.default.$transaction(async (tx) => {
            for (const id of ids) {
                const bId = BigInt(id);
                const invoice = await tx.invoice.findUnique({
                    where: { id: bId },
                    include: { items: true }
                });
                if (!invoice) {
                    stats.skipped++;
                    continue;
                }
                // Restriction for Accountants
                if (req.user.role === 'ACCOUNTANT' && invoice.status !== 'DRAFT') {
                    stats.skipped++;
                    continue;
                }
                // Restore stock
                if (!invoice.isCancelled) {
                    for (const item of invoice.items) {
                        if (item.productId) {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stock: { increment: item.quantity } }
                            });
                        }
                    }
                }
                await tx.invoice.delete({ where: { id: bId } });
                stats.deleted++;
            }
        });
        res.status(200).json({
            status: 'success',
            message: `Successfully deleted ${stats.deleted} invoices. Skipped ${stats.skipped}.`,
            data: stats
        });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkDeleteInvoices = bulkDeleteInvoices;
