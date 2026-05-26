import { z } from 'zod';

export const productSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().optional(),
        priceHT: z.number().positive('Price must be positive'),
        tva: z.number().nonnegative('TVA must be 0 or more'),
        unit: z.string().optional(),
        category: z.string().optional(),
        stock: z.number().int().optional().default(0),
        minStock: z.number().int().optional().default(0),
    })
});

export const stockAdjustmentSchema = z.object({
    body: z.object({
        quantity: z.number().int().refine(val => val !== 0, 'Quantity cannot be zero'),
        type: z.enum(['MANUAL', 'INVOICE']).default('MANUAL'),
        note: z.string().optional(),
    })
});
