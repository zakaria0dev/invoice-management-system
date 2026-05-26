const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const invoices = await prisma.invoice.findMany({
        orderBy: { id: 'desc' },
        select: { id: true, number: true },
        take: 10
    });
    console.log('Last 10 invoices:');
    invoices.forEach(inv => console.log(`ID: ${inv.id}, Number: ${inv.number}`));

    const maxInvoice = await prisma.invoice.findFirst({
        orderBy: { number: 'desc' }
    });
    console.log('Max Number Invoice:', maxInvoice?.number);
}

main().catch(console.error).finally(() => prisma.$disconnect());
