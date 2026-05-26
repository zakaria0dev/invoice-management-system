import { calculateDocumentTotals } from '../utils/calculations';
import { PDFPage, PDFDocument, PDFFont, rgb } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import {
    THEME_COLORS,
    ThemeName,
    UI_COLORS,
    TYPOGRAPHY,
    LAYOUT,
    ClientInfo,
    CompanyInfo,
    LineItem,
    DocumentMetadata,
    PaymentInfo,
    getThemeConfig,
    getTableColumnPositions,
    formatCurrency,
    formatPercentage,
    truncateText,
    formatDate
} from './pdfTemplateConfig';

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface LayoutResult {
    nextY: number;
}

interface Fonts {
    regular: PDFFont;
    bold: PDFFont;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Draw a filled rectangle with optional rounded appearance (simulated via border).
 */
const drawCard = (
    page: PDFPage,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: any,
    borderColor?: any,
    borderWidth: number = 0.5
): void => {
    page.drawRectangle({ x, y, width, height, color: fillColor });
    if (borderColor) {
        page.drawRectangle({
            x, y, width, height,
            borderColor,
            borderWidth,
            color: undefined,
        });
    }
};

/**
 * Draw text safely, clamping to page bounds.
 */
export const drawText = (
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    size: number,
    font: PDFFont,
    color: any,
    maxWidth?: number
): void => {
    if (!text || y < LAYOUT.margins.bottom) return;
    const opts: any = { x, y, size, font, color };
    if (maxWidth) {
        opts.maxWidth = maxWidth;
        opts.lineHeight = size + 4;
    }
    page.drawText(text, opts);
};

/**
 * Render a section label (e.g. "FACTURÉ À") with a colored left accent bar.
 */
const drawSectionLabel = (
    page: PDFPage,
    label: string,
    x: number,
    y: number,
    font: PDFFont,
    color: any
): void => {
    // Left accent bar
    page.drawRectangle({ x, y: y - 2, width: 3, height: 14, color });
    drawText(page, label, x + 8, y, TYPOGRAPHY.footnote.size, font, color);
};

// ============================================================================
// HEADER COMPONENT
// ============================================================================

/**
 * Render the document header: top accent stripe, company logo, company info.
 * @returns { nextY } — Y position after the header for the next component.
 */
export const renderHeader = async (
    pdfDoc: PDFDocument,
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    company: CompanyInfo,
    theme: ThemeName = 'MODERN',
    primaryColor?: any
): Promise<LayoutResult> => {
    const themeConfig = getThemeConfig(theme, primaryColor);
    const primary = themeConfig.primary;
    const fonts: Fonts = { regular: font, bold: boldFont };

    // ── Header background card (white) ───────────────────────────────────────
    const headerBgColor = UI_COLORS.white;
    const headerHeight = 110;
    const headerTop = LAYOUT.pageHeight - 5;

    page.drawRectangle({
        x: 0,
        y: headerTop - headerHeight,
        width: LAYOUT.pageWidth,
        height: headerHeight,
        color: headerBgColor,
    });

    let logoWidth = 0;
    const logoX = LAYOUT.margins.left;
    const logoY = headerTop - headerHeight + 10;
    const logoSize = 88;

    // ── Logo rendering ───────────────────────────────────────────────────────
    console.log('[PDF Header] Company logo:', company.logo ? 'has base64 (' + company.logo.substring(0, 50) + '...)' : 'no logo');
    console.log('[PDF Header] Company logoUrl:', company.logoUrl || 'no logoUrl');
    if (company.logo || company.logoUrl) {
        try {
            let logoImage: any;
            let logoBytes: Buffer | undefined;

            if (company.logo && company.logo.startsWith('data:')) {
                const base64Data = company.logo.split(',')[1];
                logoBytes = Buffer.from(base64Data, 'base64');
                logoImage = company.logo.includes('image/png')
                    ? await pdfDoc.embedPng(logoBytes)
                    : await pdfDoc.embedJpg(logoBytes);
            } else if (company.logoUrl) {
                const logoPath = path.join(__dirname, '../../', company.logoUrl);
                if (fs.existsSync(logoPath)) {
                    logoBytes = fs.readFileSync(logoPath);
                    logoImage = company.logoUrl.toLowerCase().endsWith('.png')
                        ? await pdfDoc.embedPng(logoBytes)
                        : await pdfDoc.embedJpg(logoBytes);
                }
            }

            if (logoImage) {
                const padding = 8;
                page.drawImage(logoImage, {
                    x: logoX + padding,
                    y: logoY + padding,
                    width: logoSize - padding * 2,
                    height: logoSize - padding * 2,
                });
                logoWidth = logoSize + 16;
            }
        } catch (err) {
            console.error('[PDF] Failed to embed logo:', err);
        }
    }

    // ── Company text block ───────────────────────────────────────────────────
    const textX = LAYOUT.margins.left + logoWidth;
    const textColor = UI_COLORS.black;
    const subTextColor = UI_COLORS.darkGray;
    let cy = headerTop - 32;

    drawText(page, company.name.toUpperCase(), textX, cy, 18, boldFont, textColor);
    cy -= 18;

    if (company.address) {
        drawText(page, company.address, textX, cy, TYPOGRAPHY.bodySmall.size, font, subTextColor, 300);
        cy -= 14;
    }

    const contactLine = [company.email, company.phone].filter(Boolean).join('   |   ');
    if (contactLine) {
        drawText(page, contactLine, textX, cy, TYPOGRAPHY.bodySmall.size, font, subTextColor);
        cy -= 14;
    }

    if (company.taxId) {
        drawText(page, `ICE : ${company.taxId}`, textX, cy, TYPOGRAPHY.small.size, font, subTextColor);
    }

    return { nextY: headerTop - headerHeight - 10 };
};

// ============================================================================
// DOCUMENT METADATA COMPONENT (Title card + Reference block)
// ============================================================================

/**
 * Render the document type title card and reference info block.
 * @returns { nextY }
 */
export const renderDocumentMetadata = (
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    metadata: DocumentMetadata,
    startY: number,
    theme: ThemeName = 'MODERN',
    primaryColor?: any
): LayoutResult => {
    const primary = getThemeConfig(theme, primaryColor).primary;
    const rightEdge = LAYOUT.pageWidth - LAYOUT.margins.right;

    // ── Title card (right-aligned, colored band) ─────────────────────────────
    const titleMap: Record<string, { fr: string }> = {
        INVOICE: { fr: 'FACTURE' },
        QUOTE: { fr: 'DEVIS' },
        CREDIT_NOTE: { fr: 'AVOIR' },
        REFUND: { fr: 'REMBOURSEMENT' },
    };
    const titleData = titleMap[metadata.type] || { fr: metadata.title };
    const title = titleData.fr;

    // Calculate dynamic width based on text length to avoid overflow
    const titleSize = 20;
    const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
    const cardW = Math.max(160, titleWidth + 32);
    const cardH = 44;
    const cardX = rightEdge - cardW;
    const cardY = startY - cardH;

    // Shadow effect (slightly offset darker rect)
    page.drawRectangle({ x: cardX + 2, y: cardY - 2, width: cardW, height: cardH, color: rgb(0.8, 0.8, 0.85) });
    page.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: primary });

    // Title text centered in card
    const titleX = cardX + (cardW - titleWidth) / 2;
    drawText(page, title, titleX, cardY + 13, titleSize, boldFont, UI_COLORS.white);

    // ── Reference info (below title card, right-side) ────────────────────────
    const refX = cardX;
    let refY = cardY - 16;
    const labelColor = UI_COLORS.lightGray;
    const valueColor = UI_COLORS.darkGray;

    const refLines: { label: string; value: string }[] = [
        { label: 'N°', value: metadata.number },
        { label: 'Émis le', value: formatDate(metadata.date) },
    ];

    if (metadata.type === 'INVOICE' && metadata.dueDate) {
        refLines.push({ label: 'Échéance', value: formatDate(metadata.dueDate) });
    }
    if (metadata.type === 'QUOTE' && metadata.validUntil) {
        refLines.push({ label: 'Valable jusqu\'au', value: formatDate(metadata.validUntil) });
    }

    for (const { label, value } of refLines) {
        const fullLabel = `${label} :`;
        drawText(page, fullLabel, refX, refY, TYPOGRAPHY.footnote.size, font, labelColor);
        drawText(
            page,
            value,
            refX + boldFont.widthOfTextAtSize(fullLabel, TYPOGRAPHY.footnote.size) + 6,
            refY,
            TYPOGRAPHY.footnote.size,
            boldFont,
            valueColor
        );
        refY -= 12;
    }

    // nextY is the lower of the title card bottom or the reference lines bottom
    return { nextY: Math.min(cardY, refY) - 8 };
};

