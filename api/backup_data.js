const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const models = ['user', 'client', 'invoice', 'quote', 'product', 'companySettings', 'creditNote', 'payment', 'invoiceItem', 'quoteItem', 'stockMovement', 'creditNoteItem'];
    const data = {};

    for (const model of models) {
        try {
            data[model] = await prisma[model].findMany();
            console.log(`Backed up ${model}: ${data[model].length} records`);
        } catch (e) {
            console.log(`Error backing up ${model}: ${e.message}`);
        }
    }

    fs.writeFileSync('db_backup.json', JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
        , 2));
    console.log('Backup saved to db_backup.json');
}

main().finally(() => prisma.$disconnect());