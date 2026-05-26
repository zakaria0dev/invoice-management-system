import { z } from 'zod';

const QUOTE_STATUSES = ['DRAFT', 'SENT', 'VALIDATED', 'REJECTED', 'CONVERTED', 'CANCELLED'] as const;

export const quoteSchema = z.object({
    body: z.object({
        number: z.string().optional(),
        date: z.string().optional(),
        validUntil: z.string(),
        clientId: z.any().refine((v) => v !== "" && v !== null && v !== undefined, { message: "Client is required" }).transform((v) => {
            try { return BigInt(v); } catch { return v; }
        }),
        notes: z.string().optional(),
        status: z.enum(QUOTE_STATUSES).optional().default('DRAFT'),
        currency: z.literal('MAD').optional(),
        linkedInvoiceId: z.any().optional().transform(v => {
            if (!v || v === "") return undefined;
            try { return BigInt(v); } catch { return undefined; }
        }),
        items: z.array(z.object({
            productId: z.any().optional().transform(v => {
                if (!v || v === "") return undefined;
                try { return BigInt(v); } catch { return undefined; }
            }),
            description: z.string(),
            quantity: z.number().int().min(1),
            price: z.number().min(0),
            tax: z.number().default(0),
            discount: z.number().nonnegative().optional().default(0),
            discountType: z.enum(['PERCENTAGE', 'AMOUNT']).optional().default('PERCENTAGE'),
        })),
    })
});

export const updateQuoteStatusSchema = z.object({
    body: z.object({
        status: z.enum(QUOTE_STATUSES),
    })
});

export const updateQuoteSchema = z.object({
    body: quoteSchema.shape.body.partial()
});
