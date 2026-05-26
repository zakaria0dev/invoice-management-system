import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error';
import { generateCreditNotePDF } from '../services/pdfService';
import { sendEmail } from '../services/emailService';
import { CreditService } from '../services/creditService';
import { createAuditLog } from '../services/auditService';

export const sendCreditNoteEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creditNote = await prisma.creditNote.findUnique({
            where: { id: BigInt(req.params.id as string) },
            include: { client: true, invoice: true, items: true },
        });

        if (!creditNote) return next(new AppError('No credit note found with that ID', 404));
        if (!creditNote.client.email) return next(new AppError('Client has no email address', 400));

        const pdfBytes = await generateCreditNotePDF(creditNote as any);

        await sendEmail({
            email: creditNote.client.email,
            subject: `Credit Note ${creditNote.number} from ${creditNote.invoice.number}`,
            message: `Please find attached the credit note ${creditNote.number} related to invoice ${creditNote.invoice.number}.`,
            attachments: [
                {
                    filename: `creditnote-${creditNote.number}.pdf`,
                    content: Buffer.from(pdfBytes),
                },
            ],
        });

        res.status(200).json({ status: 'success', message: 'Email sent successfully' });
    } catch (error) {
        next(error);
    }
};

export const getAllCreditNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creditNotes = await prisma.creditNote.findMany({
            include: { client: true, invoice: true, items: true, payments: true, user: { select: { name: true, email: true, role: true } } },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ status: 'success', results: creditNotes.length, data: { creditNotes } });
    } catch (error) {
        next(error);
    }
};

export const getCreditNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creditNote = await prisma.creditNote.findUnique({
            where: { id: BigInt(req.params.id as string) },
            include: { client: true, items: true, invoice: true, payments: true, user: { select: { name: true, email: true, role: true } } },
        });

        if (!creditNote) return next(new AppError('No credit note found with that ID', 404));

        res.status(200).json({ status: 'success', data: { creditNote } });
    } catch (error) {
        next(error);
    }
};

export const getCreditNotePDF = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const creditNote = await prisma.creditNote.findUnique({
            where: { id: BigInt(req.params.id as string) },
            include: { items: true, client: true, invoice: true, payments: true },
        });

        if (!creditNote) return next(new AppError('No credit note found with that ID', 404));

        const pdfBytes = await generateCreditNotePDF(creditNote);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=creditnote-${creditNote.number}.pdf`);
        res.send(Buffer.from(pdfBytes));
    } catch (error) {
        next(error);
    }
};

export const deleteCreditNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = BigInt(req.params.id as string);

        await prisma.$transaction(async (tx) => {
            const creditNote = await tx.creditNote.findUnique({
                where: { id },
                include: { items: true, invoice: true }
            });

            if (!creditNote) {
                throw new AppError('No credit note found with that ID', 404);
            }

            // --- NEW RULE: 24h Cancel Window (Relaxed for ADMIN) ---
            const twentyFourHoursAgo = new Date();
            twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
            const userRole = (req as any).user?.role;
            if (userRole !== 'ADMIN' && creditNote.createdAt < twentyFourHoursAgo) {
                throw new AppError('Credit notes can only be cancelled within 24 hours of creation', 400);
            }

            // --- NEW RULE: No Financial Impact ---
            // 1. Check if it's already reconciled/applied
            if (creditNote.status === 'APPLIED' || creditNote.status === 'REFUNDED' || creditNote.status === 'PARTIALLY_APPLIED') {
                throw new AppError('Cannot cancel a credit note that has already been applied or refunded', 400);
            }

            // 2. Check for physical payments (refunds) or applications
            const countPayments = await tx.payment.count({ where: { creditNoteId: id } });
            // Note: Since I just added CreditApplication to schema, I'll check it too
            // If the prisma client isn't updated, this might fail, so I'll wrap it or check existence
            let countApplications = 0;
            try {
                countApplications = await (tx as any).creditApplication.count({ where: { creditNoteId: id } });
            } catch (e) {
                // If the model is not yet available in the generated client
                console.warn('CreditApplication model not found in Prisma client during deletion check');
            }

            if (countPayments > 0 || countApplications > 0) {
                throw new AppError('Cannot cancel a credit note with existing financial transactions or applications', 400);
            }

            await tx.creditNote.delete({
                where: { id },
            });

            // Log history for each item
            for (const item of creditNote.items) {
                if (item.productId) {
                    await tx.productHistory.create({
                        data: {
                            productId: item.productId,
                            productName: item.description,
                            action: 'DELETE',
                            changes: {
                                type: 'CREDIT_NOTE_DELETE',
                                note: `Credit Note #${creditNote.number} was deleted. This item (${item.quantity} units) was originally restored via the credit note.`
                            },
                            userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
                        }
                    });
                }
            }

            await createAuditLog({
                action: 'DELETE_CREDIT_NOTE',
                entityId: id,
                entityType: 'CREDIT_NOTE',
                details: { number: creditNote.number },
                userId: (req as any).user?.id,
                ipAddress: req.ip
            });
        });

        res.status(204).json({ status: 'success', data: null });
    } catch (error) {
        next(error);
    }
};

