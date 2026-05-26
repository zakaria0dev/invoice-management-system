import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function auditAndFix() {
    try {
        const invoices = await prisma.invoice.findMany({
            include: {
                payments: true,
                refunds: true,
                tracker: true
            }
        });

        console.log(`--- Auditing ${invoices.length} Invoices ---`);
        let totalPending = 0;
        let fixedCount = 0;

        for (const inv of invoices) {
            const totalValue = Number(inv.total);
            const totalRefunds = inv.refunds.reduce((s: number, r: any) => s + Number(r.amount), 0);
            const netPayments = inv.payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

            const expectedRemaining = Math.max(0, (totalValue - totalRefunds) - netPayments);

            // Re-determine status based on logic
            let expectedStatus = inv.status;
            if (expectedRemaining <= 0.01 && totalRefunds >= totalValue - 0.01) {
                expectedStatus = 'REFUNDED';
            } else if (totalRefunds > 0) {
                expectedStatus = 'PARTIALLY_REFUNDED';
            } else if (expectedRemaining <= 0.01 && netPayments >= totalValue - 0.01) {
                expectedStatus = 'PAID';
            } else if (netPayments > 0) {
                expectedStatus = 'PARTIALLY_PAID';
            } else if (inv.status === 'OVERDUE') {
                expectedStatus = 'OVERDUE';
            } else if (inv.status !== 'CANCELLED' && inv.status !== 'DRAFT') {
                expectedStatus = 'SENT';
            }

            const actualStatus = inv.tracker?.status;
            const actualRemaining = inv.tracker ? Number(inv.tracker.remainingAmount) : -1;

            if (Math.abs(actualRemaining - expectedRemaining) > 0.01 || actualStatus !== expectedStatus) {
                console.log(`Fixing Invoice #${inv.number}:`);
                console.log(`  Current: { status: ${actualStatus}, remaining: ${actualRemaining} }`);
                console.log(`  New:     { status: ${expectedStatus}, remaining: ${expectedRemaining} }`);

                if (inv.tracker) {
                    await prisma.invoicePaymentTracker.update({
                        where: { invoiceId: inv.id },
                        data: {
                            status: expectedStatus,
                            remainingAmount: expectedRemaining,
                            paidAmount: netPayments
                        }
                    });
                } else {
                    await prisma.invoicePaymentTracker.create({
                        data: {
                            invoiceId: inv.id,
                            status: expectedStatus,
                            paidAmount: netPayments,
                            remainingAmount: expectedRemaining
                        }
                    });
                }

                // Also sync invoice status if it differs
                if (inv.status !== expectedStatus && inv.status !== 'CANCELLED' && inv.status !== 'DRAFT') {
                    await prisma.invoice.update({
                        where: { id: inv.id },
                        data: { status: expectedStatus as any }
                    });
                }
                fixedCount++;
            }

            if (['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PARTIALLY_REFUNDED'].includes(expectedStatus)) {
                totalPending += expectedRemaining;
            }
        }

        console.log('--- Audit Complete ---');
        console.log(`Invoices fixed: ${fixedCount}`);
        console.log(`New Dashboard Pending Total: ${totalPending} MAD`);

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

auditAndFix();
