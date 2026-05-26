"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.updateProfile = exports.updatePassword = exports.getMe = exports.verifyPassword = exports.login = exports.register = exports.upload = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const auditService_1 = require("../services/auditService");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Configure Multer for local storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/avatars');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;
        cb(null, fileName);
    }
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new error_1.AppError('Only images are allowed', 400));
        }
    }
});
const signToken = (payload) => {
    if (!process.env.JWT_SECRET) {
        console.error('CRITICAL ERROR: JWT_SECRET IS MISSING IN ENVIRONMENT!');
        throw new error_1.AppError('Server configuration error (JWT)', 500);
    }
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
        expiresIn: (process.env.JWT_EXPIRES_IN || '30m'),
    });
};
const formatUserResponse = async (user) => {
    let permissions = [];
    try {
        // If permissions are already pre-loaded (from protect middleware), use them
        if (user.role?.permissions && Array.isArray(user.role.permissions)) {
            permissions = user.role.permissions.map((rp) => typeof rp === 'string' ? rp : rp.permission?.name || rp.name).filter(Boolean);
        }
        else if (user.roleId) {
            // Otherwise, fetch from DB
            const rolePerms = await prisma_1.default.rolePermission.findMany({
                where: { roleId: user.roleId },
                include: { permission: true }
            });
            permissions = rolePerms.map((rp) => rp.permission?.name).filter(Boolean);
        }
    }
    catch (err) {
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
const register = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return next(new error_1.AppError('Email already in use', 400));
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.default.user.create({
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
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.default.user.findUnique({
            where: { email },
            include: { role: true }
        });
        console.log('Login attempt for:', email);
        if (!user) {
            console.log('User not found');
            await (0, auditService_1.createAuditLog)({ action: 'LOGIN_FAILURE', details: { email, reason: 'User not found' }, ipAddress: req.ip });
            return next(new error_1.AppError('Incorrect email or password', 401));
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        console.log('Password match:', isMatch);
        if (!isMatch) {
            await (0, auditService_1.createAuditLog)({ action: 'LOGIN_FAILURE', details: { email, reason: 'Invalid password' }, userId: user.id, ipAddress: req.ip });
            return next(new error_1.AppError('Incorrect email or password', 401));
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
        await (0, auditService_1.createAuditLog)({ action: 'LOGIN_SUCCESS', userId: user.id, ipAddress: req.ip });
        res.status(200).json({
            status: 'success',
            token,
            data: { user: formattedUser },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const verifyPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password)
            return next(new error_1.AppError('Password is required', 400));
        const user = await prisma_1.default.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return next(new error_1.AppError('User not found', 404));
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch)
            return next(new error_1.AppError('Incorrect password', 401));
        res.status(200).json({ status: 'success', message: 'Password verified' });
    }
    catch (error) {
        next(error);
    }
};
exports.verifyPassword = verifyPassword;
const getMe = async (req, res, next) => {
    try {
        const user = req.user;
        res.status(200).json({
            status: 'success',
            data: {
                user: await formatUserResponse(user)
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
const updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return next(new error_1.AppError('Current and new password are required', 400));
        }
        if (newPassword.length < 8) {
            return next(new error_1.AppError('New password must be at least 8 characters', 400));
        }
        const user = await prisma_1.default.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return next(new error_1.AppError('User not found', 404));
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch)
            return next(new error_1.AppError('Current password is incorrect', 401));
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.default.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        });
        res.status(200).json({ status: 'success', message: 'Password updated successfully' });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePassword = updatePassword;
const updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        const data = {};
        if (name !== undefined)
            data.name = name;
        if (email) {
            const existingUser = await prisma_1.default.user.findFirst({
                where: { email, NOT: { id: req.user.id } }
            });
            if (existingUser)
                return next(new error_1.AppError('Email already in use', 400));
            data.email = email;
        }
        const user = await prisma_1.default.user.update({
            where: { id: req.user.id },
            data,
            include: { role: true }
        });
        res.status(200).json({
            status: 'success',
            data: { user: await formatUserResponse(user) }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
const uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new error_1.AppError('Please upload an image', 400));
        }
        const publicUrl = `/uploads/avatars/${req.file.filename}`;
        const user = await prisma_1.default.user.update({
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
    }
    catch (error) {
        next(error);
    }
};
exports.uploadAvatar = uploadAvatar;
