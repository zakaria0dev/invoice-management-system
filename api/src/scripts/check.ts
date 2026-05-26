import prisma from '../config/prisma';

async function checkRoles() {
    const roles = await prisma.userRole.findMany({
        include: { _count: { select: { users: true } } },
    });
    
    console.log('Current roles:');
    roles.forEach(role => {
        console.log(`  ID: ${role.id}, Name: "${role.name}", isSystem: ${role.isSystem}, Users: ${role._count.users}`);
    });
    
    await prisma.$disconnect();
}

checkRoles();