// ============================================================================
// CLIENT INFO CARD
// ============================================================================

/**
 * Render the "FACTURÉ À" (Bill To) card with client information.
 * @returns { nextY }
 */
export const renderClientInfo = (
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    client: ClientInfo,
    label: string = 'FACTURÉ À',
    theme: ThemeName = 'MODERN',
    startY?: number,
    primaryColor?: any
): number => {
    const primary = getThemeConfig(theme, primaryColor).primary;
    const cardX = LAYOUT.margins.left;
    const cardW = 240;
    const cardH = 96;
    const cardY = (startY ?? (LAYOUT.pageHeight - LAYOUT.header.height - 190)) - cardH;

    // Card background + border
    drawCard(page, cardX, cardY, cardW, cardH, rgb(0.975, 0.975, 1.0), UI_COLORS.border, 0.5);

    let cy = cardY + cardH - 16;

    drawSectionLabel(page, label, cardX + 8, cy, boldFont, primary);
    cy -= 18;

    drawText(page, client.name, cardX + 8, cy, TYPOGRAPHY.body.size, boldFont, UI_COLORS.darkGray, cardW - 16);
    cy -= 15;

    if (client.email) {
        drawText(page, client.email, cardX + 8, cy, TYPOGRAPHY.bodySmall.size, font, UI_COLORS.mediumGray, cardW - 16);
        cy -= 13;
    }

    if (client.address) {
        drawText(page, client.address, cardX + 8, cy, TYPOGRAPHY.bodySmall.size, font, UI_COLORS.mediumGray, cardW - 16);
        cy -= 13;
    }

    if (client.taxId) {
        drawText(page, `ICE : ${client.taxId}`, cardX + 8, cy, TYPOGRAPHY.small.size, font, UI_COLORS.lightGray, cardW - 16);
    }

    return cardY - 12;
};

