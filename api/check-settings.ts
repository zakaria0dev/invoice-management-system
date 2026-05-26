import prisma from './src/config/prisma';

async function checkSettings() {
    const settings = await prisma.companySettings.findFirst();
    console.log('Company Settings:', JSON.stringify(settings, null, 2));
}

checkSettings()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
