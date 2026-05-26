"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Helper to get a random date between two dates
function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
// Helper to format invoice/quote numbers
function generateNumber(prefix, index) {
    return `${prefix}-${String(index).padStart(4, '0')}`;
}
async function main() {
    console.log('Starting realistic data generation...');
    const clients = await prisma.client.findMany();
    const products = await prisma.product.findMany();
    if (clients.length === 0 || products.length === 0) {
        console.error('Need at least 1 client and 1 product in the database.');
        return;
    }
    console.log(`Found ${clients.length} clients and ${products.length} products.`);
    // Get current max invoice and quote numbers to avoid conflicts
    const lastInvoice = await prisma.invoice.findFirst({ orderBy: { createdAt: 'desc' } });
    const lastQuote = await prisma.quote.findFirst({ orderBy: { createdAt: 'desc' } });
    let invoiceCounter = lastInvoice ? parseInt(lastInvoice.number.split('-')[1]) + 1 : 1;
    let quoteCounter = lastQuote ? parseInt(lastQuote.number.split('-')[1]) + 1 : 1;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    console.log('Generating 15 Quotes...');
    for (let i = 0; i < 15; i++) {
        const client = clients[Math.floor(Math.random() * clients.length)];
        const date = getRandomDate(sixMonthsAgo, today);
        const validUntil = new Date(date);
        validUntil.setDate(validUntil.getDate() + 30);
        const statuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        // Generate 1-4 random items
        const itemCount = Math.floor(Math.random() * 4) + 1;
        const items = [];
        let subtotal = 0;
        let totalTax = 0;
        for (let j = 0; j < itemCount; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 5) + 1;
            const price = Number(product.priceHT);
            const taxRate = Number(product.tva);
            subtotal += price * quantity;
            totalTax += (price * quantity * taxRate) / 100;
            items.push({
                description: product.name,
                quantity,
                price,
                tax: taxRate,
                productId: product.id,
            });
        }
        const total = subtotal + totalTax;
        await prisma.quote.create({
            data: {
                number: generateNumber('QT', quoteCounter++),
                clientId: client.id,
                date,
                validUntil,
                status,
                total,
                currency: 'MAD',
                notes: status === 'REJECTED' ? 'Client found a cheaper alternative.' : 'Thank you for your business.',
                items: {
                    create: items,
                },
            },
        });
    }
    console.log('Generating 45 Invoices...');
    for (let i = 0; i < 45; i++) {
        const client = clients[Math.floor(Math.random() * clients.length)];
        const date = getRandomDate(sixMonthsAgo, today);
        // Determine status and set due date accordingly
        const r = Math.random();
        let status = client_1.InvoiceStatus.PAID;
        let dueDate = new Date(date);
        dueDate.setDate(dueDate.getDate() + 30); // Net 30 default
        if (r < 0.1) {
            status = client_1.InvoiceStatus.DRAFT;
            dueDate = getRandomDate(today, nextMonth);
        }
        else if (r < 0.2) {
            status = client_1.InvoiceStatus.SENT;
            dueDate = getRandomDate(today, nextMonth);
        }
        else if (r < 0.4) {
            status = client_1.InvoiceStatus.OVERDUE;
            dueDate = getRandomDate(sixMonthsAgo, new Date(today.getTime() - 86400000)); // Due in the past
        }
        else if (r < 0.6) {
            status = client_1.InvoiceStatus.PARTIALLY_PAID;
            dueDate = Math.random() > 0.5 ? getRandomDate(today, nextMonth) : getRandomDate(sixMonthsAgo, today);
        }
        else {
            status = client_1.InvoiceStatus.PAID; // 40% are paid
        }
        // Generate 1-5 random items
        const itemCount = Math.floor(Math.random() * 5) + 1;
        const items = [];
        let subtotal = 0;
        let totalTax = 0;
        for (let j = 0; j < itemCount; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 10) + 1;
            const price = Number(product.priceHT);
            const taxRate = Number(product.tva);
            subtotal += price * quantity;
            totalTax += (price * quantity * taxRate) / 100;
            items.push({
                description: product.name,
                quantity,
                price,
                tax: taxRate,
                productId: product.id,
            });
        }
        const total = subtotal + totalTax;
        const invoice = await prisma.invoice.create({
            data: {
                number: generateNumber('INV', invoiceCounter++),
                clientId: client.id,
                date,
                dueDate,
                status,
                total,
                currency: 'MAD',
                notes: status === client_1.InvoiceStatus.OVERDUE ? 'Second reminder sent.' : 'Standard service delivery.',
                items: {
                    create: items,
                },
            },
        });
        // Generate Payments for PAID and PARTIALLY_PAID invoices
        if (status === client_1.InvoiceStatus.PAID) {
            const paymentDate = getRandomDate(date, today);
            await prisma.payment.create({
                data: {
                    invoiceId: invoice.id,
                    amount: total,
                    method: 'BANK_TRANSFER',
                    date: paymentDate,
                }
            });
        }
        else if (status === client_1.InvoiceStatus.PARTIALLY_PAID) {
            const percentage = (Math.floor(Math.random() * 40) + 30) / 100;
            const paymentDate = getRandomDate(date, today);
            await prisma.payment.create({
                data: {
                    invoiceId: invoice.id,
                    amount: total * percentage,
                    method: 'CREDIT_CARD',
                    date: paymentDate,
                }
            });
        }
    }
    console.log('Successfully generated 15 quotes and 45 invoices with payments!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
