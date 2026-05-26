import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const invoice = await prisma.invoice.findFirst({
        include: { items: true },
        where: { isCancelled: false }
    });

    if (!invoice) {
        console.log("No valid invoice found to test.");
        return;
    }

    console.log("Current Invoice Status:", invoice.status, "isCancelled:", invoice.isCancelled, "InvoiceID:", invoice.id);

    if (invoice.items.length > 0) {
        const product = await prisma.product.findUnique({ where: { id: invoice.items[0].productId! } });
        console.log("Product Stock BEFORE cancel:", product?.stock);

        // Simulate what the controller does
        const invoiceData = { isCancelled: true };
        const currentInvoice = invoice;
        const id = invoice.id;

        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                ...invoiceData
            },
            include: { items: true }
        });

        const isNowCancelled = invoiceData.isCancelled === true;
        const wasCancelled = currentInvoice.isCancelled;

        if (isNowCancelled && !wasCancelled) {
            console.log("Should restore stock for", updated.items.length, "items");
            for (const item of updated.items) {
                if (item.productId) {
                    const prod = await prisma.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                    console.log("Product Stock AFTER incrementing:", prod.stock);

                    await prisma.stockMovement.create({
                        data: {
                            productId: item.productId,
                            quantity: item.quantity,
                            type: 'CANCEL',
                            note: `Restored from cancelled Invoice #${updated.number}`
                        }
                    });
                }
            }
        }
    } else {
        console.log("Invoice has no items.");
    }
}
run().catch(console.error).finally(() => prisma.$disconnect());
