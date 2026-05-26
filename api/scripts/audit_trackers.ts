import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTrackers() {
    const trackers = await prisma.invoicePaymentTracker.findMany({
        where: {
            status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PARTIALLY_REFUNDED'] }
        },
        include: {
            invoice: {
                include: {
                    payments: true,
                    refunds: true
                }
            }
        }
    });

    console.log('--- Pending Trackers Audit ---');
    let totalComputed = 0;
    for (const tracker of trackers) {
        const inv = tracker.invoice;
        const total = Number(inv.total);
        const returns = inv.refunds.reduce((s, r) => s + Number(r.amount), 0);
        const payments = inv.payments.reduce((s, p) => s + Number(p.amount), 0);

        const expectedRemaining = Math.max(0, (total - returns) - payments);
        const actualRemaining = Number(tracker.remainingAmount);

        totalComputed += actualRemaining;

        if (Math.abs(expectedRemaining - actualRemaining) > 0.01) {
            console.log(`Mismatch on Invoice #${inv.number}:`);
            console.log(`  Tracker Status: ${tracker.status}`);
            console.log(`  Tracker Remaining: ${actualRemaining}`);
            console.log(`  Computed Remaining: ${expectedRemaining}`);
            console.log(`  (Total: ${total}, Returns: ${returns}, Payments: ${payments})`);
        }
    }
    console.log(`Total Pending (Tracker): ${totalComputed}`);
    await prisma.$disconnect();
}

checkTrackers();
