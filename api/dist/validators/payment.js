"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentSchema = void 0;
const zod_1 = require("zod");
exports.paymentSchema = zod_1.z.object({
    body: zod_1.z.object({
        amount: zod_1.z.number().positive(),
        method: zod_1.z.string().min(1),
        invoiceId: zod_1.z.any().optional().nullable().transform(v => (v !== null && v !== undefined && v !== '') ? BigInt(v) : undefined),
        creditNoteId: zod_1.z.any().optional().nullable().transform(v => (v !== null && v !== undefined && v !== '') ? BigInt(v) : undefined),
        date: zod_1.z.string().optional(),
    }).refine(data => data.invoiceId || data.creditNoteId, {
        message: "Either invoiceId or creditNoteId must be provided"
    })
});
