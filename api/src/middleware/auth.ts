import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error';
import prisma from '../config/prisma';

interface JwtPayload {
    id: string;
    email?: string;
    name?: string;
    role?: string;
    roleId?: string;
    permissions?: string[];
}

export const protect = async (req: any, res: Response, next: NextFunction) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

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
        const user = await prisma.user.findUnique({
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
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        req.user = user;
        next();
    } catch (error) {
        next(new AppError('Invalid token. Please log in again!', 401));
    }
};

export const restrictTo = (...roles: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        const userRoleName = req.user.role?.name;
        const userRoleId = req.user.roleId?.toString();

        let userRole: string | undefined;
        if (userRoleName) {
            userRole = userRoleName.toUpperCase();
        } else if (userRoleId) {
            if (userRoleId === '1') userRole = 'ADMIN';
            else if (userRoleId === '2') userRole = 'ACCOUNTANT';
            else if (userRoleId === '3') userRole = 'USER';
            else if (userRoleId === '4') userRole = 'ACCOUNTANT';
        }

        if (!roles.map(r => r.toUpperCase()).includes(userRole || '')) {
            console.error(`Access denied for ${req.user.email}. Role: ${userRole}. Required: [${roles.join(', ')}]`);
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

/**
 * restrictToPermission checks if the user has AT LEAST ONE of the required permissions.
 * Standard format: "entity.action" (e.g., "invoices.send")
 */
export const restrictToPermission = (...requiredPermissions: string[]) => {
    return (req: any, res: Response, next: NextFunction) => {
        // ADMIN always has full access
        const userRoleName = req.user.role?.name?.toUpperCase();
        if (userRoleName === 'ADMIN') {
            return next();
        }

        const userPermissions = (req.user.role?.permissions || []).map((rp: any) =>
            (rp.permission?.name || rp.name || '').trim().toLowerCase()
        ).filter(Boolean);

        const normalizedRequired = requiredPermissions.map(p => p.trim().toLowerCase());

        // console.log(`Checking permissions for ${req.user.email} (Role: ${userRoleName}): Required: [${normalizedRequired.join(', ')}], User has: [${userPermissions.slice(0, 10).join(', ')}${userPermissions.length > 10 ? '...' : ''}]`);

        const hasPermission = normalizedRequired.some(perm => userPermissions.includes(perm));

        if (!hasPermission) {
            const msg = `Permission denied for ${req.user.email} (Role: ${userRoleName}). Required: [${normalizedRequired.join(', ')}]. User has: [${userPermissions.slice(0, 5).join(', ')}${userPermissions.length > 5 ? '...' : ''}]`;
            console.error(msg);
            return next(new AppError('You do not have permission to perform this action', 403));
        }

        next();
    };
};
