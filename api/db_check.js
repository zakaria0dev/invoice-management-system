const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const items = await prisma.invoiceItem.findMany({
        select: { id: true, invoiceId: true, productId: true, description: true }
    });
    console.log("Invoice Items count:", items.length);
    console.log("Items with null productId:", items.filter(i => i.productId === null).length);

    // Also log all items with their product IDs
    items.slice(0, 5).forEach(i => console.log(`Item ${i.id}: ProductId ${i.productId}`));

    const products = await prisma.product.findMany({ select: { id: true, name: true, stock: true } });
    console.log("\nProducts:");
    products.forEach(p => console.log(`[${p.id}] ${p.name} - stock: ${p.stock}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
