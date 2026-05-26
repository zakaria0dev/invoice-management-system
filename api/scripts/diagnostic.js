const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();

async function diagnose() {
    console.log('--- STARTING SYSTEM DIAGNOSTIC ---');

    console.log('\n[1/4] Checking Environment Variables...');
    const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
    requiredEnv.forEach(key => {
        if (!process.env[key]) {
            console.error('❌ MISSING: ' + key);
        } else {
            console.log('✅ FOUND: ' + key);
        }
    });

    console.log('\n[2/4] Testing Database Connection...');
    try {
        await prisma.$connect();
        const userCount = await prisma.user.count();
        console.log('✅ Database Connected! Total users: ' + userCount);
        
        const admin = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
        if (admin) {
            console.log('✅ Admin user found in database.');
        } else {
            console.error('❌ Admin user NOT found.');
        }
    } catch (err) {
        console.error('❌ Database connection FAILED: ' + err.message);
    }

    console.log('\n[3/4] Testing BcryptJS...');
    try {
        const pass = 'password1234';
        const hash = await bcrypt.hash(pass, 12);
        const match = await bcrypt.compare(pass, hash);
        if (match) {
            console.log('✅ Bcrypt comparison working perfectly.');
        } else {
            console.error('❌ Bcrypt comparison mismatch.');
        }
    } catch (err) {
        console.error('❌ Bcrypt system FAILED: ' + err.message);
    }

    console.log('\n[4/4] Testing JWT Signing...');
    try {
        if (!process.env.JWT_SECRET) throw new Error('No secret provided');
        const token = jwt.sign({ id: 1, test: true }, process.env.JWT_SECRET, { expiresIn: '1h' });
        if (token) {
            console.log('✅ JWT Signing successful.');
        }
    } catch (err) {
        console.error('❌ JWT Signing FAILED: ' + err.message);
    }

    console.log('\n--- DIAGNOSTIC COMPLETE ---');
    await prisma.$disconnect();
}

diagnose();
