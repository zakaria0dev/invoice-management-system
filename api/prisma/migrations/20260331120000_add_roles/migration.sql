-- First, clean up any existing tables
DROP TABLE IF EXISTS "RolePermission" CASCADE;
DROP TABLE IF EXISTS "Role" CASCADE;
DROP TABLE IF EXISTS "Permission" CASCADE;

-- Create Permission table
CREATE TABLE "Permission" (
    "id" BIGSERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Role table
CREATE TABLE "Role" (
    "id" BIGSERIAL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create RolePermission junction table
CREATE TABLE "RolePermission" (
    "id" BIGSERIAL PRIMARY KEY,
    "roleId" BIGINT NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
    "permissionId" BIGINT NOT NULL REFERENCES "Permission"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("roleId", "permissionId")
);

-- Create default permissions
INSERT INTO "Permission" ("name", "description", "category") VALUES
('invoices.view', 'View invoices', 'Invoices'),
('invoices.create', 'Create invoices', 'Invoices'),
('invoices.edit', 'Edit invoices', 'Invoices'),
('invoices.delete', 'Delete invoices', 'Invoices'),
('invoices.send', 'Send invoices', 'Invoices'),
('invoices.void', 'Void invoices', 'Invoices'),
('invoices.refund', 'Refund invoices', 'Invoices'),
('quotes.view', 'View quotes', 'Quotes'),
('quotes.create', 'Create quotes', 'Quotes'),
('quotes.edit', 'Edit quotes', 'Quotes'),
('quotes.delete', 'Delete quotes', 'Quotes'),
('quotes.convert', 'Convert quotes to invoices', 'Quotes'),
('quotes.send', 'Send quotes', 'Quotes'),
('clients.view', 'View clients', 'Clients'),
('clients.create', 'Create clients', 'Clients'),
('clients.edit', 'Edit clients', 'Clients'),
('clients.delete', 'Delete clients', 'Clients'),
('products.view', 'View products', 'Products'),
('products.create', 'Create products', 'Products'),
('products.edit', 'Edit products', 'Products'),
('products.delete', 'Delete products', 'Products'),
('payments.view', 'View payments', 'Payments'),
('payments.create', 'Record payments', 'Payments'),
('payments.refund', 'Process refunds', 'Payments'),
('creditnotes.view', 'View credit notes', 'Credit Notes'),
('creditnotes.create', 'Create credit notes', 'Credit Notes'),
('creditnotes.edit', 'Edit credit notes', 'Credit Notes'),
('reports.view', 'View reports', 'Reports'),
('reports.export', 'Export reports', 'Reports'),
('users.view', 'View users', 'Users'),
('users.create', 'Create users', 'Users'),
('users.edit', 'Edit users', 'Users'),
('users.delete', 'Delete users', 'Users'),
('roles.view', 'View roles', 'Roles'),
('roles.create', 'Create roles', 'Roles'),
('roles.edit', 'Edit roles', 'Roles'),
('roles.delete', 'Delete roles', 'Roles'),
('settings.view', 'View settings', 'Settings'),
('settings.edit', 'Edit settings', 'Settings'),
('auditlogs.view', 'View audit logs', 'Audit Logs');

-- Create default roles
INSERT INTO "Role" ("name", "description", "isSystem") VALUES
('Admin', 'Full system access', true),
('Accountant', 'Financial operations access', true),
('User', 'Basic user access', true);

-- Get role IDs and assign permissions
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r, "Permission" p WHERE r."name" = 'Admin';

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r, "Permission" p 
WHERE r."name" = 'Accountant' AND p."name" IN (
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.send', 'invoices.void',
    'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.convert', 'quotes.send',
    'clients.view', 'clients.create', 'clients.edit',
    'products.view', 'products.create', 'products.edit',
    'payments.view', 'payments.create', 'payments.refund',
    'creditnotes.view', 'creditnotes.create', 'creditnotes.edit',
    'reports.view', 'reports.export',
    'users.view',
    'settings.view'
);

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id" FROM "Role" r, "Permission" p 
WHERE r."name" = 'User' AND p."name" IN (
    'invoices.view', 'quotes.view',
    'clients.view',
    'products.view',
    'payments.view',
    'creditnotes.view'
);

-- Add roleId to User table
ALTER TABLE "User" ADD COLUMN "roleId" BIGINT NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id");
