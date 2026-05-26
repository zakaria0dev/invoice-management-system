import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error';
import { createAuditLog } from '../services/auditService';
import { registerSchema, loginSchema } from '../validators/auth';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Configure Multer for local storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req: any, file, cb) => {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;
        cb(null, fileName);
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new AppError('Only images are allowed', 400) as any);
        }
    }
});

const signToken = (payload: any) => {
    if (!process.env.JWT_SECRET) {
        console.error('CRITICAL ERROR: JWT_SECRET IS MISSING IN ENVIRONMENT!');
        throw new AppError('Server configuration error (JWT)', 500);
    }
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: (process.env.JWT_EXPIRES_IN || '30m') as any,
    });
};

const formatUserResponse = async (user: any) => {
    let permissions: string[] = [];

    try {
        // If permissions are already pre-loaded (from protect middleware), use them
        if (user.role?.permissions && Array.isArray(user.role.permissions)) {
            permissions = user.role.permissions.map((rp: any) =>
                typeof rp === 'string' ? rp : rp.permission?.name || rp.name
            ).filter(Boolean);
        } else if (user.roleId) {
            // Otherwise, fetch from DB
            const rolePerms = await prisma.rolePermission.findMany({
                where: { roleId: user.roleId },
                include: { permission: true }
            });
            permissions = rolePerms.map((rp: any) => rp.permission?.name).filter(Boolean);
        }
    } catch (err) {
        // Non-fatal: permissions table may not be seeded yet
        console.error('Warning: Could not load permissions for user', user.id, err);
        permissions = [];
    }

    return {
        id: user.id.toString(),
        email: user.email,
        role: user.role?.name?.toUpperCase() || 'ADMIN',
        roleId: user.roleId?.toString() || '1',
        name: user.name || user.email,
        avatarUrl: user.avatarUrl || null,
        permissions
    };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, role } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return next(new AppError('Email already in use', 400));
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                roleId: role ? (role === 'ADMIN' ? 1 : role === 'ACCOUNTANT' ? 2 : 3) : 3,
            },
            include: { role: true },
        });

        const formattedUser = await formatUserResponse(user);
        const token = signToken({
            id: formattedUser.id,
            email: formattedUser.email,
            name: formattedUser.name,
            role: formattedUser.role,
            roleId: formattedUser.roleId,
            permissions: formattedUser.permissions
        });

        res.status(201).json({
            status: 'success',
            token,
            data: { user: formattedUser },
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true }
        });
        console.log('Login attempt for:', email);
        if (!user) {
            console.log('User not found');
            await createAuditLog({ action: 'LOGIN_FAILURE', details: { email, reason: 'User not found' }, ipAddress: req.ip });
            return next(new AppError('Incorrect email or password', 401));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);

        if (!isMatch) {
            await createAuditLog({ action: 'LOGIN_FAILURE', details: { email, reason: 'Invalid password' }, userId: user.id, ipAddress: req.ip });
            return next(new AppError('Incorrect email or password', 401));
        }

        const formattedUser = await formatUserResponse(user);
        const token = signToken({
            id: formattedUser.id,
            email: formattedUser.email,
            name: formattedUser.name,
            role: formattedUser.role,
            roleId: formattedUser.roleId,
            permissions: formattedUser.permissions
        });

        await createAuditLog({ action: 'LOGIN_SUCCESS', userId: user.id, ipAddress: req.ip });

        res.status(200).json({
            status: 'success',
            token,
            data: { user: formattedUser },
        });
    } catch (error) {
        next(error);
    }
};

export const verifyPassword = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { password } = req.body;
        if (!password) return next(new AppError('Password is required', 400));

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return next(new AppError('User not found', 404));

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return next(new AppError('Incorrect password', 401));

        res.status(200).json({ status: 'success', message: 'Password verified' });
    } catch (error) {
        next(error);
    }
};

export const getMe = async (req: any, res: Response, next: NextFunction) => {
    try {
        const user = req.user;

        res.status(200).json({
            status: 'success',
            data: {
                user: await formatUserResponse(user)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const updatePassword = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return next(new AppError('Current and new password are required', 400));
        }
        if (newPassword.length < 8) {
            return next(new AppError('New password must be at least 8 characters', 400));
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return next(new AppError('User not found', 404));

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return next(new AppError('Current password is incorrect', 401));

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });

        res.status(200).json({ status: 'success', message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req: any, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body;
        const data: any = {};
        if (name !== undefined) data.name = name;
        if (email) {
            const existingUser = await prisma.user.findFirst({
                where: { email, NOT: { id: req.user.id } }
            });
            if (existingUser) return next(new AppError('Email already in use', 400));
            data.email = email;
        }

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data,
            include: { role: true }
        });

        res.status(200).json({
            status: 'success',
            data: { user: await formatUserResponse(user) }
        });
    } catch (error) {
        next(error);
    }
};

export const uploadAvatar = async (req: any, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return next(new AppError('Please upload an image', 400));
        }

        const publicUrl = `/uploads/avatars/${req.file.filename}`;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl: publicUrl },
            include: { role: true }
        });

        res.status(200).json({
            status: 'success',
            data: {
                avatarUrl: publicUrl,
                user: await formatUserResponse(user)
            }
        });
    } catch (error) {
        next(error);
    }
};