// ============================================================================
// TABLE HEADERS
// ============================================================================

/**
 * Render the professional table header row.
 * @returns Y position of the header row top (for items to follow below).
 */
export const renderTableHeaders = (
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    currentY: number,
    theme: ThemeName = 'MODERN',
    primaryColor?: any
): number => {
    const primary = getThemeConfig(theme, primaryColor).primary;
    const isBold = theme === 'BOLD';
    const startX = LAYOUT.margins.left;
    const headerH = 28;
    const headerY = currentY - headerH;

    // Header fill
    drawCard(page, startX, headerY, LAYOUT.table.width, headerH,
        isBold ? primary : rgb(0.93, 0.95, 0.98),
        isBold ? undefined : primary, 0.5
    );

    const textColor = isBold ? UI_COLORS.white : primary;
    const pos = getTableColumnPositions(startX);

    const headers: { text: string; x: number; rightAligned?: boolean }[] = [
        { text: 'DÉSIGNATION', x: pos.description + 6 },
        { text: 'QTÉ', x: pos.quantity + 6 },
        { text: 'P.U. HT', x: pos.unitPrice + 6 },
        { text: 'TVA %', x: pos.tax + 6 },
        { text: 'TOTAL TTC', x: pos.total + 6 },
    ];

    for (const h of headers) {
        drawText(page, h.text, h.x, headerY + 10, 10, boldFont, textColor);
    }

    return headerY;
};

