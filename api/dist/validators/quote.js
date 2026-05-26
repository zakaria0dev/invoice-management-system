"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQuoteSchema = exports.updateQuoteStatusSchema = exports.quoteSchema = void 0;
const zod_1 = require("zod");
const QUOTE_STATUSES = ['DRAFT', 'SENT', 'VALIDATED', 'REJECTED', 'CONVERTED', 'CANCELLED'];
exports.quoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        number: zod_1.z.string().optional(),
        date: zod_1.z.string().optional(),
        validUntil: zod_1.z.string(),
        clientId: zod_1.z.any().refine((v) => v !== "" && v !== null && v !== undefined, { message: "Client is required" }).transform((v) => {
            try {
                return BigInt(v);
            }
            catch {
                return v;
            }
        }),
        notes: zod_1.z.string().optional(),
        status: zod_1.z.enum(QUOTE_STATUSES).optional().default('DRAFT'),
        currency: zod_1.z.literal('MAD').optional(),
        linkedInvoiceId: zod_1.z.any().optional().transform(v => {
            if (!v || v === "")
                return undefined;
            try {
                return BigInt(v);
            }
            catch {
                return undefined;
            }
        }),
        items: zod_1.z.array(zod_1.z.object({
            productId: zod_1.z.any().optional().transform(v => {
                if (!v || v === "")
                    return undefined;
                try {
                    return BigInt(v);
                }
                catch {
                    return undefined;
                }
            }),
            description: zod_1.z.string(),
            quantity: zod_1.z.number().int().min(1),
            price: zod_1.z.number().min(0),
            tax: zod_1.z.number().default(0),
            discount: zod_1.z.number().nonnegative().optional().default(0),
            discountType: zod_1.z.enum(['PERCENTAGE', 'AMOUNT']).optional().default('PERCENTAGE'),
        })),
    })
});
exports.updateQuoteStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(QUOTE_STATUSES),
    })
});
exports.updateQuoteSchema = zod_1.z.object({
    body: exports.quoteSchema.shape.body.partial()
});
