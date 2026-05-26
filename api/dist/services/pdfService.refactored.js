"use strict";
/**
 * PDF Generation Service - Refactored with Modular Templates
 * Unified entry point for invoice, quote, and credit note PDF generation
 *
 * Uses modular components from pdfTemplateComponents.ts for consistent rendering
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCreditNotePDF = exports.generateQuotePDF = exports.generateInvoicePDF = void 0;
const pdf_lib_1 = require("pdf-lib");
const prisma_1 = __importDefault(require("../config/prisma"));
const pdfTemplateComponents_1 = require("./pdfTemplateComponents");
const pdfTemplateConfig_1 = require("./pdfTemplateConfig");
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Map invoice data to internal format
 */
const invoiceToMetadata = (invoice) => ({
    type: 'INVOICE',
    title: 'INVOICE',
    number: invoice.number,
    date: invoice.date,
    dueDate: invoice.dueDate
});
/**
 * Map quote data to internal format
 */
const quoteToMetadata = (quote) => ({
    type: 'QUOTE',
    title: 'QUOTE',
    number: quote.number,
    date: quote.date,
    validUntil: quote.validUntil
});
/**
 * Map credit note data to internal format
 */
const creditNoteToMetadata = (creditNote) => ({
    type: 'CREDIT_NOTE',
    title: 'CREDIT NOTE',
    number: creditNote.number,
    date: creditNote.date
});
/**
 * Map client data to internal format
 */
const mapClient = (client) => ({
    name: client.name,
    email: client.email,
    address: client.address || '',
    taxId: client.ice || undefined,
    vatNumber: undefined
});
/**
 * Map company settings to internal format
 */
const mapCompany = (settings) => ({
    name: settings?.name || 'My Business',
    address: settings?.address || '',
    email: settings?.email || '',
    phone: settings?.phone || '',
    taxId: settings?.tvaNumber || undefined,
    vatNumber: undefined,
    iban: settings?.iban || undefined,
    swift: undefined,
    logo: settings?.logo || undefined,
    logoUrl: settings?.logoUrl || undefined
});
/**
 * Map invoice items to internal format
 */
const mapItems = (items) => {
    return items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price),
        tax: Number(item.tax) || 0
    }));
};
// ============================================================================
// PDF GENERATION FUNCTIONS
// ============================================================================
/**
 * Generate Invoice PDF
 * @param invoiceId - Database invoice ID
 * @param theme - Visual theme (MODERN, CLASSIC, MINIMALIST, BOLD, ELEGANT)
 * @returns Uint8Array - PDF binary data
 */
