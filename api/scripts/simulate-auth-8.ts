import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userId = 8n; // test@gmail.com
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    permissions: {
                        include: {
                            permission: true
                        }
                    }
                }
            }
        },
    });

    if (!user) {
        console.log('User 8 not found');
        return;
    }

    const requiredPermission = 'invoices.send';
    const userRoleName = user.role?.name?.toUpperCase();

    // Simulate restrictToPermission logic
    const userPermissions = (user.role?.permissions || []).map((rp: any) =>
        (rp.permission?.name || rp.name || '').trim().toLowerCase()
    ).filter(Boolean);

    const normalizedRequired = requiredPermission.trim().toLowerCase();
    const hasPermission = userPermissions.includes(normalizedRequired);

    console.log(`Checking User: ${user.email}`);
    console.log(`Role: ${userRoleName} (ID: ${user.roleId})`);
    console.log(`User has ${userPermissions.length} permissions.`);
    console.log(`Raw permissions: ${JSON.stringify(userPermissions)}`);
    console.log(`Normalized Required: "${normalizedRequired}"`);
    console.log(`Final Result: ${hasPermission}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
