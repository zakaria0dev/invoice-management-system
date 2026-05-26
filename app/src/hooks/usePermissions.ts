import { useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function usePermissions() {
    const user = useAppStore((s) => s.user);

    // Derived values should all be inside useMemo to ensure stability
    const { role, permissions } = useMemo(() => {
        // Handle both string role and role object
        const roleObj = user?.role;
        const roleName = typeof roleObj === 'string' ? roleObj : (roleObj as any)?.name;

        // Combine permissions from user and role object
        const userPerms = (user as any)?.permissions || [];
        const rolePermsRaw = (roleObj as any)?.permissions || [];

        // Map objects to strings
        const rolePerms = Array.isArray(rolePermsRaw)
            ? rolePermsRaw.map((p: any) =>
                typeof p === 'string' ? p : p.permission?.name || p.name
            ).filter(Boolean)
            : [];

        return {
            role: roleName,
            permissions: [...new Set([...userPerms, ...rolePerms])]
        };
    }, [user]);

    const hasPermission = useCallback((perm: string) => permissions.includes(perm), [permissions]);

    const isAdmin = useCallback(() => role === 'ADMIN', [role]);
    const isAccountant = useCallback(() => role === 'ACCOUNTANT', [role]);
    const isUser = useCallback(() => role === 'USER', [role]);

    // Internal helper for standard actions
    const check = useCallback((entity: string, action: string, defaultRoles: string[] = ['ADMIN', 'ACCOUNTANT']) => {
        if (defaultRoles.includes(role)) return true;
        return hasPermission(`${entity}.${action}`);
    }, [role, hasPermission]);

    // INVOICES
    const canCreateInvoice = useCallback(() => check('invoices', 'create'), [check]);
    const canEditInvoice = useCallback(() => check('invoices', 'edit'), [check]);
    const canDeleteInvoice = useCallback(() => check('invoices', 'delete', ['ADMIN']), [check]);
    const canCancelInvoice = useCallback(() => check('invoices', 'cancel'), [check]);
    const canVoidInvoice = useCallback(() => check('invoices', 'void'), [check]);
    const canViewInvoices = useCallback(() => check('invoices', 'view'), [check]);
    const canSendInvoice = useCallback(() => check('invoices', 'send'), [check]);
    const canDownloadInvoice = useCallback(() => check('invoices', 'view'), [check]);
    const canExportInvoices = useCallback(() => check('reports', 'export'), [check]);
    const canRefundInvoice = useCallback(() => check('invoices', 'refund'), [check]);

    // QUOTES
    const canCreateQuote = useCallback(() => check('quotes', 'create'), [check]);
    const canEditQuote = useCallback(() => check('quotes', 'edit'), [check]);
    const canDeleteQuote = useCallback(() => check('quotes', 'delete', ['ADMIN']), [check]);
    const canViewQuotes = useCallback(() => check('quotes', 'view'), [check]);
    const canSendQuote = useCallback(() => check('quotes', 'send'), [check]);
    const canConvertQuote = useCallback(() => check('quotes', 'convert'), [check]);
    const canDownloadQuote = useCallback(() => check('quotes', 'view'), [check]);
    const canExportQuotes = useCallback(() => check('reports', 'export'), [check]);

    // CLIENTS
    const canCreateClient = useCallback(() => check('clients', 'create'), [check]);
    const canEditClient = useCallback(() => check('clients', 'edit'), [check]);
    const canDeleteClient = useCallback(() => check('clients', 'delete', ['ADMIN']), [check]);
    const canViewClients = useCallback(() => check('clients', 'view'), [check]);
    const canExportClients = useCallback(() => check('reports', 'export'), [check]);
    const canImportClients = useCallback(() => check('clients', 'create'), [check]);

    // PRODUCTS
    const canCreateProduct = useCallback(() => check('products', 'create'), [check]);
    const canEditProduct = useCallback(() => check('products', 'edit'), [check]);
    const canDeleteProduct = useCallback(() => check('products', 'delete', ['ADMIN']), [check]);
    const canViewProducts = useCallback(() => check('products', 'view'), [check]);
    const canAdjustStock = useCallback(() => check('products', 'adjust_stock'), [check]);

    // CREDIT NOTES
    const canCreateCreditNote = useCallback(() => check('creditnotes', 'create'), [check]);
    const canEditCreditNote = useCallback(() => check('creditnotes', 'edit'), [check]);
    const canDeleteCreditNote = useCallback(() => check('creditnotes', 'delete', ['ADMIN']), [check]);
    const canViewCreditNotes = useCallback(() => check('creditnotes', 'view'), [check]);
    const canSendCreditNote = useCallback(() => check('creditnotes', 'send'), [check]);
    const canDownloadCreditNote = useCallback(() => check('creditnotes', 'view'), [check]);
    const canViewReports = useCallback(() => check('reports', 'view'), [check]);

    // PAYMENTS
    const canRecordPayment = useCallback(() => check('payments', 'create'), [check]);
    const canViewPayments = useCallback(() => check('payments', 'view'), [check]);
    const canRefundPayment = useCallback(() => check('payments', 'refund'), [check]);

    // REFUNDS
    const canViewRefunds = useCallback(() => check('payments', 'view'), [check]);
    const canDownloadRefund = useCallback(() => check('payments', 'view'), [check]);
    const canSendRefund = useCallback(() => check('payments', 'send'), [check]);

    // USERS
    const canViewUsers = useCallback(() => check('users', 'view', ['ADMIN']), [check]);
    const canManageUsers = useCallback(() => check('users', 'view', ['ADMIN']), [check]);

    // ROLES
    const canViewRoles = useCallback(() => check('roles', 'view', ['ADMIN']), [check]);
    const canCreateRole = useCallback(() => check('roles', 'create', ['ADMIN']), [check]);
    const canEditRole = useCallback(() => check('roles', 'edit', ['ADMIN']), [check]);
    const canDeleteRole = useCallback(() => check('roles', 'delete', ['ADMIN']), [check]);

    // SYSTEM
    const canViewAuditLogs = useCallback(() => check('auditlogs', 'view', ['ADMIN']), [check]);
    const canAccessSettings = useCallback(() => role === 'ADMIN', [role]);

    const canExport = useCallback(() => canExportInvoices() || canExportQuotes() || canExportClients(), [canExportInvoices, canExportQuotes, canExportClients]);

    return useMemo(() => ({
        role,
        isAdmin,
        isAccountant,
        isUser,
        hasPermission,

        canCreateInvoice,
        canEditInvoice,
        canDeleteInvoice,
        canCancelInvoice,
        canVoidInvoice,
        canViewInvoices,
        canSendInvoice,
        canDownloadInvoice,
        canExportInvoices,
        canRefundInvoice,

        canCreateQuote,
        canEditQuote,
        canDeleteQuote,
        canViewQuotes,
        canSendQuote,
        canConvertQuote,
        canDownloadQuote,
        canExportQuotes,

        canCreateClient,
        canEditClient,
        canDeleteClient,
        canViewClients,
        canExportClients,
        canImportClients,

        canCreateProduct,
        canEditProduct,
        canDeleteProduct,
        canViewProducts,
        canAdjustStock,

        canCreateCreditNote,
        canEditCreditNote,
        canDeleteCreditNote,
        canViewCreditNotes,
        canSendCreditNote,
        canDownloadCreditNote,
        canViewReports,

        canRecordPayment,
        canViewPayments,
        canRefundPayment,

        canViewUsers,
        canManageUsers,
        canViewRoles,
        canCreateRole,
        canEditRole,
        canDeleteRole,
        canViewAuditLogs,
        canAccessSettings,

        canViewRefunds,
        canDownloadRefund,
        canSendRefund,
        canExport,
    }), [
        role, isAdmin, isAccountant, isUser, hasPermission,
        canCreateInvoice, canEditInvoice, canDeleteInvoice, canCancelInvoice, canVoidInvoice, canViewInvoices, canSendInvoice, canDownloadInvoice, canExportInvoices, canRefundInvoice,
        canCreateQuote, canEditQuote, canDeleteQuote, canViewQuotes, canSendQuote, canConvertQuote, canDownloadQuote, canExportQuotes,
        canCreateClient, canEditClient, canDeleteClient, canViewClients, canExportClients, canImportClients,
        canCreateProduct, canEditProduct, canDeleteProduct, canViewProducts, canAdjustStock,
        canCreateCreditNote, canEditCreditNote, canDeleteCreditNote, canViewCreditNotes, canSendCreditNote, canDownloadCreditNote, canViewReports,
        canRecordPayment, canViewPayments, canRefundPayment,
        canViewUsers, canManageUsers, canViewRoles, canCreateRole, canEditRole, canDeleteRole, canViewAuditLogs, canAccessSettings,
        canViewRefunds, canDownloadRefund, canSendRefund, canExport
    ]);
}
