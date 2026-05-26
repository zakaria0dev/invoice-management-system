"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
function serializeBigInt(obj) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj === 'bigint')
        return obj.toString();
    if (Array.isArray(obj))
        return obj.map(serializeBigInt);
    if (typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            result[key] = serializeBigInt(obj[key]);
        }
        return result;
    }
    return obj;
}
const getAuditLogs = async (req, res) => {
    try {
        const { limit = '50', offset = '0', action, entityType } = req.query;
        const take = parseInt(limit, 10);
        const skip = parseInt(offset, 10);
        const where = {};
        if (action) {
            where.action = action;
        }
        if (entityType) {
            where.entityType = entityType;
        }
        const [logs, total] = await Promise.all([
            prisma_1.default.auditLog.findMany({
                where,
                take,
                skip,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            avatarUrl: true
                        }
                    }
                }
            }),
            prisma_1.default.auditLog.count({ where })
        ]);
        const serializedLogs = logs.map(log => {
            const details = serializeBigInt(log.details);
            let entityLabel = null;
            if (log.entityId && log.entityType) {
                if (details?.number) {
                    entityLabel = details.number;
                }
                else {
                    switch (log.entityType) {
                        case 'INVOICE':
                            entityLabel = `INV-${log.entityId.toString().padStart(4, '0')}`;
                            break;
                        case 'QUOTE':
                            entityLabel = `Q-${log.entityId.toString().padStart(4, '0')}`;
                            break;
                        case 'CLIENT':
                            entityLabel = `CLI-${log.entityId.toString().padStart(4, '0')}`;
                            break;
                        case 'PRODUCT':
                            entityLabel = `PRD-${log.entityId.toString().padStart(4, '0')}`;
                            break;
                        default:
                            entityLabel = log.entityId.toString();
                    }
                }
            }
            return {
                ...log,
                id: log.id.toString(),
                entityId: log.entityId?.toString(),
                entityLabel,
                details,
                userId: log.userId?.toString(),
                user: log.user ? {
                    ...log.user,
                    id: log.user.id.toString()
                } : null
            };
        });
        res.json({
            data: serializedLogs,
            pagination: {
                total,
                limit: take,
                offset: skip
            }
        });
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};
exports.getAuditLogs = getAuditLogs;
