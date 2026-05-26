"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayments = exports.createPayment = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const invoiceUtils_1 = require("../utils/invoiceUtils");
const payment_1 = require("../validators/payment");
const auditService_1 = require("../services/auditService");
const createPayment = async (req, res, next) => {
    try {
        const result = payment_1.paymentSchema.safeParse({ body: req.body });
        if (!result.success) {
            return next(new error_1.AppError(result.error.issues[0].message, 400));
        }
        const { amount, method, invoiceId, creditNoteId, date: paymentDate } = result.data.body;
        const date = paymentDate ? new Date(paymentDate) : new Date();
        let payment;
        if (invoiceId) {
            const bInvoiceId = BigInt(invoiceId);
            const invoice = await prisma_1.default.invoice.findUnique({ where: { id: bInvoiceId } });
            if (!invoice)
                return next(new error_1.AppError('No invoice found with that ID', 404));
            // --- NEW: DUPLICATE_PAYMENT Check ---
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            const existingPayment = await prisma_1.default.payment.findFirst({
                where: {
                    invoiceId: bInvoiceId,
                    amount: amount,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    isRefund: false
                }
            });
            if (existingPayment) {
                return next(new error_1.AppError('Payment already registered for this invoice on this date', 400, 'DUPLICATE_PAYMENT'));
            }
            payment = await prisma_1.default.payment.create({
                data: {
                    amount,
                    method,
                    invoiceId: bInvoiceId,
                    date,
                    userId: req.user?.id ? BigInt(req.user.id) : null
                }
            });
            // Update invoice status
            const updatedInvoice = await prisma_1.default.invoice.findUnique({
                where: { id: bInvoiceId },
                include: { payments: true, refunds: true, creditNotes: true }
            });
            if (updatedInvoice) {
                const newStatus = (0, invoiceUtils_1.calculateInvoiceStatus)(updatedInvoice);
                const totalPaid = updatedInvoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const totalAmount = Number(updatedInvoice.total);
                const remainingAmount = Math.max(0, totalAmount - totalPaid);
                await prisma_1.default.$transaction([
                    prisma_1.default.invoice.update({
                        where: { id: bInvoiceId },
                        data: { status: newStatus }
                    }),
                    prisma_1.default.invoicePaymentTracker.upsert({
                        where: { invoiceId: bInvoiceId },
                        create: {
                            invoiceId: bInvoiceId,
                            totalAmount,
                            paidAmount: totalPaid,
                            remainingAmount,
                            status: newStatus
                        },
                        update: {
                            paidAmount: totalPaid,
                            remainingAmount,
                            status: newStatus
                        }
                    })
                ]);
            }
        }
        else if (creditNoteId) {
            const bCreditNoteId = BigInt(creditNoteId);
            const creditNote = await prisma_1.default.creditNote.findUnique({ where: { id: bCreditNoteId } });
            if (!creditNote)
                return next(new error_1.AppError('No credit note found with that ID', 404));
            payment = await prisma_1.default.payment.create({
                data: {
                    amount,
                    method,
                    creditNoteId: bCreditNoteId,
                    date,
                    userId: req.user?.id ? BigInt(req.user.id) : null
                }
            });
            // Update credit note status to PAID if total is reached
            const updatedCreditNote = await prisma_1.default.creditNote.findUnique({
                where: { id: bCreditNoteId },
                include: { payments: true }
            });
            if (updatedCreditNote) {
                const totalPaid = updatedCreditNote.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const totalAmount = Number(updatedCreditNote.total);
                if (totalPaid >= totalAmount) {
                    await prisma_1.default.creditNote.update({
                        where: { id: bCreditNoteId },
                        data: { status: 'PAID' }
                    });
                }
                else if (totalPaid > 0) {
                    await prisma_1.default.creditNote.update({
                        where: { id: bCreditNoteId },
                        data: { status: 'PARTIALLY_PAID' }
                    });
                }
            }
        }
        if (payment) {
            await (0, auditService_1.createAuditLog)({
                action: 'CREATE_PAYMENT',
                entityId: payment.id,
                entityType: 'PAYMENT',
                details: { amount: payment.amount, method: payment.method, invoiceId: invoiceId?.toString(), creditNoteId: creditNoteId?.toString() },
                userId: req.user?.id,
                ipAddress: req.ip
            });
        }
        res.status(201).json({
            status: 'success',
            data: { payment },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createPayment = createPayment;
const getPayments = async (req, res, next) => {
    try {
        const { invoiceId, creditNoteId } = req.query;
        const filter = {};
        if (invoiceId)
            filter.invoiceId = BigInt(invoiceId);
        if (creditNoteId)
            filter.creditNoteId = BigInt(creditNoteId);
        const payments = await prisma_1.default.payment.findMany({
            where: filter,
            include: {
                invoice: { include: { client: true } },
                creditNote: { include: { client: true } }
            },
            orderBy: { id: 'desc' },
        });
        const flatPayments = payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            date: p.date,
            method: p.method,
            note: '',
            invoiceNumber: p.invoice?.number || p.creditNote?.number,
            clientName: p.invoice?.client?.name || p.creditNote?.client?.name,
            invoiceStatus: p.invoice?.status || p.creditNote?.status
        }));
        res.status(200).json({
            status: 'success',
            results: flatPayments.length,
            data: { payments: flatPayments },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPayments = getPayments;
