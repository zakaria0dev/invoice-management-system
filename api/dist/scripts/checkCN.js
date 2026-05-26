"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
