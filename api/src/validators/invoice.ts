import { z } from 'zod';

const invoiceItemSchema = z.object({
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    tax: z.number().nonnegative().optional().default(0),
    discount: z.number().nonnegative().optional().default(0),
    discountType: z.enum(['PERCENTAGE', 'AMOUNT']).optional().default('PERCENTAGE'),
    productId: z.any().optional().transform(v => (v !== null && v !== undefined && v !== '') ? BigInt(v) : undefined),
});

export const invoiceSchema = z.object({
    body: z.object({
        number: z.string().optional(),
        date: z.string().optional(),
        dueDate: z.string(),
        notes: z.string().optional(),
        clientId: z.any().transform(v => BigInt(v)),
        currency: z.literal('MAD').optional(),
        status: z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED']).optional(),
        terms: z.string().optional(),
        legalMentions: z.string().optional(),
        remindersEnabled: z.boolean().optional().default(true),
        items: z.array(invoiceItemSchema).min(1),
    })
});

export const updateInvoiceStatusSchema = z.object({
    body: z.object({
        status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID']),
    })
});

export const updateInvoiceSchema = z.object({
    body: invoiceSchema.shape.body.partial()
});

export const creditNoteSchema = z.object({
    body: z.object({
        reason: z.string().optional(),
    }).passthrough()
});

