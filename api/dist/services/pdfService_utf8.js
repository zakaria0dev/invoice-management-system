"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCreditNotePDF = exports.generateQuotePDF = exports.generateInvoicePDF = void 0;
const pdf_lib_1 = require("pdf-lib");
const prisma_1 = __importDefault(require("../config/prisma"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Enhanced color palette with professional gradients
const THEME_COLORS = {
    MODERN: (0, pdf_lib_1.rgb)(0.05, 0.4, 0.65), // Refined blue
    CLASSIC: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2), // Dark gray
    MINIMALIST: (0, pdf_lib_1.rgb)(0.15, 0.15, 0.15), // Soft black
    BOLD: (0, pdf_lib_1.rgb)(0.43, 0.22, 0.79), // Vibrant purple
    ELEGANT: (0, pdf_lib_1.rgb)(0.0, 0.45, 0.55), // Teal
};
const LIGHT_GRAY = (0, pdf_lib_1.rgb)(0.97, 0.97, 0.97);
const MEDIUM_GRAY = (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5);
const BORDER_COLOR = (0, pdf_lib_1.rgb)(0.9, 0.9, 0.9);
const drawHeaderAndFooter = async (pdfDoc, page, font, boldFont, settings, width, height, theme) => {
    const themeColor = THEME_COLORS[theme] || THEME_COLORS.MODERN;
    // Elegant top border/header accent
    page.drawRectangle({
        x: 0,
        y: height - 4,
        width: width,
        height: 4,
        color: themeColor,
    });
    // Draw Logo if exists
    if (settings?.logoUrl) {
        try {
            const logoPath = path_1.default.join(__dirname, '../../', settings.logoUrl);
            if (fs_1.default.existsSync(logoPath)) {
                const logoBytes = fs_1.default.readFileSync(logoPath);
                let logoImage;
                if (settings.logoUrl.toLowerCase().endsWith('.png')) {
                    logoImage = await pdfDoc.embedPng(logoBytes);
                }
                else {
                    logoImage = await pdfDoc.embedJpg(logoBytes);
                }
                // Add subtle background for logo
                page.drawRectangle({
                    x: 45,
                    y: height - 105,
                    width: 90,
                    height: 90,
                    color: LIGHT_GRAY,
                    borderColor: BORDER_COLOR,
                    borderWidth: 1,
                });
                page.drawImage(logoImage, {
                    x: 50,
                    y: height - 100,
                    width: 80,
                    height: 80,
                });
            }
        }
        catch (e) {
            console.error("Failed to embed logo:", e);
        }
    }
    const startX = settings?.logoUrl ? 150 : 50;
    // Company details with better typography
    if (settings?.name) {
        page.drawText(settings.name.toUpperCase(), {
            x: startX,
            y: height - 50,
            size: 20,
            font: boldFont,
            color: themeColor
        });
    }
    if (settings?.address) {
        page.drawText(settings.address, {
            x: startX,
            y: height - 75,
            size: 10,
            font,
            color: MEDIUM_GRAY
        });
    }
    if (settings?.email || settings?.phone) {
        const contactInfo = [settings.email, settings.phone].filter(Boolean).join(' | ');
        page.drawText(contactInfo, {
            x: startX,
            y: height - 90,
            size: 10,
            font,
            color: MEDIUM_GRAY
        });
    }
    // Legal mentions at bottom
    if (settings?.legalMentions) {
        page.drawText(settings.legalMentions, {
            x: 50,
            y: 40,
            size: 8,
            font,
            color: MEDIUM_GRAY,
            maxWidth: 500,
            lineHeight: 12
        });
    }
};
const drawTableHeaders = (page, boldFont, yPos, theme, themeColor) => {
    const headerY = yPos - 25;
    // Header background with gradient effect
    page.drawRectangle({
        x: 50,
        y: headerY,
        width: 500,
        height: 30,
        color: theme === 'BOLD' && themeColor ? themeColor : LIGHT_GRAY
    });
    // Add subtle border at bottom of header
    page.drawLine({
        start: { x: 50, y: headerY },
        end: { x: 550, y: headerY },
        color: BORDER_COLOR,
        thickness: 1
    });
    const textColor = theme === 'BOLD' && themeColor ? (0, pdf_lib_1.rgb)(1, 1, 1) : (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2);
    // Better column distribution
    const columns = [
        { text: 'Description', x: 60, width: 200 },
        { text: 'Qty', x: 270, width: 40 },
        { text: 'Unit Price', x: 320, width: 70 },
        { text: 'Tax %', x: 400, width: 50 },
        { text: 'Total', x: 480, width: 70 }
    ];
    columns.forEach(col => {
        page.drawText(col.text, {
            x: col.x,
            y: headerY + 10,
            size: 11,
            font: boldFont,
            color: textColor
        });
    });
};
const drawItems = (page, font, items, startY, currency, boldFont, themeColor) => {
    let currentY = startY;
    let totalHT = 0;
    let totalTVA = 0;
    items.forEach((item, index) => {
        const qty = Number(item.quantity);
        const price = Number(item.price);
        const tax = Number(item.tax) || 0;
        const lineHT = qty * price;
        const lineTVA = lineHT * (tax / 100);
        totalHT += lineHT;
        totalTVA += lineTVA;
        // Alternate row background for better readability
        if (index % 2 === 0) {
            page.drawRectangle({
                x: 50,
                y: currentY - 15,
                width: 500,
                height: 20,
                color: LIGHT_GRAY,
            });
        }
        // Better text positioning with ellipsis for long descriptions
        const description = item.description.length > 40
            ? item.description.substring(0, 37) + '...'
            : item.description;
        page.drawText(description, {
            x: 60,
            y: currentY - 10,
            size: 10,
            font,
            maxWidth: 200
        });
        page.drawText(qty.toString(), {
            x: 270,
            y: currentY - 10,
            size: 10,
            font
        });
        page.drawText(price.toFixed(2), {
            x: 320,
            y: currentY - 10,
            size: 10,
            font
        });
        page.drawText(`${tax}%`, {
            x: 400,
            y: currentY - 10,
            size: 10,
            font
        });
        page.drawText(lineHT.toFixed(2), {
            x: 480,
            y: currentY - 10,
            size: 10,
            font: index === items.length - 1 ? boldFont : font,
            color: index === items.length - 1 ? themeColor : (0, pdf_lib_1.rgb)(0, 0, 0)
        });
        currentY -= 20;
    });
    return { currentY, totalHT, totalTVA, totalTTC: totalHT + totalTVA };
};
const drawTotals = (page, font, boldFont, currentY, totalHT, totalTVA, totalTTC, currency, themeColor, payments, isCreditNote = false) => {
    let yOffset = currentY - 20;
    // Totals section with better visual separation
    page.drawLine({
        start: { x: 350, y: yOffset + 10 },
        end: { x: 550, y: yOffset + 10 },
        color: BORDER_COLOR,
        thickness: 1
    });
    const totals = [
        { label: 'Subtotal (HT)', value: totalHT.toFixed(2), style: font },
        { label: 'VAT', value: totalTVA.toFixed(2), style: font },
        { label: isCreditNote ? 'Total Refund' : 'Total (TTC)', value: totalTTC.toFixed(2), style: boldFont }
    ];
    totals.forEach((total, index) => {
        const yPos = yOffset - (index * 15);
        page.drawText(total.label, {
            x: 360,
            y: yPos,
            size: total.style === boldFont ? 12 : 11,
            font: total.style,
            color: total.style === boldFont ? themeColor : (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2)
        });
        page.drawText(`${total.value} ${currency}`, {
            x: 480,
            y: yPos,
            size: total.style === boldFont ? 12 : 11,
            font: total.style,
            color: total.style === boldFont ? themeColor : (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2)
        });
    });
    // Payment status if applicable
    if (payments && payments.length > 0 && !isCreditNote) {
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remaining = totalTTC - totalPaid;
        yOffset -= 50;
        // Paid amount
        page.drawText('Amount Paid:', {
            x: 360,
            y: yOffset,
            size: 11,
            font,
            color: (0, pdf_lib_1.rgb)(0.2, 0.6, 0.2)
        });
        page.drawText(`-${totalPaid.toFixed(2)} ${currency}`, {
            x: 480,
            y: yOffset,
            size: 11,
            font,
            color: (0, pdf_lib_1.rgb)(0.2, 0.6, 0.2)
        });
        // Balance due with emphasis
        page.drawText('Balance Due:', {
            x: 360,
            y: yOffset - 15,
            size: 14,
            font: boldFont,
            color: themeColor
        });
        page.drawText(`${remaining.toFixed(2)} ${currency}`, {
            x: 480,
            y: yOffset - 15,
            size: 14,
            font: boldFont,
            color: themeColor
        });
    }
};
const drawSignature = async (pdfDoc, page, font, item, currentY) => {
    if (item.signature) {
        try {
            const base64Data = item.signature.replace(/^data:image\/(png|jpeg);base64,/, "");
            const isPng = item.signature.includes('image/png');
            let signatureImage;
            if (isPng) {
                signatureImage = await pdfDoc.embedPng(base64Data);
            }
            else {
                signatureImage = await pdfDoc.embedJpg(base64Data);
            }
            page.drawText('Signature:', { x: 400, y: currentY - 40, size: 11, font });
            page.drawImage(signatureImage, {
                x: 400,
                y: currentY - 90,
                width: 120,
                height: 40,
            });
            page.drawText(`Signed on: ${item.signatureDate ? new Date(item.signatureDate).toLocaleString() : ''}`, { x: 400, y: currentY - 110, size: 9, font });
            page.drawText(`IP: ${item.signatureIp || 'N/A'}`, { x: 400, y: currentY - 125, size: 9, font });
        }
        catch (e) {
            console.error("Failed to embed signature:", e);
        }
    }
};
const generateInvoicePDF = async (invoice) => {
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    const settings = await prisma_1.default.companySettings.findFirst();
    const theme = (settings?.pdfTheme || 'MODERN').toUpperCase();
    const themeColor = THEME_COLORS[theme] || THEME_COLORS.MODERN;
    // Header
    await drawHeaderAndFooter(pdfDoc, page, font, boldFont, settings, width, height, theme);
    // Document type with nice styling
    page.drawRectangle({
        x: width - 200,
        y: height - 60,
        width: 150,
        height: 40,
        color: themeColor,
    });
    page.drawText('INVOICE', {
        x: width - 190,
        y: height - 45,
        size: 24,
        font: boldFont,
        color: (0, pdf_lib_1.rgb)(1, 1, 1)
    });
    // Invoice details in a clean layout
    const detailsStartX = width - 300;
    const detailsY = height - 100;
    const invoiceDetails = [
        { label: 'Invoice #', value: invoice.number },
        { label: 'Date', value: new Date(invoice.date).toLocaleDateString() },
        { label: 'Due Date', value: new Date(invoice.dueDate).toLocaleDateString() }
    ];
    invoiceDetails.forEach((detail, index) => {
        const yPos = detailsY - (index * 20);
        page.drawText(detail.label, {
            x: detailsStartX,
            y: yPos,
            size: 10,
            font,
            color: MEDIUM_GRAY
        });
        page.drawText(detail.value, {
            x: detailsStartX + 80,
            y: yPos,
            size: 11,
            font: boldFont
        });
    });
    // Bill To section with card-like background
    page.drawRectangle({
        x: 45,
        y: height - 220,
        width: 250,
        height: 100,
        color: LIGHT_GRAY,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
    });
    page.drawText('BILL TO', {
        x: 55,
        y: height - 140,
        size: 12,
        font: boldFont,
        color: themeColor
    });
    page.drawText(invoice.client.name, {
        x: 55,
        y: height - 160,
        size: 14,
        font: boldFont
    });
    page.drawText(invoice.client.email, {
        x: 55,
        y: height - 175,
        size: 10,
        font,
        color: MEDIUM_GRAY
    });
    if (invoice.client.address) {
        page.drawText(invoice.client.address, {
            x: 55,
            y: height - 190,
            size: 10,
            font,
            color: MEDIUM_GRAY
        });
    }
    // Items table
    const tableTop = height - 260;
    drawTableHeaders(page, boldFont, tableTop, theme, themeColor);
    const currency = invoice.currency || 'MAD';
    const { currentY, totalHT, totalTVA, totalTTC } = drawItems(page, font, invoice.items, tableTop - 45, currency, boldFont, themeColor);
    // Totals section
    drawTotals(page, font, boldFont, currentY, totalHT, totalTVA, totalTTC, currency, themeColor, invoice.payments);
    // Notes section with better formatting
    let notesY = currentY - (invoice.payments?.length > 0 ? 180 : 120);
    if (invoice.terms || settings?.defaultTerms) {
        page.drawText('TERMS & CONDITIONS', {
            x: 50,
            y: notesY,
            size: 11,
            font: boldFont,
            color: themeColor
        });
        page.drawText(invoice.terms || settings?.defaultTerms || '', {
            x: 50,
            y: notesY - 20,
            size: 9,
            font,
            color: MEDIUM_GRAY,
            maxWidth: 300,
            lineHeight: 12
        });
        notesY -= 60;
    }
    if (invoice.notes || settings?.defaultNotes) {
        page.drawText('NOTES', {
            x: 50,
            y: notesY,
            size: 11,
            font: boldFont,
            color: themeColor
        });
        page.drawText(invoice.notes || settings?.defaultNotes || '', {
            x: 50,
            y: notesY - 20,
            size: 9,
            font,
            color: MEDIUM_GRAY,
            maxWidth: 300,
            lineHeight: 12
        });
    }
    // Signature section
    await drawSignature(pdfDoc, page, font, invoice, currentY);
    return await pdfDoc.save();
};
exports.generateInvoicePDF = generateInvoicePDF;
const generateQuotePDF = async (quote) => {
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    const settings = await prisma_1.default.companySettings.findFirst();
    const theme = (settings?.pdfTheme || 'MODERN').toUpperCase();
    const themeColor = THEME_COLORS[theme] || THEME_COLORS.MODERN;
    // Header
    await drawHeaderAndFooter(pdfDoc, page, font, boldFont, settings, width, height, theme);
    // Document type with nice styling
    page.drawRectangle({
        x: width - 200,
        y: height - 60,
        width: 150,
        height: 40,
        color: themeColor,
    });
    page.drawText('QUOTE', {
        x: width - 180,
        y: height - 45,
        size: 24,
        font: boldFont,
        color: (0, pdf_lib_1.rgb)(1, 1, 1)
    });
    // Quote details in a clean layout
    const detailsStartX = width - 300;
    const detailsY = height - 100;
    const quoteDetails = [
        { label: 'Quote #', value: quote.number },
        { label: 'Date', value: new Date(quote.date).toLocaleDateString() },
        { label: 'Valid Until', value: new Date(quote.validUntil).toLocaleDateString() }
    ];
    quoteDetails.forEach((detail, index) => {
        const yPos = detailsY - (index * 20);
        page.drawText(detail.label, {
            x: detailsStartX,
            y: yPos,
            size: 10,
            font,
            color: MEDIUM_GRAY
        });
        page.drawText(detail.value, {
            x: detailsStartX + 80,
            y: yPos,
            size: 11,
            font: boldFont
        });
    });
    // Prepare For section with card-like background
    page.drawRectangle({
        x: 45,
        y: height - 220,
        width: 250,
        height: 100,
        color: LIGHT_GRAY,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
    });
    page.drawText('PREPARED FOR', {
        x: 55,
        y: height - 140,
        size: 12,
        font: boldFont,
        color: themeColor
    });
    page.drawText(quote.client.name, {
        x: 55,
        y: height - 160,
        size: 14,
        font: boldFont
    });
    page.drawText(quote.client.email, {
        x: 55,
        y: height - 175,
        size: 10,
        font,
        color: MEDIUM_GRAY
    });
    if (quote.client.address) {
        page.drawText(quote.client.address, {
            x: 55,
            y: height - 190,
            size: 10,
            font,
            color: MEDIUM_GRAY
        });
    }
    // Items table
    const tableTop = height - 260;
    drawTableHeaders(page, boldFont, tableTop, theme, themeColor);
    const currency = quote.currency || 'MAD';
    const { currentY, totalHT, totalTVA, totalTTC } = drawItems(page, font, quote.items, tableTop - 45, currency, boldFont, themeColor);
    // Totals section
    drawTotals(page, font, boldFont, currentY, totalHT, totalTVA, totalTTC, currency, themeColor);
    // Notes section with better formatting
    let notesY = currentY - 120;
    if (quote.notes || settings?.defaultNotes) {
        page.drawText('NOTES', {
            x: 50,
            y: notesY,
            size: 11,
            font: boldFont,
            color: themeColor
        });
        page.drawText(quote.notes || settings?.defaultNotes || '', {
            x: 50,
            y: notesY - 20,
            size: 9,
            font,
            color: MEDIUM_GRAY,
            maxWidth: 300,
            lineHeight: 12
        });
    }
    // Signature section
    await drawSignature(pdfDoc, page, font, quote, currentY);
    return await pdfDoc.save();
};
exports.generateQuotePDF = generateQuotePDF;
const generateCreditNotePDF = async (creditNote) => {
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    const settings = await prisma_1.default.companySettings.findFirst();
    const theme = (settings?.pdfTheme || 'MODERN').toUpperCase();
    const themeColor = THEME_COLORS[theme] || THEME_COLORS.MODERN;
    // Header
    await drawHeaderAndFooter(pdfDoc, page, font, boldFont, settings, width, height, theme);
    // Document type with nice styling
    page.drawRectangle({
        x: width - 250,
        y: height - 60,
        width: 200,
        height: 40,
        color: themeColor,
    });
    page.drawText('CREDIT NOTE', {
        x: width - 240,
        y: height - 45,
        size: 24,
        font: boldFont,
        color: (0, pdf_lib_1.rgb)(1, 1, 1)
    });
    // Details in a clean layout
    const detailsStartX = width - 300;
    const detailsY = height - 100;
    const cdDetails = [
        { label: 'Note #', value: creditNote.number },
        { label: 'Date', value: new Date(creditNote.date).toLocaleDateString() },
    ];
    if (creditNote.linkedInvoice) {
        cdDetails.push({ label: 'Ref Invoice', value: creditNote.linkedInvoice.number });
    }
    cdDetails.forEach((detail, index) => {
        const yPos = detailsY - (index * 20);
        page.drawText(detail.label, {
            x: detailsStartX,
            y: yPos,
            size: 10,
            font,
            color: MEDIUM_GRAY
        });
        page.drawText(detail.value, {
            x: detailsStartX + 80,
            y: yPos,
            size: 11,
            font: boldFont
        });
    });
    // Client section with card-like background
    page.drawRectangle({
        x: 45,
        y: height - 220,
        width: 250,
        height: 100,
        color: LIGHT_GRAY,
        borderColor: BORDER_COLOR,
        borderWidth: 1,
    });
    page.drawText('CLIENT', {
        x: 55,
        y: height - 140,
        size: 12,
        font: boldFont,
        color: themeColor
    });
    page.drawText(creditNote.client.name, {
        x: 55,
        y: height - 160,
        size: 14,
        font: boldFont
    });
    page.drawText(creditNote.client.email, {
        x: 55,
        y: height - 175,
        size: 10,
        font,
        color: MEDIUM_GRAY
    });
    if (creditNote.client.address) {
        page.drawText(creditNote.client.address, {
            x: 55,
            y: height - 190,
            size: 10,
            font,
            color: MEDIUM_GRAY
        });
    }
    // Items table
    const tableTop = height - 260;
    drawTableHeaders(page, boldFont, tableTop, theme, themeColor);
    const currency = creditNote.linkedInvoice?.currency || 'MAD';
    const { currentY, totalHT, totalTVA, totalTTC } = drawItems(page, font, creditNote.items, tableTop - 45, currency, boldFont, themeColor);
    // Totals section (Passing true for isCreditNote)
    drawTotals(page, font, boldFont, currentY, totalHT, totalTVA, totalTTC, currency, themeColor, [], true);
    // Notes section with better formatting
    let notesY = currentY - 120;
    if (creditNote.notes) {
        page.drawText('NOTES', {
            x: 50,
            y: notesY,
            size: 11,
            font: boldFont,
            color: themeColor
        });
        page.drawText(creditNote.notes, {
            x: 50,
            y: notesY - 20,
            size: 9,
            font,
            color: MEDIUM_GRAY,
            maxWidth: 300,
            lineHeight: 12
        });
    }
    return await pdfDoc.save();
};
exports.generateCreditNotePDF = generateCreditNotePDF;
