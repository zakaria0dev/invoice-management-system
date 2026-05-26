import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error';
import { companySettingsSchema } from '../validators/companySettings';
import { encrypt, decrypt } from '../utils/encryption';
import path from 'path';
import fs from 'fs';
import { upload } from '../middleware/upload';

export const getCompanySettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let settings = await prisma.companySettings.findFirst();

        // Initialize with empty if not exists
        if (!settings) {
            settings = await prisma.companySettings.create({
                data: { name: 'My Business' },
            });
        }

        // Create plain object to avoid Prisma proxy issues
        const settingsObj = {
            id: settings.id,
            name: settings.name,
            email: settings.email,
            phone: settings.phone,
            address: settings.address,
            iban: decrypt(settings.iban || ''),
            tvaNumber: decrypt(settings.tvaNumber || ''),
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpUser: settings.smtpUser,
            smtpPass: decrypt(settings.smtpPass || ''),
            defaultTerms: settings.defaultTerms,
            defaultNotes: settings.defaultNotes,
            legalMentions: settings.legalMentions,
            defaultTVARate: settings.defaultTVARate,
            pdfTheme: settings.pdfTheme,
            currency: settings.currency,
            logo: settings.logo,
            logoUrl: settings.logoUrl,


        };

        res.status(200).json({
            status: 'success',
            data: { settings: settingsObj },
        });
    } catch (error) {
        next(error);
    }
};

export const updateCompanySettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = companySettingsSchema.shape.body.safeParse(req.body);
        if (!result.success) {
            return next(new AppError(result.error.issues[0].message, 400));
        }

        const data: any = { ...result.data };
        if (data.iban) data.iban = encrypt(data.iban);
        if (data.tvaNumber) data.tvaNumber = encrypt(data.tvaNumber);
        if (data.smtpPass) data.smtpPass = encrypt(data.smtpPass);

        // Remove explicit nulls for fields that Prisma expects to be string | undefined
        // especially for fields with @default in schema.prisma
        if (data.pdfTheme === null) delete data.pdfTheme;
        if (data.currency === null) delete data.currency;

        let settings = await prisma.companySettings.findFirst();

        if (!settings) {
            settings = await prisma.companySettings.create({
                data,
            });
        } else {
            settings = await prisma.companySettings.update({
                where: { id: settings.id },
                data,
            });
        }

        // Create plain object to avoid Prisma proxy issues
        const settingsObj = {
            id: settings.id,
            name: settings.name,
            email: settings.email,
            phone: settings.phone,
            address: settings.address,
            iban: decrypt(settings.iban || ''),
            tvaNumber: decrypt(settings.tvaNumber || ''),
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpUser: settings.smtpUser,
            smtpPass: decrypt(settings.smtpPass || ''),
            defaultTerms: settings.defaultTerms,
            defaultNotes: settings.defaultNotes,
            legalMentions: settings.legalMentions,
            defaultTVARate: settings.defaultTVARate,
            pdfTheme: settings.pdfTheme,
            currency: settings.currency,
            logo: settings.logo,
            logoUrl: settings.logoUrl,


        };

        res.status(200).json({
            status: 'success',
            data: { settings: settingsObj },
        });
    } catch (error) {
        next(error);
    }
};
export const uploadLogo = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return next(new AppError('Please upload a file', 400));
        }

        let settings = await prisma.companySettings.findFirst();
        const logoUrl = `/uploads/${req.file.filename}`;

        // Read the file and convert to base64
        const filePath = path.join(__dirname, '../../uploads', req.file.filename);
        const fileBuffer = fs.readFileSync(filePath);
        const logoBase64 = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;

        if (!settings) {
            settings = await prisma.companySettings.create({
                data: { name: 'My Business', logo: logoBase64, logoUrl },
            });
        } else {
            settings = await prisma.companySettings.update({
                where: { id: settings.id },
                data: { logo: logoBase64, logoUrl },
            });
        }

        // Return the full updated settings
        const updatedSettings = await prisma.companySettings.findUnique({
            where: { id: settings.id },
        });

        // Create plain object to avoid Prisma proxy issues
        const settingsObj = {
            id: updatedSettings!.id,
            name: updatedSettings!.name,
            email: updatedSettings!.email,
            phone: updatedSettings!.phone,
            address: updatedSettings!.address,
            iban: decrypt(updatedSettings!.iban || ''),
            tvaNumber: decrypt(updatedSettings!.tvaNumber || ''),
            smtpHost: updatedSettings!.smtpHost,
            smtpPort: updatedSettings!.smtpPort,
            smtpUser: updatedSettings!.smtpUser,
            smtpPass: decrypt(updatedSettings!.smtpPass || ''),
            defaultTerms: updatedSettings!.defaultTerms,
            defaultNotes: updatedSettings!.defaultNotes,
            legalMentions: updatedSettings!.legalMentions,
            defaultTVARate: updatedSettings!.defaultTVARate,
            pdfTheme: updatedSettings!.pdfTheme,
            currency: updatedSettings!.currency,
            logo: updatedSettings!.logo,
            logoUrl: updatedSettings!.logoUrl,
        };

        res.status(200).json({
            status: 'success',
            data: { settings: settingsObj },
        });
    } catch (error) {
        next(error);
    }
};
