"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testUpdate() {
    try {
        // 1. Get an existing product
        const product = await prisma.product.findFirst();
        if (!product) {
            console.log('No products found to test with.');
            return;
        }
        console.log(`Testing with product: ${product.name} (ID: ${product.id}, Price: ${product.priceHT})`);
        // 2. Perform an update (simulating what the controller does)
        const newPrice = Number(product.priceHT) + 10;
        const oldPrice = Number(product.priceHT);
        const updated = await prisma.product.update({
            where: { id: product.id },
            data: { priceHT: newPrice }
        });
        console.log(`Updated price to: ${updated.priceHT}`);
        // 3. Manually log history (simulating the controller logic)
        const changes = {
            priceHT: {
                from: oldPrice,
                to: newPrice
            }
        };
        await prisma.productHistory.create({
            data: {
                productId: product.id,
                productName: product.name,
                action: 'UPDATE',
                changes,
            }
        });
        console.log('History entry created.');
        // 4. Verify
        const history = await prisma.productHistory.findMany({
            where: { productId: product.id },
            orderBy: { createdAt: 'desc' }
        });
        console.log(`Current history count for this product: ${history.length}`);
        console.log('Latest history entry:', JSON.stringify(history[0], (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
    }
    catch (e) {
        console.error('Test failed:', e);
    }
    finally {
        await prisma.$disconnect();
    }
}
testUpdate();
