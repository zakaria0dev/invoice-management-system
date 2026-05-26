import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error';
import { sendEmail } from '../services/emailService';
import { z } from 'zod';

const userSchema = z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().optional(),
    avatarUrl: z.string().optional(),
    password: z.string().min(8, 'common.errors.password_too_short').optional(),
    roleId: z.number().optional(),
});

const updateUserSchema = z.object({
    email: z.string().email('Invalid email format').optional(),
    name: z.string().optional(),
    avatarUrl: z.string().optional(),
    password: z.string().min(8, 'common.errors.password_too_short').optional(),
    roleId: z.number().optional(),
});

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.user.findMany({
            include: { role: true },
            orderBy: { createdAt: 'desc' }
        });
        const serializedUsers = users.map(u => ({
            id: u.id.toString(),
            email: u.email,
            name: u.name,
            avatarUrl: u.avatarUrl,
            role: u.role?.name || 'User',
            roleId: u.roleId?.toString(),
            createdAt: u.createdAt,
        }));
        res.status(200).json({ status: 'success', data: { users: serializedUsers } });
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = userSchema.safeParse(req.body);
        if (!result.success) {
            return next(new AppError(result.error.issues[0].message, 400));
        }

        const { email, password, roleId, name, avatarUrl } = result.data;
        console.log('Creating user:', { email, roleId });

        if (!password) return next(new AppError('Password is required', 400));

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return next(new AppError('Email already in use', 400));

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                email,
                name,
                avatarUrl,
                password: hashedPassword,
                roleId: roleId || 3 // Default to User role
            },
            include: { role: true }
        });

        // Send login details email
        try {
            const appUrl = process.env.APP_URL || 'https://app.ifry.ma/';
            const emailMessage = `
Hello,
Your account has been created successfully in Invoice Manager Pro.

Login Details:
─────────────────────────────────────────
Email: ${email}
Password: ${password}
App URL: ${appUrl}
─────────────────────────────────────────

Best regards,
Invoice Manager Team
            `;

            await sendEmail({
                email,
                subject: 'Invoice Manager Pro - Your Login Details',
                message: emailMessage,
            });

            console.log(`Login details sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail the user creation if email sending fails
        }

        res.status(201).json({
            status: 'success',
            data: {
                user: {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    role: user.role?.name || 'User',
                    roleId: user.roleId?.toString(),
                }
            }
        });
    } catch (error: any) {
        console.error('Create user error:', error);
        next(error);
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = updateUserSchema.safeParse(req.body);
        if (!result.success) {
            return next(new AppError(result.error.issues[0].message, 400));
        }

        const { email, roleId, password, name, avatarUrl } = result.data;

        // Fetch target user to check current role
        const targetUser = await prisma.user.findUnique({
            where: { id: BigInt(req.params.id as string) },
            include: { role: true }
        });

        if (!targetUser) return next(new AppError('User not found', 404));

        // Restriction: Admin role non-editable for admins
        // If the target user is an admin, and the roleId is being changed, block it.
        if (targetUser.role?.name.toUpperCase() === 'ADMIN' && roleId && roleId !== Number(targetUser.roleId)) {
            return next(new AppError('Admin role cannot be changed for other admin users', 403));
        }

        const data: any = {};
        if (email) data.email = email;
        if (name !== undefined) data.name = name;
        if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
        if (roleId) data.roleId = roleId;
        if (password) {
            data.password = await bcrypt.hash(password, 12);
        }

        const user = await prisma.user.update({
            where: { id: BigInt(req.params.id as string) },
            data,
            include: { role: true }
        });

        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    role: user.role?.name || 'User',
                    roleId: user.roleId?.toString(),
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (BigInt((req as any).user.id) === BigInt(req.params.id as string)) {
            return next(new AppError('You cannot delete your own account', 400));
        }

        await prisma.user.delete({ where: { id: BigInt(req.params.id as string) } });
        res.status(204).json({ status: 'success', data: null });
    } catch (error) {
        next(error);
    }
};
