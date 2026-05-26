import { z } from 'zod';

export const companySettingsSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Company name is required'),
        logo: z.string().nullish(),
        address: z.string().nullish(),
        email: z.string().nullish(),
        phone: z.string().nullish(),
        iban: z.string().nullish(),
        tvaNumber: z.string().nullish(),
        defaultTVARate: z.number().nonnegative().nullish(),
        currency: z.literal('MAD').default('MAD'),
        smtpHost: z.string().nullish(),
        smtpPort: z.number().nullish(),
        smtpUser: z.string().nullish(),
        smtpPass: z.string().nullish(),
        defaultTerms: z.string().nullish(),
        defaultNotes: z.string().nullish(),
        legalMentions: z.string().nullish(),
        pdfTheme: z.string().nullish(),
    })
});
