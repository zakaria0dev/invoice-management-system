import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error';
import { calculateInvoiceStatus } from '../utils/invoiceUtils';
import { paymentSchema } from '../validators/payment';
import { createAuditLog } from '../services/auditService';

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = paymentSchema.safeParse({ body: req.body });
        if (!result.success) {
            return next(new AppError(result.error.issues[0].message, 400));
        }

        const { amount, method, invoiceId, creditNoteId, date: paymentDate } = result.data.body;
        const date = paymentDate ? new Date(paymentDate) : new Date();

        let payment;

        if (invoiceId) {
            const bInvoiceId = BigInt(invoiceId as any);
            const invoice = await prisma.invoice.findUnique({ where: { id: bInvoiceId } });
            if (!invoice) return next(new AppError('No invoice found with that ID', 404));

            // --- NEW: DUPLICATE_PAYMENT Check ---
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const existingPayment = await prisma.payment.findFirst({
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
                return next(new AppError('Payment already registered for this invoice on this date', 400, 'DUPLICATE_PAYMENT'));
            }

            payment = await prisma.payment.create({
                data: {
                    amount,
                    method,
                    invoiceId: bInvoiceId,
                    date,
                    userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
                }
            });

            // Update invoice status
            const updatedInvoice = await prisma.invoice.findUnique({
                where: { id: bInvoiceId },
                include: { payments: true, refunds: true, creditNotes: true }
            });

            if (updatedInvoice) {
                const newStatus = calculateInvoiceStatus(updatedInvoice as any);
                const totalPaid = updatedInvoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const totalAmount = Number(updatedInvoice.total);
                const remainingAmount = Math.max(0, totalAmount - totalPaid);

                await prisma.$transaction([
                    prisma.invoice.update({
                        where: { id: bInvoiceId },
                        data: { status: newStatus }
                    }),
                    prisma.invoicePaymentTracker.upsert({
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
        } else if (creditNoteId) {
            const bCreditNoteId = BigInt(creditNoteId as any);
            const creditNote = await prisma.creditNote.findUnique({ where: { id: bCreditNoteId } });
            if (!creditNote) return next(new AppError('No credit note found with that ID', 404));

            payment = await prisma.payment.create({
                data: {
                    amount,
                    method,
                    creditNoteId: bCreditNoteId,
                    date,
                    userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
                }
            });

            // Update credit note status to PAID if total is reached
            const updatedCreditNote = await prisma.creditNote.findUnique({
                where: { id: bCreditNoteId },
                include: { payments: true }
            });

            if (updatedCreditNote) {
                const totalPaid = updatedCreditNote.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const totalAmount = Number(updatedCreditNote.total);

                if (totalPaid >= totalAmount) {
                    await prisma.creditNote.update({
                        where: { id: bCreditNoteId },
                        data: { status: 'PAID' }
                    });
                } else if (totalPaid > 0) {
                    await prisma.creditNote.update({
                        where: { id: bCreditNoteId },
                        data: { status: 'PARTIALLY_PAID' }
                    });
                }
            }
        }

        if (payment) {
            await createAuditLog({
                action: 'CREATE_PAYMENT',
                entityId: payment.id,
                entityType: 'PAYMENT',
                details: { amount: payment.amount, method: payment.method, invoiceId: invoiceId?.toString(), creditNoteId: creditNoteId?.toString() },
                userId: (req as any).user?.id,
                ipAddress: req.ip
            });
        }

        res.status(201).json({
            status: 'success',
            data: { payment },
        });
    } catch (error) {
        next(error);
    }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { invoiceId, creditNoteId } = req.query;
        const filter: any = {};
        if (invoiceId) filter.invoiceId = BigInt(invoiceId as string);
        if (creditNoteId) filter.creditNoteId = BigInt(creditNoteId as string);

        const payments = await prisma.payment.findMany({
            where: filter,
            include: {
                invoice: { include: { client: true } },
                creditNote: { include: { client: true } }
            } as any,
            orderBy: { id: 'desc' },
        });

        const flatPayments = payments.map((p: any) => ({
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
    } catch (error) {
        next(error);
    }
};
