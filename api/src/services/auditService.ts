import prisma from '../config/prisma';

export interface AuditLogData {
    action: string;
    entityId?: bigint | number;
    entityType?: string;
    details?: any;
    userId?: bigint | number;
    ipAddress?: string;
}

/**
 * Creates an immutable audit log entry.
 * Note: No update or delete methods are exported for this service.
 */
export async function createAuditLog(data: AuditLogData) {
    try {
        return await prisma.auditLog.create({
            data: {
                action: data.action,
                entityId: data.entityId ? BigInt(data.entityId) : null,
                entityType: data.entityType,
                details: data.details || {},
                userId: data.userId ? BigInt(data.userId) : null,
                ipAddress: data.ipAddress
            }
        });
    } catch (error) {
        console.error('FAILED TO CREATE AUDIT LOG:', error);
    }
}