// ============================================================================
// LINE ITEMS
// ============================================================================

/**
 * Render line items below the table header with zebra-stripe rows.
 */
export const renderLineItems = (
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    items: LineItem[],
    currentY: number,
    currency: string = 'MAD',
    theme: ThemeName = 'MODERN',
    primaryColor?: any
): { newY: number; totalHT: number; totalTVA: number; totalTTC: number; totalDiscount: number } => {
    const startX = LAYOUT.margins.left;
    const pos = getTableColumnPositions(startX);
    const standardRowH = 21;
    const discountedRowH = 32;
    const { subtotalGross, totalDiscount, taxAmount: totalTVA, netHT: totalHT, totalTTC } = calculateDocumentTotals(items as any);

    items.forEach((item, index) => {
        const qty = Number(item.quantity);
        const price = Number(item.price);
        const tax = Number(item.tax) || 0;
        const discount = Number(item.discount) || 0;
        const originalLineHT = qty * price;
        let lineDiscount = 0;

        if (item.discountType === 'AMOUNT' || (item.discountType as any) === 'MAD') {
            lineDiscount = discount;
        } else {
            lineDiscount = originalLineHT * (discount / 100);
        }

        const lineHT = Math.max(0, originalLineHT - lineDiscount);
        const lineTVA = lineHT * (tax / 100);
        const lineTTC = lineHT + lineTVA;

        const hasDiscount = discount > 0;
        const rowH = hasDiscount ? discountedRowH : standardRowH;
        const rowY = currentY - rowH;
        const themeConfig = getThemeConfig(theme, primaryColor);
        const primary = themeConfig.primary;

        // Zebra stripe
        if (index % 2 === 0) {
            page.drawRectangle({
                x: startX, y: rowY, width: LAYOUT.table.width, height: rowH,
                color: rgb(0.97, 0.97, 0.99),
            });
        }

        // Bottom row separator
        page.drawLine({
            start: { x: startX, y: rowY },
            end: { x: startX + LAYOUT.table.width, y: rowY },
            color: UI_COLORS.border, thickness: 0.4,
        });

        const colW = {
            qty: LAYOUT.table.width * LAYOUT.table.columns.quantity,
            price: LAYOUT.table.width * LAYOUT.table.columns.unitPrice,
            tax: LAYOUT.table.width * LAYOUT.table.columns.tax,
            total: LAYOUT.table.width * LAYOUT.table.columns.total
        };

        const topOffset = hasDiscount ? 14 : 7;
        const textY = rowY + topOffset;
        const desc = truncateText(item.description, 45);
        const isLast = index === items.length - 1;

        // Column text widths for right alignment
        const qtyStr = qty.toString();
        const priceStr = price.toFixed(2);
        const taxStr = `${tax.toFixed(0)}%`;
        const totalStr = formatCurrency(lineTTC, currency);

        const qtyW = font.widthOfTextAtSize(qtyStr, TYPOGRAPHY.bodySmall.size);
        const priceW = font.widthOfTextAtSize(priceStr, TYPOGRAPHY.bodySmall.size);
        const taxW = font.widthOfTextAtSize(taxStr, TYPOGRAPHY.bodySmall.size);
        const totalW = (isLast ? boldFont : font).widthOfTextAtSize(totalStr, TYPOGRAPHY.bodySmall.size);

        drawText(page, desc, pos.description + 6, textY, TYPOGRAPHY.bodySmall.size, font, UI_COLORS.darkGray, 165);

        if (hasDiscount) {
            const discountLabel = item.discountType === 'AMOUNT' || (item.discountType as any) === 'MAD'
                ? `REMISE: ${discount.toFixed(2)} ${currency}`
                : `REMISE: ${discount}%`;
            drawText(page, discountLabel, pos.description + 6, textY - 12, 8, boldFont, rgb(0.8, 0.1, 0.1));
        }

        // Right-aligned columns: pos + colWidth - textWidth - rightPadding
        drawText(page, qtyStr, pos.quantity + colW.qty - qtyW - 10, textY, TYPOGRAPHY.bodySmall.size, font, UI_COLORS.darkGray);
        drawText(page, priceStr, pos.unitPrice + colW.price - priceW - 10, textY, TYPOGRAPHY.bodySmall.size, font, UI_COLORS.darkGray);
        drawText(page, taxStr, pos.tax + colW.tax - taxW - 10, textY, TYPOGRAPHY.bodySmall.size, font, UI_COLORS.mediumGray);
        drawText(
            page,
            totalStr,
            pos.total + colW.total - totalW - 10,
            textY,
            TYPOGRAPHY.bodySmall.size,
            isLast ? boldFont : font,
            isLast ? primary : UI_COLORS.darkGray
        );

        currentY -= rowH;
    });

    return { newY: currentY, totalHT, totalTVA, totalTTC: totalHT + totalTVA, totalDiscount };
};

