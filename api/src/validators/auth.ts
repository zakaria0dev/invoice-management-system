import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8, 'common.errors.password_too_short'),
        role: z.enum(['ADMIN', 'USER', 'ACCOUNTANT']).optional(),
    })
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(8, 'common.errors.password_too_short'),
    })
});