const generateInvoicePDF = async (invoiceId, theme = 'MODERN') => {
    // Fetch invoice data with relationships
    const invoice = await prisma_1.default.invoice.findUnique({
        where: { id: Number(invoiceId) },
        include: {
            client: true,
            items: true,
            payments: true,
        }
    });
    if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
    }
    // Fetch company settings
    const settings = await prisma_1.default.companySettings.findFirst();
    // Create PDF document
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page = pdfDoc.addPage([pdfTemplateConfig_1.LAYOUT.pageWidth, pdfTemplateConfig_1.LAYOUT.pageHeight]);
    // Embed fonts
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    // Map data to internal formats
    const company = mapCompany(settings);
    const client = mapClient(invoice.client);
    const metadata = invoiceToMetadata(invoice);
    const items = mapItems(invoice.items);
    const themeToUse = theme || settings?.pdfTheme || 'MODERN';
    // Render sections
    await (0, pdfTemplateComponents_1.renderHeader)(pdfDoc, page, font, boldFont, company, themeToUse);
    let currentY = pdfTemplateConfig_1.LAYOUT.pageHeight - pdfTemplateConfig_1.LAYOUT.header.height - pdfTemplateConfig_1.LAYOUT.spacing.section;
    (0, pdfTemplateComponents_1.renderDocumentMetadata)(page, font, boldFont, metadata, themeToUse);
    currentY = pdfTemplateConfig_1.LAYOUT.pageHeight - pdfTemplateConfig_1.LAYOUT.header.height - 180;
    currentY = (0, pdfTemplateComponents_1.renderClientInfo)(page, font, boldFont, client, 'BILL TO', themeToUse);
    const headerY = (0, pdfTemplateComponents_1.renderTableHeaders)(page, font, boldFont, currentY, themeToUse);
    const { newY, totalHT, totalTVA, totalTTC } = (0, pdfTemplateComponents_1.renderLineItems)(page, font, boldFont, items, headerY - pdfTemplateConfig_1.LAYOUT.table.headerHeight - 10, invoice.currency, themeToUse);
    let footerY = (0, pdfTemplateComponents_1.renderTotals)(page, font, boldFont, newY, totalHT, totalTVA, totalTTC, invoice.currency, themeToUse, false);
    if (invoice.payments && invoice.payments.length > 0) {
        const payments = invoice.payments.map(p => ({
            amount: Number(p.amount),
            date: p.date.toISOString(),
            method: p.method
        }));
        footerY = (0, pdfTemplateComponents_1.renderPayments)(page, font, boldFont, footerY, payments, totalTTC, invoice.currency, themeToUse);
    }
    // Render legal mentions if available
    const legalText = invoice.legalMentions || invoice.terms || settings?.defaultTerms;
    if (legalText) {
        (0, pdfTemplateComponents_1.renderLegalMentions)(page, font, boldFont, footerY, legalText, themeToUse);
    }
    // Render footer
    (0, pdfTemplateComponents_1.renderFooter)(page, font, company, 1, 1, themeToUse);
    return await pdfDoc.save();
};
exports.generateInvoicePDF = generateInvoicePDF;
/**
 * Generate Quote PDF
 * @param quoteId - Database quote ID
 * @param theme - Visual theme (MODERN, CLASSIC, MINIMALIST, BOLD, ELEGANT)
 * @returns Uint8Array - PDF binary data
 */
const generateQuotePDF = async (quoteId, theme = 'MODERN') => {
    // Fetch quote data with relationships
    const quote = await prisma_1.default.quote.findUnique({
        where: { id: Number(quoteId) },
        include: {
            client: true,
            items: true,
        }
    });
    if (!quote) {
        throw new Error(`Quote not found: ${quoteId}`);
    }
    // Fetch company settings
    const settings = await prisma_1.default.companySettings.findFirst();
    // Create PDF document
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page = pdfDoc.addPage([pdfTemplateConfig_1.LAYOUT.pageWidth, pdfTemplateConfig_1.LAYOUT.pageHeight]);
    // Embed fonts
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    // Map data to internal formats
    const company = mapCompany(settings);
    const client = mapClient(quote.client);
    const metadata = quoteToMetadata(quote);
    const items = mapItems(quote.items);
    const themeToUse = theme || settings?.pdfTheme || 'MODERN';
    // Render sections
    await (0, pdfTemplateComponents_1.renderHeader)(pdfDoc, page, font, boldFont, company, themeToUse);
    let currentY = pdfTemplateConfig_1.LAYOUT.pageHeight - pdfTemplateConfig_1.LAYOUT.header.height - pdfTemplateConfig_1.LAYOUT.spacing.section;
    (0, pdfTemplateComponents_1.renderDocumentMetadata)(page, font, boldFont, metadata, themeToUse);
    currentY = pdfTemplateConfig_1.LAYOUT.pageHeight - pdfTemplateConfig_1.LAYOUT.header.height - 180;
    currentY = (0, pdfTemplateComponents_1.renderClientInfo)(page, font, boldFont, client, 'PREPARED FOR', themeToUse);
    const headerY = (0, pdfTemplateComponents_1.renderTableHeaders)(page, font, boldFont, currentY, themeToUse);
    const { newY, totalHT, totalTVA, totalTTC } = (0, pdfTemplateComponents_1.renderLineItems)(page, font, boldFont, items, headerY - pdfTemplateConfig_1.LAYOUT.table.headerHeight - 10, quote.currency, themeToUse);
    let footerY = (0, pdfTemplateComponents_1.renderTotals)(page, font, boldFont, newY, totalHT, totalTVA, totalTTC, quote.currency, themeToUse, false);
    // Render legal mentions if available
    const legalText = quote.notes || settings?.defaultNotes;
    if (legalText) {
        (0, pdfTemplateComponents_1.renderLegalMentions)(page, font, boldFont, footerY, legalText, themeToUse);
    }
    // Render footer
    (0, pdfTemplateComponents_1.renderFooter)(page, font, company, 1, 1, themeToUse);
    return await pdfDoc.save();
};
exports.generateQuotePDF = generateQuotePDF;
/**
 * Generate Credit Note PDF
 * @param creditNoteId - Database credit note ID
 * @param theme - Visual theme (MODERN, CLASSIC, MINIMALIST, BOLD, ELEGANT)
 * @returns Uint8Array - PDF binary data
 */
