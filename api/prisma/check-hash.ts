import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'demo@invoicepro.com' },
    });

    if (user) {
        console.log('User found:', user.email);
        console.log('Stored Hash:', user.password);
        const isMatch = await bcrypt.compare('demo123', user.password);
        console.log('Manual comparison with "demo123":', isMatch);
    } else {
        console.log('User NOT found');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