// ============================================================================
// TOTALS
// ============================================================================

/**
 * Render the HT / TVA / TTC summary block.
 * @returns { nextY }
 */
export const renderTotals = (
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    currentY: number,
    totalHT: number,
    totalTVA: number,
    totalTTC: number,
    currency: string = 'MAD',
    theme: ThemeName = 'MODERN',
    isCreditNote: boolean = false,
    primaryColor?: any,
    totalDiscount: number = 0
): number => {
    const primary = getThemeConfig(theme, primaryColor).primary;
    const blockW = 220;
    const startX = LAYOUT.pageWidth - LAYOUT.margins.right - blockW;
    let y = currentY - 32;

    // Separator above totals
    page.drawLine({
        start: { x: startX, y: y + 16 },
        end: { x: LAYOUT.pageWidth - LAYOUT.margins.right, y: y + 16 },
        color: UI_COLORS.border, thickness: 1,
    });

    const valueX = LAYOUT.pageWidth - LAYOUT.margins.right - 4;

    const drawTotalRow = (label: string, value: string, isAccent = false, isDiscount = false) => {
        const labelFont = isAccent ? boldFont : font;
        const valueFont = boldFont;
        const color = isAccent ? primary : (isDiscount ? rgb(0.8, 0.1, 0.1) : UI_COLORS.mediumGray);
        const valColor = isAccent ? primary : (isDiscount ? rgb(0.8, 0.1, 0.1) : UI_COLORS.darkGray);
        const size = isAccent ? TYPOGRAPHY.header.size : TYPOGRAPHY.body.size;

        drawText(page, label, startX, y, size, labelFont, color);
        const valW = boldFont.widthOfTextAtSize(value, size);
        drawText(page, value, valueX - valW, y, size, valueFont, valColor);
        y -= isAccent ? 12 : 18;
    };

    if (totalDiscount > 0) {
        drawTotalRow('Sous-total HT', formatCurrency(totalHT + totalDiscount, currency));
        drawTotalRow('Remise', `-${formatCurrency(totalDiscount, currency)}`, false, true);
        drawTotalRow('Net HT', formatCurrency(totalHT, currency));
    } else {
        drawTotalRow('Sous-total HT', formatCurrency(totalHT, currency));
    }
    drawTotalRow('TVA', formatCurrency(totalTVA, currency));

    // Separator before grand total
    page.drawLine({
        start: { x: startX, y: y + 14 },
        end: { x: LAYOUT.pageWidth - LAYOUT.margins.right, y: y + 14 },
        color: primary, thickness: 1.5,
    });
    y -= 4;

    // Grand total highlight card
    const totalCardH = 34;
    const cardY = y - 25;
    page.drawRectangle({ x: startX - 8, y: cardY, width: blockW + 8, height: totalCardH, color: primary });

    const totalLabel = isCreditNote ? 'Total Avoir TTC' : 'Total TTC';
    const totalVal = formatCurrency(totalTTC, currency);
    const totalValW = boldFont.widthOfTextAtSize(totalVal, 13);

    drawText(page, totalLabel, startX, cardY + 11, 11, boldFont, UI_COLORS.white);
    drawText(page, totalVal, valueX - totalValW, cardY + 11, 13, boldFont, UI_COLORS.white);

    return cardY - 10;
};

