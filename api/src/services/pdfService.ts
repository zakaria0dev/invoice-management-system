/**
 * PDF Generation Service - Refactored with Modular Templates
 * Unified entry point for invoice, quote, and credit note PDF generation
 *
 * Uses modular components from pdfTemplateComponents.ts for consistent rendering
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import prisma from '../config/prisma';
import { decrypt } from '../utils/encryption';
import {
    renderHeader,
    renderDocumentMetadata,
    renderClientInfo,
    renderTableHeaders,
    renderLineItems,
    renderTotals,
    renderPayments,
    renderRefundsOnInvoice,
    renderLegalMentions,
    renderFooter,
    drawText
} from './pdfTemplateComponents';
import {
    ThemeName,
    DocumentMetadata,
    CompanyInfo,
    ClientInfo,
    LineItem,
    LAYOUT,
    formatCurrency,
    UI_COLORS
} from './pdfTemplateConfig';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map invoice data to internal format
 */
const invoiceToMetadata = (invoice: any): DocumentMetadata => ({
    type: 'INVOICE',
    title: 'FACTURE',
    number: invoice.number,
    date: invoice.date,
    dueDate: invoice.dueDate
});

/**
 * Map quote data to internal format
 */
const quoteToMetadata = (quote: any): DocumentMetadata => ({
    type: 'QUOTE',
    title: 'DEVIS',
    number: quote.number,
    date: quote.date,
    validUntil: quote.validUntil
});

/**
 * Map credit note data to internal format
 */
const creditNoteToMetadata = (creditNote: any): DocumentMetadata => ({
    type: 'CREDIT_NOTE',
    title: 'AVOIR',
    number: creditNote.number,
    date: creditNote.date
});

/**
 * Map client data to internal format
 */
const mapClient = (client: any): ClientInfo => ({
    name: client.name,
    email: client.email,
    address: client.address || '',
    taxId: decrypt(client.ice || '') || undefined,
    vatNumber: undefined
});

/**
 * Map company settings to internal format
 */
const mapCompany = (settings: any): CompanyInfo => {
    console.log('[PDF] Company logo:', settings?.logo ? 'has base64 logo (' + settings.logo.length + ' chars)' : 'no logo');
    console.log('[PDF] Company logoUrl:', settings?.logoUrl || 'no logoUrl');
    return {
        name: settings?.name || 'My Business',
        address: settings?.address || '',
        email: settings?.email || '',
        phone: settings?.phone || '',
        taxId: decrypt(settings?.tvaNumber || '') || undefined,
        vatNumber: undefined,
        iban: decrypt(settings?.iban || '') || undefined,
        swift: undefined,
        logo: settings?.logo || undefined,
        logoUrl: settings?.logoUrl || undefined
    };
};

/**
 * Map invoice items to internal format
 */
const mapItems = (items: any[]): LineItem[] => {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => ({
        description: item.description || 'Product/Service',
        quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity?.toString() || 0),
        price: typeof item.price === 'number' ? item.price : Number(item.price?.toString() || 0),
        tax: typeof item.tax === 'number' ? item.tax : Number(item.tax?.toString() || 0),
        discount: typeof item.discount === 'number' ? item.discount : Number(item.discount?.toString() || 0),
        discountType: item.discountType as 'PERCENTAGE' | 'AMOUNT'
    }));
};

import path from 'path';

/**
 * Load and embed fonts (Supporting Arabic via Arial)
 */
const embedFonts = async (pdfDoc: PDFDocument) => {
    // Use paths relative to the project root for cross-platform compatibility
    const fontPath = path.join(process.cwd(), 'assets', 'fonts', 'arial.ttf');
    const boldFontPath = path.join(process.cwd(), 'assets', 'fonts', 'arialbd.ttf');

    // Register fontkit to handle custom fonts
    pdfDoc.registerFontkit(fontkit);

    try {
        if (fs.existsSync(fontPath) && fs.existsSync(boldFontPath)) {
            console.log('[PDF] Embedding fonts from:', fontPath);
            const fontBytes = fs.readFileSync(fontPath);
            const boldFontBytes = fs.readFileSync(boldFontPath);
            const font = await pdfDoc.embedFont(fontBytes, { subset: true });
            const boldFont = await pdfDoc.embedFont(boldFontBytes, { subset: true });
            console.log('[PDF] Fonts embedded successfully');
            return { font, boldFont };
        } else {
            console.warn('[PDF] Custom fonts not found at:', fontPath);
            console.log('[PDF] Falling back to standard Helvetica (No Arabic support)');
        }
    } catch (e) {
        console.warn('[PDF] Failed to embed custom fonts:', e);
    }

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    return { font, boldFont };
};

