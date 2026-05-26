import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.userRole.findMany({
        include: {
            permissions: {
                include: {
                    permission: true
                }
            }
        }
    });

    for (const role of roles) {
        console.log(`Role: ${role.name} (ID: ${role.id})`);
        console.log('Permissions:', role.permissions.map(rp => rp.permission.name).join(', '));
        console.log('---');
    }

    const users = await prisma.user.findMany({
        include: { role: true }
    });

    for (const user of users) {
        console.log(`User: ${user.email} (Role: ${user.role?.name}, RoleID: ${user.roleId})`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
