"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const invoiceUtils_1 = require("../utils/invoiceUtils");
const prisma = new client_1.PrismaClient();
async function runAudit() {
    console.log('--- STARTING REFUND LOGIC AUDIT ---');
    const scenarios = [
        {
            name: 'Case 1 (Paid)',
            total: 1000,
            payments: [{ amount: 1000, isRefund: false }],
            refunds: [],
            expectedStatus: 'PAID'
        },
        {
            name: 'Case 2 (Settled w/ Returns)',
            total: 1000,
            payments: [{ amount: 400, isRefund: false }],
            refunds: [{ amount: 0, returnedItemsValue: 600 }],
            expectedStatus: 'SETTLED_WITH_RETURNS'
        },
        {
            name: 'Case 3 (Partially Paid)',
            total: 1000,
            payments: [{ amount: 400, isRefund: false }],
            refunds: [{ amount: 0, returnedItemsValue: 200 }],
            expectedStatus: 'PARTIALLY_PAID'
        },
        {
            name: 'Case 4 (Refunded - Full)',
            total: 1000,
            payments: [{ amount: 1000, isRefund: false }],
            refunds: [{ amount: 1000, returnedItemsValue: 1000 }],
            expectedStatus: 'REFUNDED'
        },
        {
            name: 'Case 5 (Overdue)',
            total: 1000,
            payments: [],
            refunds: [],
            dueDate: new Date(Date.now() - 86400000), // Yesterday
            expectedStatus: 'OVERDUE'
        }
    ];
    for (const s of scenarios) {
        const invoice = {
            total: s.total,
            dueDate: s.dueDate || new Date(Date.now() + 86400000),
            isCancelled: false,
            payments: s.payments,
            refunds: s.refunds,
            creditApplications: []
        };
        const metrics = (0, invoiceUtils_1.calculateInvoiceMetrics)(invoice);
        const status = (0, invoiceUtils_1.calculateInvoiceStatus)({ ...invoice, ...metrics });
        console.log(`\nScenario: ${s.name}`);
        console.log(`  Effective Total: ${metrics.effectiveTotal}`);
        console.log(`  Net Paid: ${metrics.netPaid}`);
        console.log(`  Remaining: ${metrics.remainingBalance}`);
        console.log(`  Status: ${status} (Expected: ${s.expectedStatus})`);
        if (status !== s.expectedStatus) {
            console.error(`  ❌ MATCH FAILURE`);
        }
        else {
            console.log(`  ✅ MATCH SUCCESS`);
        }
    }
    console.log('\n--- AUDIT COMPLETE ---');
}
runAudit()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
