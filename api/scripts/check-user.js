const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findUnique({ 
        where: { email: 'admin@example.com' },
        include: { role: true }
    });
    if (!user) {
        console.log('USER NOT FOUND: admin@example.com');
    } else {
        console.log('USER FOUND:');
        console.log(' - Email:', user.email);
        console.log(' - Role:', user.role ? user.role.name : 'NO ROLE');
        console.log(' - RoleID:', user.roleId);
    }
}
main().finally(() => prisma.$disconnect());
