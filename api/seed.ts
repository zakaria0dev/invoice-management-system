import prisma from './src/config/prisma';
import bcrypt from 'bcryptjs';
import { initializeRolesAndPermissions } from './src/controllers/role';

const DEFAULT_PERMISSIONS = [
    { name: 'invoices.view', description: 'View invoices', category: 'Invoices' },
    { name: 'invoices.create', description: 'Create invoices', category: 'Invoices' },
    { name: 'invoices.edit', description: 'Edit invoices', category: 'Invoices' },
    { name: 'invoices.delete', description: 'Delete invoices', category: 'Invoices' },
    { name: 'invoices.send', description: 'Send invoices', category: 'Invoices' },
    { name: 'invoices.cancel', description: 'Cancel invoices', category: 'Invoices' },
    { name: 'invoices.refund', description: 'Refund invoices', category: 'Invoices' },
    { name: 'quotes.view', description: 'View quotes', category: 'Quotes' },
    { name: 'quotes.create', description: 'Create quotes', category: 'Quotes' },
    { name: 'quotes.edit', description: 'Edit quotes', category: 'Quotes' },
    { name: 'quotes.delete', description: 'Delete quotes', category: 'Quotes' },
    { name: 'quotes.convert', description: 'Convert quotes to invoices', category: 'Quotes' },
    { name: 'quotes.send', description: 'Send quotes', category: 'Quotes' },
    { name: 'clients.view', description: 'View clients', category: 'Clients' },
    { name: 'clients.create', description: 'Create clients', category: 'Clients' },
    { name: 'clients.edit', description: 'Edit clients', category: 'Clients' },
    { name: 'clients.delete', description: 'Delete clients', category: 'Clients' },
    { name: 'products.view', description: 'View products', category: 'Products' },
    { name: 'products.create', description: 'Create products', category: 'Products' },
    { name: 'products.edit', description: 'Edit products', category: 'Products' },
    { name: 'products.delete', description: 'Delete products', category: 'Products' },
    { name: 'payments.view', description: 'View payments', category: 'Payments' },
    { name: 'payments.create', description: 'Record payments', category: 'Payments' },
    { name: 'payments.refund', description: 'Process refunds', category: 'Payments' },
    { name: 'creditnotes.view', description: 'View credit notes', category: 'Credit Notes' },
    { name: 'creditnotes.create', description: 'Create credit notes', category: 'Credit Notes' },
    { name: 'creditnotes.edit', description: 'Edit credit notes', category: 'Credit Notes' },
    { name: 'creditnotes.send', description: 'Send credit notes', category: 'Credit Notes' },
    { name: 'reports.view', description: 'View reports', category: 'Reports' },
    { name: 'reports.export', description: 'Export reports', category: 'Reports' },
    { name: 'users.view', description: 'View users', category: 'Users' },
    { name: 'users.create', description: 'Create users', category: 'Users' },
    { name: 'users.edit', description: 'Edit users', category: 'Users' },
    { name: 'users.delete', description: 'Delete users', category: 'Users' },
    { name: 'roles.view', description: 'View roles', category: 'Roles' },
    { name: 'roles.create', description: 'Create roles', category: 'Roles' },
    { name: 'roles.edit', description: 'Edit roles', category: 'Roles' },
    { name: 'roles.delete', description: 'Delete roles', category: 'Roles' },
    { name: 'settings.view', description: 'View settings', category: 'Settings' },
    { name: 'settings.edit', description: 'Edit settings', category: 'Settings' },
    { name: 'auditlogs.view', description: 'View audit logs', category: 'Audit Logs' },
];

const DEFAULT_ROLES = [
    {
        name: 'Admin',
        description: 'Full system access',
        isSystem: true,
        permissions: DEFAULT_PERMISSIONS.map(p => p.name),
    },
    {
        name: 'Accountant',
        description: 'Financial operations access',
        isSystem: true,
        permissions: [
            'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.send', 'invoices.cancel',
            'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.convert', 'quotes.send',
            'clients.view', 'clients.create', 'clients.edit',
            'products.view', 'products.create', 'products.edit',
            'payments.view', 'payments.create', 'payments.refund',
            'creditnotes.view', 'creditnotes.create', 'creditnotes.edit',
            'reports.view', 'reports.export',
            'users.view',
            'settings.view',
        ],
    },
    {
        name: 'User',
        description: 'Basic user access',
        isSystem: true,
        permissions: [
            'invoices.view', 'quotes.view',
            'clients.view',
            'products.view',
            'payments.view',
            'creditnotes.view',
        ],
    },
];

async function main() {
    // Initialize permissions
    const existingPerms = await prisma.permission.count();
    if (existingPerms === 0) {
        console.log('Creating default permissions...');
        await prisma.permission.createMany({
            data: DEFAULT_PERMISSIONS,
        });
    }

    // Initialize roles
    const existingRoles = await prisma.role.count();
    if (existingRoles === 0) {
        console.log('Creating default roles...');
        const permissions = await prisma.permission.findMany();

        for (const roleData of DEFAULT_ROLES) {
            const role = await prisma.role.create({
                data: {
                    name: roleData.name,
                    description: roleData.description,
                    isSystem: roleData.isSystem,
                },
            });

            const permIds = permissions
                .filter(p => roleData.permissions.includes(p.name))
                .map(p => p.id);

            if (permIds.length > 0) {
                await prisma.rolePermission.createMany({
                    data: permIds.map(permissionId => ({
                        roleId: role.id,
                        permissionId,
                    })),
                });
            }
        }
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('demo123', 12);
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });

    const user = await prisma.user.upsert({
        where: { email: 'demo@invoicepro.com' },
        update: {},
        create: {
            email: 'demo@invoicepro.com',
            password: hashedPassword,
            roleId: adminRole?.id || BigInt(1),
        },
    });

    const client = await prisma.client.create({
        data: {
            name: 'Sample Client',
            email: 'client@example.com',
            address: '123 Business St, City',
        },
    });

    console.log({ user, client, rolesInitialized: true });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
