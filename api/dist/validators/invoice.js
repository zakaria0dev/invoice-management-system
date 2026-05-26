"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditNoteSchema = exports.updateInvoiceSchema = exports.updateInvoiceStatusSchema = exports.invoiceSchema = void 0;
const zod_1 = require("zod");
const invoiceItemSchema = zod_1.z.object({
    description: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().positive(),
    price: zod_1.z.number().positive(),
    tax: zod_1.z.number().nonnegative().optional().default(0),
    discount: zod_1.z.number().nonnegative().optional().default(0),
    discountType: zod_1.z.enum(['PERCENTAGE', 'AMOUNT']).optional().default('PERCENTAGE'),
    productId: zod_1.z.any().optional().transform(v => (v !== null && v !== undefined && v !== '') ? BigInt(v) : undefined),
});
exports.invoiceSchema = zod_1.z.object({
    body: zod_1.z.object({
        number: zod_1.z.string().optional(),
        date: zod_1.z.string().optional(),
        dueDate: zod_1.z.string(),
        notes: zod_1.z.string().optional(),
        clientId: zod_1.z.any().transform(v => BigInt(v)),
        currency: zod_1.z.literal('MAD').optional(),
        status: zod_1.z.enum(['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED']).optional(),
        terms: zod_1.z.string().optional(),
        legalMentions: zod_1.z.string().optional(),
        remindersEnabled: zod_1.z.boolean().optional().default(true),
        items: zod_1.z.array(invoiceItemSchema).min(1),
    })
});
exports.updateInvoiceStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID']),
    })
});
exports.updateInvoiceSchema = zod_1.z.object({
    body: exports.invoiceSchema.shape.body.partial()
});
exports.creditNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        reason: zod_1.z.string().optional(),
    }).passthrough()
});