// ============================================================================
// PAYMENTS
// ============================================================================

/**
 * Render payments received and remaining balance.
 * @returns nextY
 */
export const renderPayments = (
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    currentY: number,
    payments: PaymentInfo[],
    totalAmount: number,
    currency: string = 'MAD',
    theme: ThemeName = 'MODERN',
    isCreditNote: boolean = false,
    primaryColor?: any
): number => {
    if (!payments || payments.length === 0) return currentY;

    const primary = getThemeConfig(theme, primaryColor).primary;
    const blockW = 220;
    const startX = LAYOUT.pageWidth - LAYOUT.margins.right - blockW;
    const valueX = LAYOUT.pageWidth - LAYOUT.margins.right - 4;
    let y = currentY - 32; // Increased space above payments

    drawSectionLabel(page, 'PAIEMENTS', startX, y + 14, boldFont, primary);
    y -= 8;

    let totalPaid = 0;
    for (const p of payments) {
        totalPaid += Number(p.amount);
        const amtW = font.widthOfTextAtSize(formatCurrency(Number(p.amount), currency), TYPOGRAPHY.bodySmall.size);
        drawText(page, `${p.method} — ${formatDate(p.date)}`, startX, y, TYPOGRAPHY.bodySmall.size, font, UI_COLORS.mediumGray);
        drawText(page, `-${formatCurrency(Number(p.amount), currency)}`, valueX - amtW, y, TYPOGRAPHY.bodySmall.size, font, rgb(0, 0.55, 0.2));
        y -= 15;
    }

    const balance = totalAmount - totalPaid;
    const balanceColor = balance > 0.01 ? (isCreditNote ? rgb(0.8, 0.4, 0.0) : rgb(0.8, 0.1, 0.1)) : rgb(0, 0.55, 0.2);
    const balanceLabel = balance > 0.01 ? (isCreditNote ? 'Reste à rembourser :' : 'Reste à payer :') : 'Soldé :';
    const balStr = formatCurrency(Math.max(0, balance), currency);
    const balW = boldFont.widthOfTextAtSize(balStr, TYPOGRAPHY.body.size);

    page.drawLine({ start: { x: startX, y: y + 12 }, end: { x: LAYOUT.pageWidth - LAYOUT.margins.right, y: y + 12 }, color: UI_COLORS.border, thickness: 0.5 });
    y -= 4;
    drawText(page, balanceLabel, startX, y, TYPOGRAPHY.body.size, boldFont, balanceColor);
    drawText(page, balStr, valueX - balW, y, TYPOGRAPHY.body.size, boldFont, balanceColor);

    return y - 24;
};

// ============================================================================
// REFUNDS ON INVOICE
// ============================================================================

/**
 * Render refund deductions on the main invoice PDF.
 * @returns nextY
 */
export const renderRefundsOnInvoice = (
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    currentY: number,
    refunds: any[],
    currency: string = 'MAD',
    theme: ThemeName = 'MODERN',
    primaryColor?: any
): number => {
    if (!refunds || refunds.length === 0) return currentY;

    const primary = getThemeConfig(theme, primaryColor).primary;
    const blockW = 220;
    const startX = LAYOUT.pageWidth - LAYOUT.margins.right - blockW;
    const valueX = LAYOUT.pageWidth - LAYOUT.margins.right - 4;
    let y = currentY - 20;

    drawSectionLabel(page, 'RETOUR / REMBOURSEMENT', startX, y + 14, boldFont, rgb(0.8, 0.1, 0.1));
    y -= 8;

    let totalRefunded = 0;
    for (const refund of refunds) {
        if (!refund.items) continue;

        for (const item of refund.items) {
            const price = Number(item.price);
            const qty = Number(item.quantity);
            const itemTotal = price * qty;
            totalRefunded += itemTotal;

            const label = `${item.description} (x${qty})`;
            const valStr = `-${formatCurrency(itemTotal, currency)}`;
            const valW = font.widthOfTextAtSize(valStr, TYPOGRAPHY.bodySmall.size);

            drawText(page, label, startX, y, TYPOGRAPHY.bodySmall.size, font, UI_COLORS.mediumGray, 120);
            drawText(page, valStr, valueX - valW, y, TYPOGRAPHY.bodySmall.size, font, rgb(0.8, 0.1, 0.1));
            y -= 15;
        }
    }

    if (totalRefunded > 0) {
        const netLabel = 'NET À PAYER :';
        const netValue = 0; // Will be handled in the main service call to show net total

        page.drawLine({
            start: { x: startX, y: y + 12 },
            end: { x: LAYOUT.pageWidth - LAYOUT.margins.right, y: y + 12 },
            color: UI_COLORS.border,
            thickness: 0.5
        });
    }

    return y - 10;
};

