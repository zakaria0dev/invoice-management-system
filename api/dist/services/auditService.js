"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = createAuditLog;
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * Creates an immutable audit log entry.
 * Note: No update or delete methods are exported for this service.
 */
async function createAuditLog(data) {
    try {
        return await prisma_1.default.auditLog.create({
            data: {
                action: data.action,
                entityId: data.entityId ? BigInt(data.entityId) : null,
                entityType: data.entityType,
                details: data.details || {},
                userId: data.userId ? BigInt(data.userId) : null,
                ipAddress: data.ipAddress
            }
        });
    }
    catch (error) {
        console.error('FAILED TO CREATE AUDIT LOG:', error);
    }
}
