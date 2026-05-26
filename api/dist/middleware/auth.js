"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictToPermission = exports.restrictTo = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const error_1 = require("./error");
const prisma_1 = __importDefault(require("../config/prisma"));
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next(new error_1.AppError('You are not logged in! Please log in to get access.', 401));
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // OPTIMIZATION: If JWT contains permissions and role, use them to skip DB query
        if (decoded.permissions && decoded.role) {
            req.user = {
                id: decoded.id,
                email: decoded.email,
                name: decoded.name,
                roleId: decoded.roleId,
                role: {
                    name: decoded.role,
                    // Map permissions to match the structure expected by downstream logic
                    permissions: decoded.permissions.map(p => ({
                        permission: { name: p }
                    }))
                }
            };
            return next();
        }
        // FALLBACK: If token is old or missing data, fetch from DB
        const user = await prisma_1.default.user.findUnique({
            where: { id: BigInt(decoded.id) },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                }
            },
        });
        if (!user) {
            return next(new error_1.AppError('The user belonging to this token no longer exists.', 401));
        }
        req.user = user;
        next();
    }
    catch (error) {
        next(new error_1.AppError('Invalid token. Please log in again!', 401));
    }
};
exports.protect = protect;
const restrictTo = (...roles) => {
    return (req, res, next) => {
        const userRoleName = req.user.role?.name;
        const userRoleId = req.user.roleId?.toString();
        let userRole;
        if (userRoleName) {
            userRole = userRoleName.toUpperCase();
        }
        else if (userRoleId) {
            if (userRoleId === '1')
                userRole = 'ADMIN';
            else if (userRoleId === '2')
                userRole = 'ACCOUNTANT';
            else if (userRoleId === '3')
                userRole = 'USER';
            else if (userRoleId === '4')
                userRole = 'ACCOUNTANT';
        }
        if (!roles.map(r => r.toUpperCase()).includes(userRole || '')) {
            console.error(`Access denied for ${req.user.email}. Role: ${userRole}. Required: [${roles.join(', ')}]`);
            return next(new error_1.AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};
exports.restrictTo = restrictTo;
/**
 * restrictToPermission checks if the user has AT LEAST ONE of the required permissions.
 * Standard format: "entity.action" (e.g., "invoices.send")
 */
const restrictToPermission = (...requiredPermissions) => {
    return (req, res, next) => {
        // ADMIN always has full access
        const userRoleName = req.user.role?.name?.toUpperCase();
        if (userRoleName === 'ADMIN') {
            return next();
        }
        const userPermissions = (req.user.role?.permissions || []).map((rp) => (rp.permission?.name || rp.name || '').trim().toLowerCase()).filter(Boolean);
        const normalizedRequired = requiredPermissions.map(p => p.trim().toLowerCase());
        // console.log(`Checking permissions for ${req.user.email} (Role: ${userRoleName}): Required: [${normalizedRequired.join(', ')}], User has: [${userPermissions.slice(0, 10).join(', ')}${userPermissions.length > 10 ? '...' : ''}]`);
        const hasPermission = normalizedRequired.some(perm => userPermissions.includes(perm));
        if (!hasPermission) {
            const msg = `Permission denied for ${req.user.email} (Role: ${userRoleName}). Required: [${normalizedRequired.join(', ')}]. User has: [${userPermissions.slice(0, 5).join(', ')}${userPermissions.length > 5 ? '...' : ''}]`;
            console.error(msg);
            return next(new error_1.AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};
exports.restrictToPermission = restrictToPermission;
