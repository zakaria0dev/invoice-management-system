
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCN() {
    const cns = await prisma.creditNote.findMany({
        include: { client: true, items: true }
    });

    console.log('--- Credit Note Summary ---');
    cns.forEach(cn => {
        console.log(`${cn.number} - Client: ${cn.client.name} - Total: ${cn.total.toString()} - Status: ${cn.status}`);
    });
}

checkCN()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
