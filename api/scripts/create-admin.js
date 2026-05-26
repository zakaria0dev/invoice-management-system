const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const PERMISSIONS = [
    // Invoices
    { name: 'invoices.view', description: 'View invoices', category: 'Invoices' },
    { name: 'invoices.create', description: 'Create invoices', category: 'Invoices' },
    { name: 'invoices.edit', description: 'Edit invoices', category: 'Invoices' },
    { name: 'invoices.delete', description: 'Delete invoices', category: 'Invoices' },
    { name: 'invoices.send', description: 'Send invoices', category: 'Invoices' },
    { name: 'invoices.cancel', description: 'Cancel invoices', category: 'Invoices' },
    { name: 'invoices.void', description: 'Cancel invoices', category: 'Invoices' },
    { name: 'invoices.refund', description: 'Refund invoices', category: 'Invoices' },
    // Quotes
    { name: 'quotes.view', description: 'View quotes', category: 'Quotes' },
    { name: 'quotes.create', description: 'Create quotes', category: 'Quotes' },
    { name: 'quotes.edit', description: 'Edit quotes', category: 'Quotes' },
    { name: 'quotes.delete', description: 'Delete quotes', category: 'Quotes' },
    { name: 'quotes.convert', description: 'Convert quotes to invoices', category: 'Quotes' },
    { name: 'quotes.send', description: 'Send quotes', category: 'Quotes' },
    // Clients
    { name: 'clients.view', description: 'View clients', category: 'Clients' },
    { name: 'clients.create', description: 'Create clients', category: 'Clients' },
    { name: 'clients.edit', description: 'Edit clients', category: 'Clients' },
    { name: 'clients.delete', description: 'Delete clients', category: 'Clients' },
    // Products
    { name: 'products.view', description: 'View products', category: 'Products' },
    { name: 'products.create', description: 'Create products', category: 'Products' },
    { name: 'products.edit', description: 'Edit products', category: 'Products' },
    { name: 'products.delete', description: 'Delete products', category: 'Products' },
    // Payments
    { name: 'payments.view', description: 'View payments', category: 'Payments' },
    { name: 'payments.create', description: 'Record payments', category: 'Payments' },
    { name: 'payments.refund', description: 'Process refunds', category: 'Payments' },
    // Credit Notes
    { name: 'creditnotes.view', description: 'View credit notes', category: 'Credit Notes' },
    { name: 'creditnotes.create', description: 'Create credit notes', category: 'Credit Notes' },
    { name: 'creditnotes.edit', description: 'Edit credit notes', category: 'Credit Notes' },
    { name: 'creditnotes.send', description: 'Send credit notes', category: 'Credit Notes' },
    // Reports
    { name: 'reports.view', description: 'View reports', category: 'Reports' },
    { name: 'reports.export', description: 'Export reports', category: 'Reports' },
    // Users
    { name: 'users.view', description: 'View users', category: 'Users' },
    { name: 'users.create', description: 'Create users', category: 'Users' },
    { name: 'users.edit', description: 'Edit users', category: 'Users' },
    { name: 'users.delete', description: 'Delete users', category: 'Users' },
    // Roles
    { name: 'roles.view', description: 'View roles', category: 'Roles' },
    { name: 'roles.create', description: 'Create roles', category: 'Roles' },
    { name: 'roles.edit', description: 'Edit roles', category: 'Roles' },
    { name: 'roles.delete', description: 'Delete roles', category: 'Roles' },
    // Settings
    { name: 'settings.view', description: 'View settings', category: 'Settings' },
    { name: 'settings.edit', description: 'Edit settings', category: 'Settings' },
    // Audit Logs
    { name: 'auditlogs.view', description: 'View audit logs', category: 'Audit Logs' }
];

async function main() {
    console.log('--- FINAL SEED STARTING ---');

    console.log('1. Seeding exact Permissions...');
    for (const p of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { name: p.name },
            update: { description: p.description, category: p.category },
            create: p
        });
    }

    console.log('2. Syncing Admin Role...');
    const adminRole = await prisma.userRole.upsert({
        where: { id: 1 },
        update: { name: 'Admin', isSystem: true },
        create: { id: 1, name: 'Admin', isSystem: true }
    });

    const allPerms = await prisma.permission.findMany();
    for (const p of allPerms) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: 1, permissionId: p.id } },
            update: {},
            create: { roleId: 1, permissionId: p.id }
        });
    }

    console.log('3. Provisioning Admin Profile...');
    const email = 'zakaria@admin.com';
    const password = 'admin1234zakaria';
    const hash = await bcrypt.hash(password, 12);
    
    await prisma.user.upsert({
        where: { email },
        update: { password: hash, roleId: 1 },
        create: { email, password: hash, name: 'Zakaria Admin', roleId: 1 }
    });

    console.log('\n✅ ALL DONE! Login now with your new credentials.');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