const generateCreditNotePDF = async (creditNoteId, theme = 'MODERN') => {
    // Fetch credit note data with relationships
    const creditNote = await prisma_1.default.creditNote.findUnique({
        where: { id: Number(creditNoteId) },
        include: {
            client: true,
            invoice: true,
            items: true,
        }
    });
    if (!creditNote) {
        throw new Error(`Credit note not found: ${creditNoteId}`);
    }
    // Fetch company settings
    const settings = await prisma_1.default.companySettings.findFirst();
    // Create PDF document
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page = pdfDoc.addPage([pdfTemplateConfig_1.LAYOUT.pageWidth, pdfTemplateConfig_1.LAYOUT.pageHeight]);
    // Embed fonts
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    // Map data to internal formats
    const company = mapCompany(settings);
    const client = mapClient(creditNote.client);
    const metadata = creditNoteToMetadata(creditNote);
    const items = mapItems(creditNote.items);
    const themeToUse = theme || settings?.pdfTheme || 'MODERN';
    // Render sections
    await (0, pdfTemplateComponents_1.renderHeader)(pdfDoc, page, font, boldFont, company, themeToUse);
    let currentY = pdfTemplateConfig_1.LAYOUT.pageHeight - pdfTemplateConfig_1.LAYOUT.header.height - pdfTemplateConfig_1.LAYOUT.spacing.section;
    (0, pdfTemplateComponents_1.renderDocumentMetadata)(page, font, boldFont, metadata, themeToUse);
    currentY = pdfTemplateConfig_1.LAYOUT.pageHeight - pdfTemplateConfig_1.LAYOUT.header.height - 180;
    currentY = (0, pdfTemplateComponents_1.renderClientInfo)(page, font, boldFont, client, 'CLIENT', themeToUse);
    const headerY = (0, pdfTemplateComponents_1.renderTableHeaders)(page, font, boldFont, currentY, themeToUse);
    const { newY, totalHT, totalTVA, totalTTC } = (0, pdfTemplateComponents_1.renderLineItems)(page, font, boldFont, items, headerY - pdfTemplateConfig_1.LAYOUT.table.headerHeight - 10, creditNote.invoice?.currency || 'MAD', themeToUse);
    let footerY = (0, pdfTemplateComponents_1.renderTotals)(page, font, boldFont, newY, totalHT, totalTVA, totalTTC, creditNote.invoice?.currency || 'MAD', themeToUse, true // isCreditNote = true
    );
    // Render legal mentions if available
    const legalText = creditNote.notes || settings?.legalMentions;
    if (legalText) {
        (0, pdfTemplateComponents_1.renderLegalMentions)(page, font, boldFont, footerY, legalText, themeToUse);
    }
    // Render footer
    (0, pdfTemplateComponents_1.renderFooter)(page, font, company, 1, 1, themeToUse);
    return await pdfDoc.save();
};
exports.generateCreditNotePDF = generateCreditNotePDF;
