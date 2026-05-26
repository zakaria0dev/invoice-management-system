const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const quoteId = 10n;
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: { items: true },
        });

        if (!quote) {
            console.log(`Quote ${quoteId} not found`);
            return;
        }

        console.log(`Testing conversion for quote ${quote.id} (${quote.number})`);

        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    number: `VERIFY-FINAL-${quote.number}-${Date.now()}`,
                    clientId: quote.clientId,
                    total: quote.total,
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    status: 'DRAFT',
                    currency: quote.currency || 'MAD',
                    items: {
                        create: quote.items.map((item) => ({
                            description: item.description,
                            quantity: item.quantity,
                            price: item.price,
                            tax: item.tax,
                            productId: item.productId,
                        })),
                    },
                },
            });

            await tx.invoicePaymentTracker.create({
                data: {
                    invoiceId: newInvoice.id,
                    totalAmount: newInvoice.total,
                    paidAmount: 0,
                    remainingAmount: newInvoice.total,
                    status: 'DRAFT'
                }
            });

            return newInvoice;
        });

        console.log('SUCCESS: Generated Invoice ID', invoice.id.toString());
    } catch (e) {
        console.error('CONVERSION FAILED:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
