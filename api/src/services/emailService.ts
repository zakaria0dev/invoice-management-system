import nodemailer from 'nodemailer';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error';
import { decrypt } from '../utils/encryption';

export const sendEmail = async (options: {
    email: string;
    subject: string;
    message: string;
    attachments?: any[];
}) => {
    // 1) Fetch SMTP settings from database
    const settings = await prisma.companySettings.findFirst();

    if (!settings || !settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPass) {
        throw new AppError('SMTP credentials are not configured in Company Settings.', 500);
    }

    // Decrypt the SMTP password
    let decryptedPass = settings.smtpPass;
    try {
        decryptedPass = decrypt(settings.smtpPass);
    } catch (e) {
        console.error('Failed to decrypt SMTP password. It might be stored as plain text.');
    }

    // 2) Create a transporter
    const transporter = nodemailer.createTransport({
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
