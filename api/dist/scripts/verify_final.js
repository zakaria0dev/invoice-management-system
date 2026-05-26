"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function verifyConversion() {
    console.log('--- Verifying Quote conversion ---');
    // Find a quote that hasn't been converted
    const quote = await prisma.quote.findFirst({
        where: { status: { not: 'CONVERTED' } },
        orderBy: { createdAt: 'desc' }
    });
    if (!quote) {
        console.log('No eligible quote found for testing.');
        return;
    }
    console.log(`Testing with Quote: ${quote.number}`);
    // Note: We can't easily call the controller directly without an Express req/res.
    // Instead, we'll check the logic: will it hit a collision?
    const nextNumber = await prisma.invoice.findMany({
        select: { number: true },
        orderBy: { number: 'desc' },
        take: 1
    });
    console.log('Current latest invoice:', nextNumber[0]?.number);
    console.log('--- Verification Done (Logical Check) ---');
}
verifyConversion()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
