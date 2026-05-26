import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
    { name: 'Electronics', products: [
        { name: 'Wireless Mouse', description: 'Ergonomic wireless mouse with USB receiver', priceHT: 150, tva: 20, stock: 50, minStock: 10, unit: 'piece' },
        { name: 'Mechanical Keyboard', description: 'RGB mechanical keyboard with blue switches', priceHT: 450, tva: 20, stock: 30, minStock: 5, unit: 'piece' }
    ]},
    { name: 'Software', products: [
        { name: 'Antivirus License', description: '1-year subscription for antivirus software', priceHT: 300, tva: 20, stock: 100, minStock: 20, unit: 'license' },
        { name: 'Cloud Storage', description: '1TB cloud storage subscription (Monthly)', priceHT: 100, tva: 20, stock: 999, minStock: 0, unit: 'month' }
    ]},
    { name: 'Consulting', products: [
        { name: 'IT Audit', description: 'Comprehensive IT infrastructure audit', priceHT: 5000, tva: 20, stock: 999, minStock: 0, unit: 'service' },
        { name: 'Security Training', description: 'Cybersecurity training for employees', priceHT: 2500, tva: 20, stock: 999, minStock: 0, unit: 'session' }
    ]},
    { name: 'Furniture', products: [
        { name: 'Office Chair', description: 'Ergonomic office chair with lumbar support', priceHT: 1200, tva: 20, stock: 15, minStock: 3, unit: 'piece' },
        { name: 'Standing Desk', description: 'Adjustable height standing electric desk', priceHT: 3500, tva: 20, stock: 10, minStock: 2, unit: 'piece' }
    ]},
    { name: 'Office Supplies', products: [
        { name: 'A4 Paper Box', description: 'Box of 5 reams of white A4 paper', priceHT: 180, tva: 20, stock: 100, minStock: 20, unit: 'box' },
        { name: 'Whiteboard markers', description: 'Pack of 4 assorted whiteboard markers', priceHT: 40, tva: 20, stock: 80, minStock: 15, unit: 'pack' }
    ]}
];

async function main() {
    console.log('Seeding random products...');
    
    let totalAdded = 0;
    
    for (const categoryData of categories) {
        for (const productData of categoryData.products) {
            await prisma.product.create({
                data: {
                    ...productData,
                    category: categoryData.name
                }
            });
            totalAdded++;
            console.log(`Added ${productData.name} in category ${categoryData.name}`);
        }
    }
    
    console.log(`Successfully added ${totalAdded} products!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
