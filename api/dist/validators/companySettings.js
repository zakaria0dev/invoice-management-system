"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companySettingsSchema = void 0;
const zod_1 = require("zod");
exports.companySettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Company name is required'),
        logo: zod_1.z.string().nullish(),
        address: zod_1.z.string().nullish(),
        email: zod_1.z.string().nullish(),
        phone: zod_1.z.string().nullish(),
        iban: zod_1.z.string().nullish(),
        tvaNumber: zod_1.z.string().nullish(),
        defaultTVARate: zod_1.z.number().nonnegative().nullish(),
        currency: zod_1.z.literal('MAD').default('MAD'),
        smtpHost: zod_1.z.string().nullish(),
        smtpPort: zod_1.z.number().nullish(),
        smtpUser: zod_1.z.string().nullish(),
        smtpPass: zod_1.z.string().nullish(),
        defaultTerms: zod_1.z.string().nullish(),
        defaultNotes: zod_1.z.string().nullish(),
        legalMentions: zod_1.z.string().nullish(),
        pdfTheme: zod_1.z.string().nullish(),
    })
});
