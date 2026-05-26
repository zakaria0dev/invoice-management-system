
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoices = await prisma.invoice.findMany({
        select: { number: true },
        orderBy: { number: 'desc' }
    });

    console.log('Existing Invoice Numbers:', invoices.map(i => i.number));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
