import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Check if we can find InvoiceStatus enum values
        // Prisma doesn't expose enum values directly in a query easily without raw SQL
        const result = await (prisma as any).$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE typname = 'InvoiceStatus';
    `;
        console.log('InvoiceStatus enum values:', result);
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
