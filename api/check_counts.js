const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const models = ['user', 'client', 'invoice', 'quote', 'product', 'companySettings', 'creditNote', 'payment'];
    for (const model of models) {
        try {
            const count = await prisma[model].count();
            console.log(`${model}: ${count}`);
        } catch (e) {
            console.log(`${model}: Error ${e.message}`);
        }
    }
}

main().finally(() => prisma.$disconnect());
