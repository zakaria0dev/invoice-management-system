"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllPermissions = exports.deleteRole = exports.updateRole = exports.createRole = exports.getRole = exports.getAllRoles = exports.initializeRolesAndPermissions = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const auditService_1 = require("../services/auditService");
const DEFAULT_PERMISSIONS = [
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
const initializeRolesAndPermissions = async () => {
    try {
        const existingPerms = await prisma_1.default.permission.count();
        if (existingPerms === 0) {
            console.log('Initializing default permissions...');
            await prisma_1.default.permission.createMany({
                data: DEFAULT_PERMISSIONS,
            });
        }
        const existingRoles = await prisma_1.default.userRole.count();
        if (existingRoles === 0) {
            console.log('Initializing default roles...');
            const permissions = await prisma_1.default.permission.findMany();
            for (const roleData of DEFAULT_ROLES) {
                const role = await prisma_1.default.userRole.create({
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
                    await prisma_1.default.rolePermission.createMany({
                        data: permIds.map(permissionId => ({
                            roleId: role.id,
                            permissionId,
                        })),
                    });
                }
            }
        }
        console.log('Roles and permissions initialized successfully');
    }
    catch (error) {
        console.error('Error initializing roles and permissions:', error);
    }
};
exports.initializeRolesAndPermissions = initializeRolesAndPermissions;
const getAllRoles = async (req, res, next) => {
    try {
        const roles = await prisma_1.default.userRole.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
                _count: {
                    select: { users: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        const serializedRoles = roles.map(role => ({
            id: role.id.toString(),
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
            userCount: role._count.users,
            permissions: role.permissions.map(rp => rp.permission.name),
            createdAt: role.createdAt,
            updatedAt: role.updatedAt,
        }));
        res.status(200).json({
            status: 'success',
            data: { roles: serializedRoles },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllRoles = getAllRoles;
const getRole = async (req, res, next) => {
    try {
        const role = await prisma_1.default.userRole.findUnique({
            where: { id: BigInt(req.params.id) },
            include: {
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        if (!role) {
            return next(new error_1.AppError('Role not found', 404));
        }
        res.status(200).json({
            status: 'success',
            data: {
                role: {
                    id: role.id.toString(),
                    name: role.name,
                    description: role.description,
                    isSystem: role.isSystem,
                    permissions: role.permissions.map(rp => rp.permission.name),
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getRole = getRole;
const createRole = async (req, res, next) => {
    try {
        const { name, description, permissions } = req.body;
        if (!name) {
            return next(new error_1.AppError('Role name is required', 400));
        }
        const existing = await prisma_1.default.userRole.findUnique({
            where: { name },
        });
        if (existing) {
            return next(new error_1.AppError('Role with this name already exists', 400));
        }
        const role = await prisma_1.default.userRole.create({
            data: {
                name,
                description,
                isSystem: false,
            },
        });
        if (permissions && Array.isArray(permissions)) {
            const permRecords = await prisma_1.default.permission.findMany({
                where: { name: { in: permissions } },
            });
            await prisma_1.default.rolePermission.createMany({
                data: permRecords.map(p => ({
                    roleId: role.id,
                    permissionId: p.id,
                })),
            });
        }
        const createdRole = await prisma_1.default.userRole.findUnique({
            where: { id: role.id },
            include: {
                permissions: {
                    include: { permission: true },
                },
            },
        });
        res.status(201).json({
            status: 'success',
            data: {
                role: {
                    id: createdRole.id.toString(),
                    name: createdRole.name,
                    description: createdRole.description,
                    isSystem: createdRole.isSystem,
                    permissions: createdRole.permissions.map(rp => rp.permission.name),
                },
            },
        });
        await (0, auditService_1.createAuditLog)({
            action: 'CREATE_ROLE',
            entityId: createdRole.id,
            entityType: 'ROLE',
            details: {
                name: createdRole.name,
                permissions: createdRole.permissions.map(rp => rp.permission.name),
            },
            userId: req.user?.id,
            ipAddress: req.ip,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createRole = createRole;
const updateRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;
        const role = await prisma_1.default.userRole.findUnique({
            where: { id: BigInt(id) },
        });
        if (!role) {
            return next(new error_1.AppError('Role not found', 404));
        }
        // Removed check for system roles to allow user requested modifications
        const updatedRole = await prisma_1.default.userRole.update({
            where: { id: BigInt(id) },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
            },
        });
        if (permissions && Array.isArray(permissions)) {
            await prisma_1.default.rolePermission.deleteMany({
                where: { roleId: BigInt(id) },
            });
            const permRecords = await prisma_1.default.permission.findMany({
                where: { name: { in: permissions } },
            });
            await prisma_1.default.rolePermission.createMany({
                data: permRecords.map(p => ({
                    roleId: updatedRole.id,
                    permissionId: p.id,
                })),
            });
        }
        const roleWithPerms = await prisma_1.default.userRole.findUnique({
            where: { id: updatedRole.id },
            include: {
                permissions: {
                    include: { permission: true },
                },
                _count: { select: { users: true } },
            },
        });
        res.status(200).json({
            status: 'success',
            data: {
                role: {
                    id: roleWithPerms.id.toString(),
                    name: roleWithPerms.name,
                    description: roleWithPerms.description,
                    isSystem: roleWithPerms.isSystem,
                    userCount: roleWithPerms._count.users,
                    permissions: roleWithPerms.permissions.map(rp => rp.permission.name),
                },
            },
        });
        await (0, auditService_1.createAuditLog)({
            action: 'UPDATE_ROLE',
            entityId: roleWithPerms.id,
            entityType: 'ROLE',
            details: {
                name: roleWithPerms.name,
                description: roleWithPerms.description,
                permissions: roleWithPerms.permissions.map(rp => rp.permission.name),
            },
            userId: req.user?.id,
            ipAddress: req.ip,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateRole = updateRole;
const deleteRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const idBigInt = BigInt(id);
        const role = await prisma_1.default.userRole.findUnique({
            where: { id: idBigInt },
            include: { _count: { select: { users: true } } },
        });
        if (!role) {
            return next(new error_1.AppError('Role not found', 404));
        }
        // Prevent deleting system roles (Admin, Accountant, User)
        // Removed check for system roles to allow user requested modifications
        // Prevent deleting your own role
        const currentUserRoleId = req.user.roleId?.toString();
        if (currentUserRoleId === id) {
            return next(new error_1.AppError('You cannot delete your own role', 400));
        }
        if (role._count.users > 0) {
            return next(new error_1.AppError('Cannot delete role with assigned users. Reassign users first.', 400));
        }
        await prisma_1.default.rolePermission.deleteMany({
            where: { roleId: idBigInt },
        });
        await prisma_1.default.userRole.delete({
            where: { id: idBigInt },
        });
        res.status(204).json({
            status: 'success',
            data: null,
        });
        await (0, auditService_1.createAuditLog)({
            action: 'DELETE_ROLE',
            entityId: idBigInt,
            entityType: 'ROLE',
            details: {
                name: role.name,
            },
            userId: req.user?.id,
            ipAddress: req.ip,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteRole = deleteRole;
const getAllPermissions = async (req, res, next) => {
    try {
        const permissions = await prisma_1.default.permission.findMany({
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        const grouped = permissions.reduce((acc, perm) => {
            if (!acc[perm.category]) {
                acc[perm.category] = [];
            }
            acc[perm.category].push({
                id: perm.id.toString(),
                name: perm.name,
                description: perm.description,
            });
            return acc;
        }, {});
        res.status(200).json({
            status: 'success',
            data: {
                permissions: Object.entries(grouped).map(([category, items]) => ({
                    category,
                    permissions: items,
                })),
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllPermissions = getAllPermissions;
