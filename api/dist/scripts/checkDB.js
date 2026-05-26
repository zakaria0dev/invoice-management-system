"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkDB() {
    try {
        await prisma.$connect();
        console.log('✅ Database connection successful');
        const userCount = await prisma.user.count();
        console.log(`Users in database: ${userCount}`);
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkDB();
