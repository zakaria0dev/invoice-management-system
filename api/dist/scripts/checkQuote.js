"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
