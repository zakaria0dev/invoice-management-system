import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const roles = await prisma.userRole.findMany({
            include: { permissions: { include: { permission: true } } }
        });
        console.log('Roles found:', roles.map(r => r.name));
        roles.forEach(r => {
            console.log(`Role: ${r.name}, Permissions: ${r.permissions.map(p => p.permission.name).join(', ')}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
