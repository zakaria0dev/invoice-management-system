"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const invoice = await prisma.invoice.findUnique({
        where: { number: 'INV-0001' },
        include: {
            items: true,
            payments: true,
            refunds: {
                include: { items: true }
            },
            creditNotes: {
                include: { items: true }
            },
            stockMovements: true,
            creditApplications: true,
            paymentTracker: true,
        }
    });
    if (!invoice) {
        console.log('Invoice INV-0001 not found.');
        return;
    }
    console.log('Invoice found:', JSON.stringify(invoice, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
