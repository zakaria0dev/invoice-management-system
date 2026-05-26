"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockAdjustmentSchema = exports.productSchema = void 0;
const zod_1 = require("zod");
exports.productSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required'),
        description: zod_1.z.string().optional(),
        priceHT: zod_1.z.number().positive('Price must be positive'),
        tva: zod_1.z.number().nonnegative('TVA must be 0 or more'),
        unit: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        stock: zod_1.z.number().int().optional().default(0),
        minStock: zod_1.z.number().int().optional().default(0),
    })
});
exports.stockAdjustmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        quantity: zod_1.z.number().int().refine(val => val !== 0, 'Quantity cannot be zero'),
        type: zod_1.z.enum(['MANUAL', 'INVOICE']).default('MANUAL'),
        note: zod_1.z.string().optional(),
    })
});
