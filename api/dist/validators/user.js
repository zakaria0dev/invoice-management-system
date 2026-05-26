"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.userSchema = void 0;
const zod_1 = require("zod");
exports.userSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format'),
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters').optional(),
        roleId: zod_1.z.number().optional(),
    })
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format').optional(),
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters').optional(),
        roleId: zod_1.z.number().optional(),
    })
});
