import { z } from 'zod';

export const userSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(8, 'Password must be at least 8 characters').optional(),
        roleId: z.number().optional(),
    })
});

export const updateUserSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email format').optional(),
        password: z.string().min(8, 'Password must be at least 8 characters').optional(),
        roleId: z.number().optional(),
    })
});