// ============================================================================
// PDF GENERATION FUNCTIONS
// ============================================================================

export const generateInvoicePDF = async (
    invoiceOrId: any,
    theme: ThemeName = 'MODERN'
): Promise<Uint8Array> => {
    let invoice: any;
    if (typeof invoiceOrId === 'object' && invoiceOrId.id) {
        invoice = invoiceOrId;
    } else {
        invoice = await prisma.invoice.findUnique({
            where: { id: BigInt(invoiceOrId) },
            include: { client: true, items: true, payments: true }
        });
    }

    if (!invoice) throw new Error(`Invoice not found: ${invoiceOrId}`);

    const settings = await prisma.companySettings.findFirst();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([LAYOUT.pageWidth, LAYOUT.pageHeight]);

    const { font, boldFont } = await embedFonts(pdfDoc);

    const company = mapCompany(settings);
    const client = mapClient(invoice.client);
    const metadata = invoiceToMetadata(invoice);
    const items = mapItems(invoice.items);
    const themeToUse = theme || (settings?.pdfTheme as ThemeName) || 'MODERN';

    // Invoices use the standard theme color (usually professional blue)
    const primaryColor = undefined;

    const { nextY: afterHeader } = await renderHeader(pdfDoc, page, font, boldFont, company, themeToUse, primaryColor);
    const { nextY: afterMeta } = renderDocumentMetadata(page, font, boldFont, metadata, afterHeader, themeToUse, primaryColor);
    const clientStartY = afterMeta + 88; // Position client block higher, relative to meta
    const afterClient = renderClientInfo(page, font, boldFont, client, 'FACTURÉ À', themeToUse, clientStartY, primaryColor);
    const headerRowY = renderTableHeaders(page, font, boldFont, afterClient, themeToUse, primaryColor);

    const { newY, totalHT, totalTVA, totalTTC, totalDiscount } = renderLineItems(
        page, font, boldFont, items,
        headerRowY - LAYOUT.table.headerHeight,
        invoice.currency, themeToUse, primaryColor
    );

    let footerY = renderTotals(page, font, boldFont, newY, totalHT, totalTVA, totalTTC, invoice.currency, themeToUse, false, primaryColor, totalDiscount);

    // Render Refunds if applicable
    let netTotal = totalTTC;
    if ((invoice.status === 'PARTIALLY_REFUNDED' || invoice.status === 'REFUNDED') && invoice.refunds && invoice.refunds.length > 0) {
        const totalRefunded = invoice.refunds.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
        netTotal = Math.max(0, totalTTC - totalRefunded);

        footerY = renderRefundsOnInvoice(page, font, boldFont, footerY, invoice.refunds, invoice.currency, themeToUse, primaryColor);

        // Render Net Total highlight if we have refunds
        const blockW = 220;
        const startX = LAYOUT.pageWidth - LAYOUT.margins.right - blockW;
        const valueX = LAYOUT.pageWidth - LAYOUT.margins.right - 4;

        const netLabel = 'NET À PAYER :';
        const netVal = formatCurrency(netTotal, invoice.currency);
        const netValW = boldFont.widthOfTextAtSize(netVal, 11);

        drawText(page, netLabel, startX, footerY, 11, boldFont, UI_COLORS.darkGray);
        drawText(page, netVal, valueX - netValW, footerY, 11, boldFont, UI_COLORS.darkGray);
        footerY -= 20;
    }

    if ((invoice.status === 'PARTIALLY_PAID' || invoice.status === 'PARTIALLY_REFUNDED') && invoice.payments && invoice.payments.length > 0) {
        const payments = invoice.payments.map((p: any) => ({
            amount: Number(p.amount),
            date: p.date.toISOString ? p.date.toISOString() : new Date(p.date).toISOString(),
            method: p.method
        }));
        footerY = renderPayments(page, font, boldFont, footerY, payments, netTotal, invoice.currency, themeToUse, false, primaryColor);
    }

    const legalText = invoice.legalMentions || invoice.terms || settings?.defaultTerms;
    if (legalText) {
        renderLegalMentions(page, font, boldFont, footerY, legalText, themeToUse, primaryColor);
    }

    renderFooter(page, font, company, 1, 1, themeToUse, primaryColor);
    return await pdfDoc.save();
};

