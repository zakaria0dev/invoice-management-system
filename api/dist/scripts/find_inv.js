"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const invoiceUtils_1 = require("../utils/invoiceUtils");
const prisma = new client_1.PrismaClient();
async function findInvoice() {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { number: 'INV-0001' },
            include: {
                payments: true,
                refunds: true,
                creditNotes: true,
                paymentTracker: true,
            }
        });
        if (!invoice) {
            console.log("Invoice INV-0001 not found.");
            return;
        }
        console.log("--- INVOICE INV-0001 ---");
        console.log("ID:", invoice.id.toString());
        console.log("TOTAL:", invoice.total.toString());
        console.log("STATUS (Current):", invoice.status);
        console.log("PAYMENTS:", invoice.payments.length);
        invoice.payments.forEach(p => console.log(`  - Amount: ${p.amount}, isRefund: ${p.isRefund}`));
        console.log("REFUNDS:", invoice.refunds.length);
        invoice.refunds.forEach(r => console.log(`  - Amount: ${r.amount}, Metadata: ${JSON.stringify(r.metadata)}`));
        console.log("CREDIT NOTES:", invoice.creditNotes.length);
        invoice.creditNotes.forEach(cn => console.log(`  - Total: ${cn.total}, Status: ${cn.status}`));
        console.log("--- TRACKER ---");
        if (invoice.paymentTracker) {
            console.log("Tracker Status:", invoice.paymentTracker.status);
            console.log("Tracker Paid:", invoice.paymentTracker.paidAmount.toString());
            console.log("Tracker Remaining:", invoice.paymentTracker.remainingAmount.toString());
        }
        else {
            console.log("No payment tracker found.");
        }
        const calculated = (0, invoiceUtils_1.calculateInvoiceStatus)(invoice);
        console.log("NEW CALCULATED STATUS:", calculated);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        await prisma.$disconnect();
    }
}
findInvoice();
