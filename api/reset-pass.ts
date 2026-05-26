import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const user = await prisma.user.update({
            where: { email: 'admin@example.com' },
            data: { password: hashedPassword }
        });
        console.log('PASSWORD_RESET_SUCCESS', user.email);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
