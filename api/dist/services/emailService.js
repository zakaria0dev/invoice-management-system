"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const encryption_1 = require("../utils/encryption");
const sendEmail = async (options) => {
    // 1) Fetch SMTP settings from database
    const settings = await prisma_1.default.companySettings.findFirst();
    if (!settings || !settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPass) {
        throw new error_1.AppError('SMTP credentials are not configured in Company Settings.', 500);
    }
    // Decrypt the SMTP password
    let decryptedPass = settings.smtpPass;
    try {
        decryptedPass = (0, encryption_1.decrypt)(settings.smtpPass);
    }
    catch (e) {
        console.error('Failed to decrypt SMTP password. It might be stored as plain text.');
    }
    // 2) Create a transporter
    const transporter = nodemailer_1.default.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpPort === 465, // true for 465, false for other ports
        auth: {
            user: settings.smtpUser,
            pass: decryptedPass,
        },
    });
    // 3) Define the email options
    const mailOptions = {
        from: `${settings.name || 'Invoice Manager'} <${settings.smtpUser}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        attachments: options.attachments,
    };
    // 3) Actually send the email
    await transporter.sendMail(mailOptions);
};
exports.sendEmail = sendEmail;
