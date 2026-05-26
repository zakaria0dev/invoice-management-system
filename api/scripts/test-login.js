const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
    const email = 'admin@example.com';
    const password = 'password1234';
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { console.log('User not found'); return; }
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('--- LOGIN TEST ---');
    console.log('Testing Email:', email);
    console.log('Testing Password:', password);
    console.log('Result: ', isMatch ? '✅ MATCH!' : '❌ NO MATCH');
}
main().finally(() => prisma.$disconnect());
