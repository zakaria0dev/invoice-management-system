"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLogo = exports.updateCompanySettings = exports.getCompanySettings = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const companySettings_1 = require("../validators/companySettings");
const encryption_1 = require("../utils/encryption");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const getCompanySettings = async (req, res, next) => {
    try {
        let settings = await prisma_1.default.companySettings.findFirst();
        // Initialize with empty if not exists
        if (!settings) {
            settings = await prisma_1.default.companySettings.create({
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
            iban: (0, encryption_1.decrypt)(settings.iban || ''),
            tvaNumber: (0, encryption_1.decrypt)(settings.tvaNumber || ''),
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpUser: settings.smtpUser,
            smtpPass: (0, encryption_1.decrypt)(settings.smtpPass || ''),
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
    }
    catch (error) {
        next(error);
    }
};
exports.getCompanySettings = getCompanySettings;
const updateCompanySettings = async (req, res, next) => {
    try {
        const result = companySettings_1.companySettingsSchema.shape.body.safeParse(req.body);
        if (!result.success) {
            return next(new error_1.AppError(result.error.issues[0].message, 400));
        }
        const data = { ...result.data };
        if (data.iban)
            data.iban = (0, encryption_1.encrypt)(data.iban);
        if (data.tvaNumber)
            data.tvaNumber = (0, encryption_1.encrypt)(data.tvaNumber);
        if (data.smtpPass)
            data.smtpPass = (0, encryption_1.encrypt)(data.smtpPass);
        // Remove explicit nulls for fields that Prisma expects to be string | undefined
        // especially for fields with @default in schema.prisma
        if (data.pdfTheme === null)
            delete data.pdfTheme;
        if (data.currency === null)
            delete data.currency;
        let settings = await prisma_1.default.companySettings.findFirst();
        if (!settings) {
            settings = await prisma_1.default.companySettings.create({
                data,
            });
        }
        else {
            settings = await prisma_1.default.companySettings.update({
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
            iban: (0, encryption_1.decrypt)(settings.iban || ''),
            tvaNumber: (0, encryption_1.decrypt)(settings.tvaNumber || ''),
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpUser: settings.smtpUser,
            smtpPass: (0, encryption_1.decrypt)(settings.smtpPass || ''),
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateCompanySettings = updateCompanySettings;
const uploadLogo = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new error_1.AppError('Please upload a file', 400));
        }
        let settings = await prisma_1.default.companySettings.findFirst();
        const logoUrl = `/uploads/${req.file.filename}`;
        // Read the file and convert to base64
        const filePath = path_1.default.join(__dirname, '../../uploads', req.file.filename);
        const fileBuffer = fs_1.default.readFileSync(filePath);
        const logoBase64 = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
        if (!settings) {
            settings = await prisma_1.default.companySettings.create({
                data: { name: 'My Business', logo: logoBase64, logoUrl },
            });
        }
        else {
            settings = await prisma_1.default.companySettings.update({
                where: { id: settings.id },
                data: { logo: logoBase64, logoUrl },
            });
        }
        // Return the full updated settings
        const updatedSettings = await prisma_1.default.companySettings.findUnique({
            where: { id: settings.id },
        });
        // Create plain object to avoid Prisma proxy issues
        const settingsObj = {
            id: updatedSettings.id,
            name: updatedSettings.name,
            email: updatedSettings.email,
            phone: updatedSettings.phone,
            address: updatedSettings.address,
            iban: (0, encryption_1.decrypt)(updatedSettings.iban || ''),
            tvaNumber: (0, encryption_1.decrypt)(updatedSettings.tvaNumber || ''),
            smtpHost: updatedSettings.smtpHost,
            smtpPort: updatedSettings.smtpPort,
            smtpUser: updatedSettings.smtpUser,
            smtpPass: (0, encryption_1.decrypt)(updatedSettings.smtpPass || ''),
            defaultTerms: updatedSettings.defaultTerms,
            defaultNotes: updatedSettings.defaultNotes,
            legalMentions: updatedSettings.legalMentions,
            defaultTVARate: updatedSettings.defaultTVARate,
            pdfTheme: updatedSettings.pdfTheme,
            currency: updatedSettings.currency,
            logo: updatedSettings.logo,
            logoUrl: updatedSettings.logoUrl,
        };
        res.status(200).json({
            status: 'success',
            data: { settings: settingsObj },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadLogo = uploadLogo;