/**
 * Generate Quote PDF
 */
export const generateQuotePDF = async (
    quoteOrId: any,
    theme: ThemeName = 'MODERN'
): Promise<Uint8Array> => {
    let quote: any;
    if (typeof quoteOrId === 'object' && quoteOrId.id) {
        quote = quoteOrId;
    } else {
        quote = await prisma.quote.findUnique({
            where: { id: BigInt(quoteOrId) },
            include: { client: true, items: true }
        });
    }

    if (!quote) throw new Error(`Quote not found: ${quoteOrId}`);

    const settings = await prisma.companySettings.findFirst();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([LAYOUT.pageWidth, LAYOUT.pageHeight]);

    const { font, boldFont } = await embedFonts(pdfDoc);

    const company = mapCompany(settings);
    const client = mapClient(quote.client);
    const metadata = quoteToMetadata(quote);
    const items = mapItems(quote.items);
    const themeToUse = theme || (settings?.pdfTheme as ThemeName) || 'MODERN';

    // Quote specific: Use neutral grey as per user request
    const primaryColor = rgb(0.5, 0.5, 0.5); // Neutral Grey

    const { nextY: afterHeader } = await renderHeader(pdfDoc, page, font, boldFont, company, themeToUse, primaryColor);
    const { nextY: afterMeta } = renderDocumentMetadata(page, font, boldFont, metadata, afterHeader, themeToUse, primaryColor);
    const clientStartY = afterMeta + 88;
    const afterClient = renderClientInfo(page, font, boldFont, client, 'PRÉPARÉ POUR', themeToUse, clientStartY, primaryColor);
    const headerRowY = renderTableHeaders(page, font, boldFont, afterClient, themeToUse, primaryColor);

    const { newY, totalHT, totalTVA, totalTTC, totalDiscount } = renderLineItems(
        page, font, boldFont, items,
        headerRowY - LAYOUT.table.headerHeight,
        quote.currency, themeToUse, primaryColor
    );

    const footerY = renderTotals(page, font, boldFont, newY, totalHT, totalTVA, totalTTC, quote.currency, themeToUse, false, primaryColor, totalDiscount);

    const legalText = quote.notes || settings?.defaultNotes;
    if (legalText) {
        renderLegalMentions(page, font, boldFont, footerY, legalText, themeToUse, primaryColor);
    }

    renderFooter(page, font, company, 1, 1, themeToUse, primaryColor);
    return await pdfDoc.save();
};

/**
 * Generate Credit Note PDF
 */
