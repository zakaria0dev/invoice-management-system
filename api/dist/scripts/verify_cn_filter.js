"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function verifyFilter() {
    console.log('--- Verifying Credit Note Invoice Filter ---');
    // Find all invoices that are NOT PAID
    const notPaid = await prisma.invoice.findMany({
        where: { status: { not: 'PAID' } },
        select: { number: true, status: true }
    });
    console.log('Invoices that should be HIDDEN from Credit Note selection:');
    notPaid.forEach(inv => console.log(`- ${inv.number} (${inv.status})`));
    // Find all invoices that ARE PAID
    const paid = await prisma.invoice.findMany({
        where: { status: 'PAID' },
        select: { number: true, status: true }
    });
    console.log('Invoices that should be VISIBLE:');
    paid.forEach(inv => console.log(`- ${inv.number} (${inv.status})`));
    console.log('--- Logical Check Complete ---');
}
verifyFilter()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
