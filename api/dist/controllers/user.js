"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const emailService_1 = require("../services/emailService");
const zod_1 = require("zod");
const userSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    name: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().optional(),
    password: zod_1.z.string().min(8, 'common.errors.password_too_short').optional(),
    roleId: zod_1.z.number().optional(),
});
const updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format').optional(),
    name: zod_1.z.string().optional(),
    avatarUrl: zod_1.z.string().optional(),
    password: zod_1.z.string().min(8, 'common.errors.password_too_short').optional(),
    roleId: zod_1.z.number().optional(),
});
const getAllUsers = async (req, res, next) => {
    try {
        const users = await prisma_1.default.user.findMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getAllUsers = getAllUsers;
const createUser = async (req, res, next) => {
    try {
        const result = userSchema.safeParse(req.body);
        if (!result.success) {
            return next(new error_1.AppError(result.error.issues[0].message, 400));
        }
        const { email, password, roleId, name, avatarUrl } = result.data;
        console.log('Creating user:', { email, roleId });
        if (!password)
            return next(new error_1.AppError('Password is required', 400));
        const existing = await prisma_1.default.user.findUnique({ where: { email } });
        if (existing)
            return next(new error_1.AppError('Email already in use', 400));
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.default.user.create({
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
            await (0, emailService_1.sendEmail)({
                email,
                subject: 'Invoice Manager Pro - Your Login Details',
                message: emailMessage,
            });
            console.log(`Login details sent to ${email}`);
        }
        catch (emailError) {
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
    }
    catch (error) {
        console.error('Create user error:', error);
        next(error);
    }
};
exports.createUser = createUser;
const updateUser = async (req, res, next) => {
    try {
        const result = updateUserSchema.safeParse(req.body);
        if (!result.success) {
            return next(new error_1.AppError(result.error.issues[0].message, 400));
        }
        const { email, roleId, password, name, avatarUrl } = result.data;
        // Fetch target user to check current role
        const targetUser = await prisma_1.default.user.findUnique({
            where: { id: BigInt(req.params.id) },
            include: { role: true }
        });
        if (!targetUser)
            return next(new error_1.AppError('User not found', 404));
        // Restriction: Admin role non-editable for admins
        // If the target user is an admin, and the roleId is being changed, block it.
        if (targetUser.role?.name.toUpperCase() === 'ADMIN' && roleId && roleId !== Number(targetUser.roleId)) {
            return next(new error_1.AppError('Admin role cannot be changed for other admin users', 403));
        }
        const data = {};
        if (email)
            data.email = email;
        if (name !== undefined)
            data.name = name;
        if (avatarUrl !== undefined)
            data.avatarUrl = avatarUrl;
        if (roleId)
            data.roleId = roleId;
        if (password) {
            data.password = await bcryptjs_1.default.hash(password, 12);
        }
        const user = await prisma_1.default.user.update({
            where: { id: BigInt(req.params.id) },
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res, next) => {
    try {
        if (BigInt(req.user.id) === BigInt(req.params.id)) {
            return next(new error_1.AppError('You cannot delete your own account', 400));
        }
        await prisma_1.default.user.delete({ where: { id: BigInt(req.params.id) } });
        res.status(204).json({ status: 'success', data: null });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
