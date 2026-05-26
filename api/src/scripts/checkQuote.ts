
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkQuote() {
    const quotes = await prisma.quote.findMany({
        take: 10,
        include: { client: true, items: true }
    });

    console.log('--- Recent Quotes ---');
    quotes.forEach(q => {
        console.log(`${q.number} - Client: ${q.client.name} - Total: ${q.total.toString()} - Status: ${q.status}`);
    });
}

checkQuote()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
