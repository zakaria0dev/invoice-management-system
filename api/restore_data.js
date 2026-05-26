const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function restore() {
    const data = JSON.parse(fs.readFileSync('db_backup.json', 'utf8'));

    // Mapping of old UUID to new BigInt ID
    const idMaps = {
        user: {},
        client: {},
        invoice: {},
        quote: {},
        product: {},
        companySettings: {},
        creditNote: {},
        payment: {},
        invoiceItem: {},
        quoteItem: {},
        stockMovement: {},
        creditNoteItem: {}
    };

    console.log('Restoring Users...');
    for (const item of data.user) {
        const { id, ...rest } = item;
        const created = await prisma.user.create({ data: rest });
        idMaps.user[id] = created.id;
    }

    console.log('Restoring Clients...');
    for (const item of data.client) {
        const { id, ...rest } = item;
        const created = await prisma.client.create({ data: rest });
        idMaps.client[id] = created.id;
    }

    console.log('Restoring Products...');
    for (const item of data.product) {
        const { id, ...rest } = item;
        const created = await prisma.product.create({ data: rest });
        idMaps.product[id] = created.id;
    }

    console.log('Restoring Invoices...');
    for (const item of data.invoice) {
        const { id, clientId, ...rest } = item;
        const created = await prisma.invoice.create({
            data: {
                ...rest,
                clientId: idMaps.client[clientId]
            }
        });
        idMaps.invoice[id] = created.id;
    }

    console.log('Restoring Quotes...');
    for (const item of data.quote) {
        const { id, clientId, ...rest } = item;
        const created = await prisma.quote.create({
            data: {
                ...rest,
                clientId: idMaps.client[clientId]
            }
        });
        idMaps.quote[id] = created.id;
    }

    console.log('Restoring InvoiceItems...');
    for (const item of data.invoiceItem) {
        const { id, invoiceId, productId, ...rest } = item;
        const created = await prisma.invoiceItem.create({
            data: {
                ...rest,
                invoiceId: idMaps.invoice[invoiceId],
                productId: productId ? idMaps.product[productId] : null
            }
        });
        idMaps.invoiceItem[id] = created.id;
    }

    console.log('Restoring QuoteItems...');
    for (const item of data.quoteItem) {
        const { id, quoteId, ...rest } = item;
        const created = await prisma.quoteItem.create({
            data: {
                ...rest,
                quoteId: idMaps.quote[quoteId]
            }
        });
        idMaps.quoteItem[id] = created.id;
    }

    console.log('Restoring Payments...');
    for (const item of data.payment) {
        const { id, invoiceId, ...rest } = item;
        const created = await prisma.payment.create({
            data: {
                ...rest,
                invoiceId: idMaps.invoice[invoiceId]
            }
        });
        idMaps.payment[id] = created.id;
    }

    console.log('Restoring CreditNotes...');
    for (const item of data.creditNote) {
        const { id, clientId, invoiceId, ...rest } = item;
        const created = await prisma.creditNote.create({
            data: {
                ...rest,
                clientId: idMaps.client[clientId],
                invoiceId: idMaps.invoice[invoiceId]
            }
        });
        idMaps.creditNote[id] = created.id;
    }

    console.log('Restoring CreditNoteItems...');
    for (const item of data.creditNoteItem) {
        const { id, creditNoteId, productId, ...rest } = item;
        const created = await prisma.creditNoteItem.create({
            data: {
                ...rest,
                creditNoteId: idMaps.creditNote[creditNoteId],
                productId: productId ? idMaps.product[productId] : null
            }
        });
        idMaps.creditNoteItem[id] = created.id;
    }

    console.log('Restoring StockMovements...');
    for (const item of data.stockMovement) {
        const { id, productId, ...rest } = item;
        const created = await prisma.stockMovement.create({
            data: {
                ...rest,
                productId: idMaps.product[productId]
            }
        });
        idMaps.stockMovement[id] = created.id;
    }

    console.log('Restoring CompanySettings...');
    for (const item of data.companySettings) {
        const { id, ...rest } = item;
        const created = await prisma.companySettings.create({ data: rest });
        idMaps.companySettings[id] = created.id;
    }

    console.log('Data restoration complete!');
}

restore().catch(console.error).finally(() => prisma.$disconnect());
