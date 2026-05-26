"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function check() {
    try {
        const tableInfo = await prisma.$queryRaw `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'`;
        console.log('Tables:', tableInfo);
        // Try a simple select
        const count = await prisma.productHistory.count();
        console.log('ProductHistory count:', count);
    }
    catch (e) {
        console.error('Check failed:', e);
    }
    finally {
        await prisma.$disconnect();
    }
}
check();