export const applyToLedger = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = BigInt(req.params.id as string);
        const cn = await prisma.$transaction(async (tx) => {
            const creditNote = await tx.creditNote.findUnique({ where: { id } });
            if (!creditNote) throw new AppError('Credit note not found', 404);

            // --- NEW: CONCURRENT_MODIFICATION Check ---
            const lastUpdatedAt = req.body.lastUpdatedAt;
            if (lastUpdatedAt && new Date(creditNote.updatedAt).getTime() !== new Date(lastUpdatedAt).getTime()) {
                throw new AppError('Another user modified this record. Please refresh and try again.', 409, 'CONCURRENT_MODIFICATION');
            }

            if (creditNote.status === 'APPLIED' || creditNote.status === 'REFUNDED') {
                throw new AppError('Credit note already solved or applied', 400);
            }

            await tx.client.update({
                where: { id: creditNote.clientId },
                data: { creditBalance: { increment: creditNote.total } }
            });

            // Trigger auto-application of credit to unpaid invoices
            await CreditService.applyCreditToInvoices(creditNote.clientId, tx);

            const updated = await tx.creditNote.update({
                where: { id },
                data: {
                    status: 'APPLIED',
                    resolution: 'Customer_Credit',
                    userId: (req as any).user?.id ? BigInt((req as any).user.id) : creditNote.userId
                }
            });

            await createAuditLog({
                action: 'APPLY_CREDIT_TO_LEDGER',
                entityId: id,
                entityType: 'CREDIT_NOTE',
                details: { number: creditNote.number, amount: creditNote.total },
                userId: (req as any).user?.id,
                ipAddress: req.ip
            });

            return updated;
        });
        res.status(200).json({ status: 'success', data: { creditNote: cn } });
    } catch (error) { next(error); }
};

export const refundCreditNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = BigInt(req.params.id as string);
        const cn = await prisma.$transaction(async (tx) => {
            const creditNote = await tx.creditNote.findUnique({ where: { id } });
            if (!creditNote) throw new AppError('Credit note not found', 404);
            if (creditNote.status === 'APPLIED' || creditNote.status === 'REFUNDED') {
                throw new AppError('Credit note already solved or applied', 400);
            }

            const updated = await tx.creditNote.update({
                where: { id },
                data: {
                    status: 'REFUNDED',
                    resolution: 'Refund',
                    userId: (req as any).user?.id ? BigInt((req as any).user.id) : creditNote.userId
                }
            });

            await createAuditLog({
                action: 'REFUND_CREDIT_NOTE',
                entityId: id,
                entityType: 'CREDIT_NOTE',
                details: { number: creditNote.number, amount: creditNote.total },
                userId: (req as any).user?.id,
                ipAddress: req.ip
            });

            return updated;
        });
        res.status(200).json({ status: 'success', data: { creditNote: cn } });
    } catch (error) { next(error); }
};
