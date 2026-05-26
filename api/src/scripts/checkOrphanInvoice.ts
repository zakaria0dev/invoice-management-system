
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoice = await prisma.invoice.findUnique({
        where: { number: 'INV - FROM - Q - QT-0001 ' }, // Note the trailing space
        include: {
            client: true,
            items: true
        }
    });

    if (!invoice) {
        console.log('Invoice not found.');
        return;
    }

    // Check if any quote is linked to this invoice
    const linkedQuote = await prisma.quote.findFirst({
        where: { linkedInvoiceId: invoice.id }
    });

    console.log('Invoice details:', JSON.stringify(invoice, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2));
    console.log('Linked Quote:', linkedQuote ? linkedQuote.number : 'None');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
