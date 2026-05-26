"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const invoiceNumber = 'INV-0001';
    const invoice = await prisma.invoice.findUnique({
        where: { number: invoiceNumber },
        select: { id: true }
    });
    if (!invoice) {
        console.log(`Invoice ${invoiceNumber} not found.`);
        return;
    }
    const invoiceId = invoice.id;
    console.log(`Starting deletion for Invoice ${invoiceNumber} (ID: ${invoiceId})...`);
    // 1. Delete StockMovements
    const smResult = await prisma.stockMovement.deleteMany({
        where: { invoiceId }
    });
    console.log(`Deleted ${smResult.count} StockMovements.`);
    // 2. Delete Refunds (Cascades to RefundItems)
    const refundResult = await prisma.refund.deleteMany({
        where: { invoiceId }
    });
    console.log(`Deleted ${refundResult.count} Refunds.`);
    // 3. Delete CreditApplications
    const caResult = await prisma.creditApplication.deleteMany({
        where: { invoiceId }
    });
    console.log(`Deleted ${caResult.count} CreditApplications.`);
    // 4. Delete Payments
    const paymentResult = await prisma.payment.deleteMany({
        where: { invoiceId }
    });
    console.log(`Deleted ${paymentResult.count} Payments.`);
    // 5. Delete InvoicePaymentTracker
    const trackerResult = await prisma.invoicePaymentTracker.deleteMany({
        where: { invoiceId }
    });
    console.log(`Deleted ${trackerResult.count} InvoicePaymentTrackers.`);
    // 6. Delete CreditNotes (if any linked to this invoice)
    const cnResult = await prisma.creditNote.deleteMany({
        where: { invoiceId }
    });
    console.log(`Deleted ${cnResult.count} CreditNotes.`);
    // 7. Finally, delete the Invoice (Cascades to InvoiceItems)
    await prisma.invoice.delete({
        where: { id: invoiceId }
    });
    console.log(`Invoice ${invoiceNumber} deleted successfully.`);
}
main()
    .catch(e => {
    console.error('Deletion failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
