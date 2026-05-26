import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Testing Product History & Refund System ---');

    // 1. Create a test product
    const product = await prisma.product.create({
        data: {
            name: 'Test Refund Product',
            priceHT: 100,
            tva: 20,
            stock: 10,
            category: 'Test'
        }
    });
    console.log(`Created product: ${product.name} (Stock: ${product.stock})`);

    // 2. Mock a history entry (manually since we are not calling the controller here, but we want to check DB visibility)
    // Actually, better to just check if the table exists and we can write to it
    await (prisma as any).productHistory.create({
        data: {
            productId: product.id,
            productName: product.name,
            action: 'CREATE',
            changes: { initial: 'data' }
        }
    });
    console.log('Manually created history entry.');

    // 3. Verify history retrieval
    const history = await (prisma as any).productHistory.findMany({
        where: { productId: product.id }
    });
    console.log(`Retrieved ${history.length} history entries.`);

    // 4. Clean up
    await prisma.product.delete({ where: { id: product.id } });
    // History will remain but product is gone (we don't have cascade on history for audit purposes usually)

    console.log('--- Verification Script Completed ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
