import { z } from 'zod';

export const paymentSchema = z.object({
    body: z.object({
        amount: z.number().positive(),
        method: z.string().min(1),
        invoiceId: z.any().optional().nullable().transform(v => (v !== null && v !== undefined && v !== '') ? BigInt(v) : undefined),
        creditNoteId: z.any().optional().nullable().transform(v => (v !== null && v !== undefined && v !== '') ? BigInt(v) : undefined),
        date: z.string().optional(),
    }).refine(data => data.invoiceId || data.creditNoteId, {
        message: "Either invoiceId or creditNoteId must be provided"
    })
});
