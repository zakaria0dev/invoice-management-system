"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function wipeData() {
    console.warn('⚠️ DANGER: wipeData.ts is a destructive script.');
    console.log('Use with extreme caution.');
    if (process.env.CONFIRM_WIPE !== 'true') {
        console.log('Set CONFIRM_WIPE=true to execute.');
        return;
    }
    // Example: await prisma.invoice.deleteMany({});
    console.log('Wipe operation skipped - Placeholder execution.');
}
wipeData()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