// ============================================================================
// LEGAL MENTIONS
// ============================================================================

/**
 * Render terms, conditions, and legal mentions at the bottom of the document.
 * @returns nextY
 */
export const renderLegalMentions = (
    page: PDFPage,
    font: PDFFont,
    boldFont: PDFFont,
    currentY: number,
    legalText: string,
    theme: ThemeName = 'MODERN',
    primaryColor?: any
): number => {
    if (!legalText) return currentY;

    const primary = getThemeConfig(theme, primaryColor).primary;
    const x = LAYOUT.margins.left;
    let y = currentY - 140; // Moved legal mentions significantly further down

    drawSectionLabel(page, 'CONDITIONS GÉNÉRALES', x, y + 12, boldFont, primary);
    y -= 10;

    drawText(page, legalText, x, y, TYPOGRAPHY.small.size, font, UI_COLORS.lightGray, LAYOUT.contentWidth);

    return y - 48;
};

// ============================================================================
// FOOTER
// ============================================================================

/**
 * Render the document footer: separator, company summary, and page indicator.
 */
export const renderFooter = (
    page: PDFPage,
    font: PDFFont,
    company: CompanyInfo,
    pageNumber: number,
    totalPages: number,
    theme: ThemeName = 'MODERN',
    primaryColor?: any
): void => {
    const primary = getThemeConfig(theme, primaryColor).primary;
    const footerY = LAYOUT.margins.bottom;

    // Separator
    page.drawLine({
        start: { x: LAYOUT.margins.left, y: footerY + 18 },
        end: { x: LAYOUT.pageWidth - LAYOUT.margins.right, y: footerY + 18 },
        color: primary, thickness: 0.75,
    });

    // Centered company summary
    const parts = [
        company.name,
        company.address,
        company.taxId ? `ICE : ${company.taxId}` : null,
        company.email,
        company.phone
    ].filter(Boolean);
    
    // Use a more compact separator and dynamic scaling to ensure it fits on one line
    const separator = '  ·  ';
    const footerText = parts.join(separator);
    
    const maxW = LAYOUT.pageWidth - (LAYOUT.margins.left + LAYOUT.margins.right);
    let fontSize = TYPOGRAPHY.footnote.size;
    let textW = font.widthOfTextAtSize(footerText, fontSize);
    
    // Scale down font size if it exceeds content width
    while (textW > maxW && fontSize > 6) {
        fontSize -= 0.5;
        textW = font.widthOfTextAtSize(footerText, fontSize);
    }

    const centeredX = LAYOUT.pageWidth / 2 - textW / 2;

    drawText(page, footerText, centeredX, footerY + 6, fontSize, font, UI_COLORS.lightGray);

    // IBAN if available
    if (company.iban) {
        const ibanText = `IBAN : ${company.iban}`;
        const ibanW = font.widthOfTextAtSize(ibanText, TYPOGRAPHY.footnote.size);
        drawText(page, ibanText, LAYOUT.pageWidth / 2 - ibanW / 2, footerY - 6, TYPOGRAPHY.footnote.size, font, UI_COLORS.lightGray);
    }
};
