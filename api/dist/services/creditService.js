"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditService = void 0;
const client_1 = require("@prisma/client");
const invoiceUtils_1 = require("../utils/invoiceUtils");
const prisma = new client_1.PrismaClient();
class CreditService {
    /**
     * Automatically applies available credit balance to unpaid invoices for a specific client.
     * @param clientId The ID of the client
     * @param tx Optional Prisma transaction client
     */
    /**
     * Automatically applies available credit balance to unpaid invoices for a specific client.
     * @param clientId The ID of the client
     * @param tx Optional Prisma transaction client
     * @param force Force application even if autoApplyCredit is false
     * @param userId The ID of the user performing the action
     */
    static async applyCreditToInvoices(clientId, tx, force = false, userId) {
        const db = tx || prisma;
        try {
            // 1. Fetch client's current credit balance and auto-apply preference
            const client = await db.client.findUnique({
                where: { id: clientId },
                select: { id: true, creditBalance: true, autoApplyCredit: true }
            });
            if (!client) {
                console.error(`[CreditService] Client ${clientId} not found`);
                return;
            }
            // If not forced and auto-apply is disabled, skip
            if (!force && !client.autoApplyCredit) {
                console.log(`[CreditService] Auto-apply credit disabled for client ${clientId}`);
                return;
            }
            let availableCredit = Number(client.creditBalance);
            if (availableCredit <= 0) {
                return;
            }
            // 2. Fetch all unpaid or partially paid invoices for this client (oldest first)
            const unpaidInvoices = await db.invoice.findMany({
                where: {
                    clientId,
                    status: {
                        in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE']
                    },
                    isCancelled: false
                },
                orderBy: [
                    { date: 'asc' },
                    { createdAt: 'asc' }
                ],
                include: {
                    paymentTracker: true
                }
            });
            if (unpaidInvoices.length === 0) {
                return;
            }
            console.log(`[CreditService] Found ${unpaidInvoices.length} unpaid invoices for client ${clientId}. Applying $${availableCredit} credit.`);
            let appliedInTotal = 0;
            for (const invoice of unpaidInvoices) {
                if (availableCredit <= 0)
                    break;
                const remainingToPay = Number(invoice.paymentTracker?.remainingAmount ?? invoice.total);
                if (remainingToPay <= 0)
                    continue;
                const amountToApply = Math.min(availableCredit, remainingToPay);
                // 3. Create Payment record for this application
                await db.payment.create({
                    data: {
                        amount: amountToApply,
                        method: 'CREDIT_BALANCE',
                        invoiceId: invoice.id,
                        userId: userId || null,
                        date: new Date()
                    }
                });
                // 4. Update Invoice & Payment Tracker - FETCH AFTER PAYMENT to get accurate metrics
                const fullInvoice = await db.invoice.findUnique({
                    where: { id: invoice.id },
                    include: { payments: true, refunds: true, creditNotes: true }
                });
                if (!fullInvoice)
                    continue;
                const nextStatus = (0, invoiceUtils_1.calculateInvoiceStatus)(fullInvoice);
                const metrics = (0, invoiceUtils_1.calculateInvoiceMetrics)(fullInvoice);
                await db.invoice.update({
                    where: { id: invoice.id },
                    data: { status: nextStatus }
                });
                if (invoice.paymentTracker) {
                    await db.invoicePaymentTracker.update({
                        where: { id: invoice.paymentTracker.id },
                        data: {
                            paidAmount: metrics.netPaid,
                            remainingAmount: metrics.remainingBalance,
                            status: nextStatus
                        }
                    });
                }
                else {
                    await db.invoicePaymentTracker.create({
                        data: {
                            invoiceId: invoice.id,
                            totalAmount: Number(invoice.total),
                            paidAmount: metrics.netPaid,
                            remainingAmount: metrics.remainingBalance,
                            status: nextStatus
                        }
                    });
                }
                // 5. Log history
                await db.auditLog.create({
                    data: {
                        action: 'CREDIT_AUTO_APPLIED',
                        entityId: invoice.id,
                        entityType: 'INVOICE',
                        details: {
                            amount: amountToApply,
                            previousRemaining: remainingToPay,
                            newRemaining: metrics.remainingBalance,
                            clientId: clientId.toString()
                        },
                        userId: userId || null
                    }
                });
                availableCredit -= amountToApply;
                appliedInTotal += amountToApply;
            }
            // 6. Update Client's final credit balance
            if (appliedInTotal > 0) {
                await db.client.update({
                    where: { id: clientId },
                    data: {
                        creditBalance: {
                            decrement: appliedInTotal
                        }
                    }
                });
                console.log(`[CreditService] Successfully applied $${appliedInTotal} credit to invoices for client ${clientId}.`);
            }
        }
        catch (error) {
            console.error(`[CreditService] Error applying credit to invoices for client ${clientId}:`, error);
        }
    }
}
exports.CreditService = CreditService;
