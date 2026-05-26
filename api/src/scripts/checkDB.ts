
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDB() {
    try {
        await prisma.$connect();
        console.log('✅ Database connection successful');

        const userCount = await prisma.user.count();
        console.log(`Users in database: ${userCount}`);
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDB();