export const generateCreditNotePDF = async (
    creditNoteOrId: any,
    theme: ThemeName = 'MODERN'
): Promise<Uint8Array> => {
    let creditNote: any;
    if (typeof creditNoteOrId === 'object' && creditNoteOrId.id) {
        creditNote = creditNoteOrId;
    } else {
        creditNote = await prisma.creditNote.findUnique({
            where: { id: BigInt(creditNoteOrId) },
            include: { client: true, invoice: true, items: true }
        });
    }

    if (!creditNote) throw new Error(`Credit note not found: ${creditNoteOrId}`);

    const settings = await prisma.companySettings.findFirst();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([LAYOUT.pageWidth, LAYOUT.pageHeight]);

    const { font, boldFont } = await embedFonts(pdfDoc);

    const company = mapCompany(settings);
    const client = mapClient(creditNote.client);
    const metadata = creditNoteToMetadata(creditNote);
    const items = mapItems(creditNote.items);
    const themeToUse = theme || (settings?.pdfTheme as ThemeName) || 'MODERN';

    const { nextY: afterHeader } = await renderHeader(pdfDoc, page, font, boldFont, company, themeToUse);
    const { nextY: afterMeta } = renderDocumentMetadata(page, font, boldFont, metadata, afterHeader, themeToUse);
    const clientStartY = afterMeta + 88;
    const afterClient = renderClientInfo(page, font, boldFont, client, 'CLIENT', themeToUse, clientStartY);
    const headerRowY = renderTableHeaders(page, font, boldFont, afterClient, themeToUse);

    const { newY, totalHT, totalTVA, totalTTC, totalDiscount } = renderLineItems(
        page, font, boldFont, items,
        headerRowY - LAYOUT.table.headerHeight,
        creditNote.invoice?.currency || 'MAD', themeToUse
    );

    let footerY = renderTotals(
        page, font, boldFont, newY, totalHT, totalTVA, totalTTC,
        creditNote.invoice?.currency || 'MAD', themeToUse, true, undefined, totalDiscount
    );

    // Render payments if any
    const totalPaid = (creditNote.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    if (creditNote.payments && creditNote.payments.length > 0 || totalPaid > 0) {
        const payments = creditNote.payments.map((p: any) => ({
            amount: Number(p.amount),
            date: p.date.toISOString ? p.date.toISOString() : new Date(p.date).toISOString(),
            method: p.method
        }));
        footerY = renderPayments(page, font, boldFont, footerY, payments, totalTTC, creditNote.invoice?.currency || 'MAD', themeToUse, true);
    }

    const legalText = creditNote.notes || settings?.legalMentions;
    if (legalText) {
        renderLegalMentions(page, font, boldFont, footerY, legalText, themeToUse);
    }

    renderFooter(page, font, company, 1, 1, themeToUse);
    return await pdfDoc.save();
};

/**
 * Generate Refund PDF
 */
export const generateRefundPDF = async (
    refundId: any,
    theme: ThemeName = 'MODERN'
): Promise<Uint8Array> => {
    const refund = await prisma.refund.findUnique({
        where: { id: BigInt(refundId) },
        include: {
            invoice: { include: { client: true } },
            items: true
        }
    });

    if (!refund) throw new Error(`Refund not found: ${refundId}`);

    const settings = await prisma.companySettings.findFirst();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([LAYOUT.pageWidth, LAYOUT.pageHeight]);

    const { font, boldFont } = await embedFonts(pdfDoc);

    const company = mapCompany(settings);
    const client = mapClient(refund.invoice.client);
    const metadata: DocumentMetadata = {
        type: 'REFUND',
        number: `RF-${refund.id}`,
        title: 'REMBOURSEMENT',
        date: refund.createdAt.toISOString()
    };
    const items = mapItems(refund.items);
    const themeToUse = theme || (settings?.pdfTheme as ThemeName) || 'MODERN';

    // Refund specific color: Purple
    const primaryColor = rgb(0.5, 0.2, 0.7);

    const { nextY: afterHeader } = await renderHeader(pdfDoc, page, font, boldFont, company, themeToUse, primaryColor);
    const { nextY: afterMeta } = renderDocumentMetadata(page, font, boldFont, metadata, afterHeader, themeToUse, primaryColor);
    const clientStartY = afterMeta + 88;
    const afterClient = renderClientInfo(page, font, boldFont, client, 'CLIENT', themeToUse, clientStartY, primaryColor);
    const headerRowY = renderTableHeaders(page, font, boldFont, afterClient, themeToUse, primaryColor);

    const { newY, totalHT, totalTVA, totalTTC, totalDiscount } = renderLineItems(
        page, font, boldFont, items,
        headerRowY - LAYOUT.table.headerHeight,
        refund.invoice.currency, themeToUse, primaryColor
    );

    const footerY = renderTotals(
        page, font, boldFont, newY, totalHT, totalTVA, totalTTC,
        refund.invoice.currency, themeToUse, true, primaryColor, totalDiscount
    );

    const legalText = refund.reason || settings?.legalMentions;
    if (legalText) {
        renderLegalMentions(page, font, boldFont, footerY, `Motif du remboursement : ${legalText}`, themeToUse, primaryColor);
    }

    renderFooter(page, font, company, 1, 1, themeToUse, primaryColor);
    return await pdfDoc.save();
};
