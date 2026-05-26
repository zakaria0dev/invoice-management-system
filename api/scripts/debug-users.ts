import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { role: true }
    });
    for (const user of users) {
        console.log(`User ID: ${user.id}, Email: ${user.email}, Role: ${user.role?.name}, RoleID: ${user.roleId}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
