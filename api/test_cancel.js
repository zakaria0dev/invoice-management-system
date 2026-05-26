const { updateInvoice } = require('./dist/controllers/invoice');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    const inv = await prisma.invoice.findFirst({ where: { isCancelled: false } });
    if (!inv) return console.log("No uncancelled invoice");

    console.log("Canceling invoice:", inv.id);
    const req = {
        params: { id: inv.id.toString() },
        body: { isCancelled: true }
    };

    let result = null;
    const res = {
        status: (code) => ({
            json: (data) => { result = data; }
        })
    };
    const next = (err) => { console.error("Error in controller:", err); };

    await updateInvoice(req, res, next);
    console.log("Result:", result);

    const movements = await prisma.stockMovement.findMany({ where: { type: 'CANCEL' } });
    console.log("Movements:", movements);
}
test().finally(() => prisma.$disconnect());
