
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
