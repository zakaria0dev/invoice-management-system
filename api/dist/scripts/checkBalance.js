"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkBalance() {
    const clients = await prisma.client.findMany({
        select: {
            id: true,
            name: true,
            creditBalance: true
        }
    });
    console.log('--- Client Balances ---');
    clients.forEach(c => {
        console.log(`${c.name} (ID: ${c.id.toString()}): ${c.creditBalance.toString()} MAD`);
    });
}
checkBalance()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
