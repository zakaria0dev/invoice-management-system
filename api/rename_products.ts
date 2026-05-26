import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Renaming dummy products...');

    await prisma.product.updateMany({
        where: { name: 'Produit 1' },
        data: { name: 'USB Flash Drive 64GB' }
    });

    await prisma.product.updateMany({
        where: { name: 'Produit 2' },
        data: { name: 'Software Development Day Rate' }
    });

    await prisma.product.updateMany({
        where: { name: 'Produit 3' },
        data: { name: 'Premium Cloud Support (Day)' }
    });

    await prisma.product.updateMany({
        where: { name: 'Produit 4' },
        data: { name: 'External SSD 1TB' }
    });

    console.log('Successfully renamed products!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
