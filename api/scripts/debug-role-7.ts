import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const roleId = 7n; // Role 'test'
    const role = await prisma.userRole.findUnique({
        where: { id: roleId },
        include: {
            permissions: {
                include: {
                    permission: true
                }
            }
        }
    });

    if (!role) {
        console.log('Role with ID 7 not found');
        return;
    }

    console.log(`Role: ${role.name} (ID: ${role.id})`);
    console.log(`Raw Permissions Count: ${role.permissions.length}`);
    role.permissions.forEach((rp, i) => {
        console.log(`  [${i}] RoleID: ${rp.roleId}, PermID: ${rp.permissionId}, Name: "${rp.permission.name}"`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
