"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderFooter = exports.renderLegalMentions = exports.renderRefundsOnInvoice = exports.renderPayments = exports.renderTotals = exports.renderLineItems = exports.renderTableHeaders = exports.renderClientInfo = exports.renderDocumentMetadata = exports.renderHeader = exports.drawText = void 0;
const calculations_1 = require("../utils/calculations");
const pdf_lib_1 = require("pdf-lib");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const pdfTemplateConfig_1 = require("./pdfTemplateConfig");
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Draw a filled rectangle with optional rounded appearance (simulated via border).
 */
const drawCard = (page, x, y, width, height, fillColor, borderColor, borderWidth = 0.5) => {
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
const drawText = (page, text, x, y, size, font, color, maxWidth) => {
    if (!text || y < pdfTemplateConfig_1.LAYOUT.margins.bottom)
        return;
    const opts = { x, y, size, font, color };
    if (maxWidth) {
        opts.maxWidth = maxWidth;
        opts.lineHeight = size + 4;
    }
    page.drawText(text, opts);
};
exports.drawText = drawText;
/**
 * Render a section label (e.g. "FACTURÉ À") with a colored left accent bar.
 */
const drawSectionLabel = (page, label, x, y, font, color) => {
    // Left accent bar
    page.drawRectangle({ x, y: y - 2, width: 3, height: 14, color });
    (0, exports.drawText)(page, label, x + 8, y, pdfTemplateConfig_1.TYPOGRAPHY.footnote.size, font, color);
};
// ============================================================================
// HEADER COMPONENT
// ============================================================================
/**
 * Render the document header: top accent stripe, company logo, company info.
 * @returns { nextY } — Y position after the header for the next component.
 */
const renderHeader = async (pdfDoc, page, font, boldFont, company, theme = 'MODERN', primaryColor) => {
    const themeConfig = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor);
    const primary = themeConfig.primary;
    const fonts = { regular: font, bold: boldFont };
    // ── Header background card (white) ───────────────────────────────────────
    const headerBgColor = pdfTemplateConfig_1.UI_COLORS.white;
    const headerHeight = 110;
    const headerTop = pdfTemplateConfig_1.LAYOUT.pageHeight - 5;
    page.drawRectangle({
        x: 0,
        y: headerTop - headerHeight,
        width: pdfTemplateConfig_1.LAYOUT.pageWidth,
        height: headerHeight,
        color: headerBgColor,
    });
    let logoWidth = 0;
    const logoX = pdfTemplateConfig_1.LAYOUT.margins.left;
    const logoY = headerTop - headerHeight + 10;
    const logoSize = 88;
    // ── Logo rendering ───────────────────────────────────────────────────────
    console.log('[PDF Header] Company logo:', company.logo ? 'has base64 (' + company.logo.substring(0, 50) + '...)' : 'no logo');
    console.log('[PDF Header] Company logoUrl:', company.logoUrl || 'no logoUrl');
    if (company.logo || company.logoUrl) {
        try {
            let logoImage;
            let logoBytes;
            if (company.logo && company.logo.startsWith('data:')) {
                const base64Data = company.logo.split(',')[1];
                logoBytes = Buffer.from(base64Data, 'base64');
                logoImage = company.logo.includes('image/png')
                    ? await pdfDoc.embedPng(logoBytes)
                    : await pdfDoc.embedJpg(logoBytes);
            }
            else if (company.logoUrl) {
                const logoPath = path_1.default.join(__dirname, '../../', company.logoUrl);
                if (fs_1.default.existsSync(logoPath)) {
                    logoBytes = fs_1.default.readFileSync(logoPath);
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
        }
        catch (err) {
            console.error('[PDF] Failed to embed logo:', err);
        }
    }
    // ── Company text block ───────────────────────────────────────────────────
    const textX = pdfTemplateConfig_1.LAYOUT.margins.left + logoWidth;
    const textColor = pdfTemplateConfig_1.UI_COLORS.black;
    const subTextColor = pdfTemplateConfig_1.UI_COLORS.darkGray;
    let cy = headerTop - 32;
    (0, exports.drawText)(page, company.name.toUpperCase(), textX, cy, 18, boldFont, textColor);
    cy -= 18;
    if (company.address) {
        (0, exports.drawText)(page, company.address, textX, cy, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, subTextColor, 300);
        cy -= 14;
    }
    const contactLine = [company.email, company.phone].filter(Boolean).join('   |   ');
    if (contactLine) {
        (0, exports.drawText)(page, contactLine, textX, cy, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, subTextColor);
        cy -= 14;
    }
    if (company.taxId) {
        (0, exports.drawText)(page, `ICE : ${company.taxId}`, textX, cy, pdfTemplateConfig_1.TYPOGRAPHY.small.size, font, subTextColor);
    }
    return { nextY: headerTop - headerHeight - 10 };
};
exports.renderHeader = renderHeader;
// ============================================================================
// DOCUMENT METADATA COMPONENT (Title card + Reference block)
// ============================================================================
/**
 * Render the document type title card and reference info block.
 * @returns { nextY }
 */
const renderDocumentMetadata = (page, font, boldFont, metadata, startY, theme = 'MODERN', primaryColor) => {
    const primary = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor).primary;
    const rightEdge = pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right;
    // ── Title card (right-aligned, colored band) ─────────────────────────────
    const titleMap = {
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
    page.drawRectangle({ x: cardX + 2, y: cardY - 2, width: cardW, height: cardH, color: (0, pdf_lib_1.rgb)(0.8, 0.8, 0.85) });
    page.drawRectangle({ x: cardX, y: cardY, width: cardW, height: cardH, color: primary });
    // Title text centered in card
    const titleX = cardX + (cardW - titleWidth) / 2;
    (0, exports.drawText)(page, title, titleX, cardY + 13, titleSize, boldFont, pdfTemplateConfig_1.UI_COLORS.white);
    // ── Reference info (below title card, right-side) ────────────────────────
    const refX = cardX;
    let refY = cardY - 16;
    const labelColor = pdfTemplateConfig_1.UI_COLORS.lightGray;
    const valueColor = pdfTemplateConfig_1.UI_COLORS.darkGray;
    const refLines = [
        { label: 'N°', value: metadata.number },
        { label: 'Émis le', value: (0, pdfTemplateConfig_1.formatDate)(metadata.date) },
    ];
    if (metadata.type === 'INVOICE' && metadata.dueDate) {
        refLines.push({ label: 'Échéance', value: (0, pdfTemplateConfig_1.formatDate)(metadata.dueDate) });
    }
    if (metadata.type === 'QUOTE' && metadata.validUntil) {
        refLines.push({ label: 'Valable jusqu\'au', value: (0, pdfTemplateConfig_1.formatDate)(metadata.validUntil) });
    }
    for (const { label, value } of refLines) {
        const fullLabel = `${label} :`;
        (0, exports.drawText)(page, fullLabel, refX, refY, pdfTemplateConfig_1.TYPOGRAPHY.footnote.size, font, labelColor);
        (0, exports.drawText)(page, value, refX + boldFont.widthOfTextAtSize(fullLabel, pdfTemplateConfig_1.TYPOGRAPHY.footnote.size) + 6, refY, pdfTemplateConfig_1.TYPOGRAPHY.footnote.size, boldFont, valueColor);
        refY -= 12;
    }
    // nextY is the lower of the title card bottom or the reference lines bottom
    return { nextY: Math.min(cardY, refY) - 8 };
};
exports.renderDocumentMetadata = renderDocumentMetadata;
// ============================================================================
// CLIENT INFO CARD
// ============================================================================
/**
 * Render the "FACTURÉ À" (Bill To) card with client information.
 * @returns { nextY }
 */
const renderClientInfo = (page, font, boldFont, client, label = 'FACTURÉ À', theme = 'MODERN', startY, primaryColor) => {
    const primary = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor).primary;
    const cardX = pdfTemplateConfig_1.LAYOUT.margins.left;
    const cardW = 240;
    const cardH = 96;
    const cardY = (startY ?? (pdfTemplateConfig_1.LAYOUT.pageHeight - pdfTemplateConfig_1.LAYOUT.header.height - 190)) - cardH;
    // Card background + border
    drawCard(page, cardX, cardY, cardW, cardH, (0, pdf_lib_1.rgb)(0.975, 0.975, 1.0), pdfTemplateConfig_1.UI_COLORS.border, 0.5);
    let cy = cardY + cardH - 16;
    drawSectionLabel(page, label, cardX + 8, cy, boldFont, primary);
    cy -= 18;
    (0, exports.drawText)(page, client.name, cardX + 8, cy, pdfTemplateConfig_1.TYPOGRAPHY.body.size, boldFont, pdfTemplateConfig_1.UI_COLORS.darkGray, cardW - 16);
    cy -= 15;
    if (client.email) {
        (0, exports.drawText)(page, client.email, cardX + 8, cy, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, pdfTemplateConfig_1.UI_COLORS.mediumGray, cardW - 16);
        cy -= 13;
    }
    if (client.address) {
        (0, exports.drawText)(page, client.address, cardX + 8, cy, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, pdfTemplateConfig_1.UI_COLORS.mediumGray, cardW - 16);
        cy -= 13;
    }
    if (client.taxId) {
        (0, exports.drawText)(page, `ICE : ${client.taxId}`, cardX + 8, cy, pdfTemplateConfig_1.TYPOGRAPHY.small.size, font, pdfTemplateConfig_1.UI_COLORS.lightGray, cardW - 16);
    }
    return cardY - 12;
};
exports.renderClientInfo = renderClientInfo;
// ============================================================================
// TABLE HEADERS
// ============================================================================
/**
 * Render the professional table header row.
 * @returns Y position of the header row top (for items to follow below).
 */
const renderTableHeaders = (page, font, boldFont, currentY, theme = 'MODERN', primaryColor) => {
    const primary = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor).primary;
    const isBold = theme === 'BOLD';
    const startX = pdfTemplateConfig_1.LAYOUT.margins.left;
    const headerH = 28;
    const headerY = currentY - headerH;
    // Header fill
    drawCard(page, startX, headerY, pdfTemplateConfig_1.LAYOUT.table.width, headerH, isBold ? primary : (0, pdf_lib_1.rgb)(0.93, 0.95, 0.98), isBold ? undefined : primary, 0.5);
    const textColor = isBold ? pdfTemplateConfig_1.UI_COLORS.white : primary;
    const pos = (0, pdfTemplateConfig_1.getTableColumnPositions)(startX);
    const headers = [
        { text: 'DÉSIGNATION', x: pos.description + 6 },
        { text: 'QTÉ', x: pos.quantity + 6 },
        { text: 'P.U. HT', x: pos.unitPrice + 6 },
        { text: 'TVA %', x: pos.tax + 6 },
        { text: 'TOTAL TTC', x: pos.total + 6 },
    ];
    for (const h of headers) {
        (0, exports.drawText)(page, h.text, h.x, headerY + 10, 10, boldFont, textColor);
    }
    return headerY;
};
exports.renderTableHeaders = renderTableHeaders;
// ============================================================================
// LINE ITEMS
// ============================================================================
/**
 * Render line items below the table header with zebra-stripe rows.
 */
const renderLineItems = (page, font, boldFont, items, currentY, currency = 'MAD', theme = 'MODERN', primaryColor) => {
    const startX = pdfTemplateConfig_1.LAYOUT.margins.left;
    const pos = (0, pdfTemplateConfig_1.getTableColumnPositions)(startX);
    const standardRowH = 21;
    const discountedRowH = 32;
    const { subtotalGross, totalDiscount, taxAmount: totalTVA, netHT: totalHT, totalTTC } = (0, calculations_1.calculateDocumentTotals)(items);
    items.forEach((item, index) => {
        const qty = Number(item.quantity);
        const price = Number(item.price);
        const tax = Number(item.tax) || 0;
        const discount = Number(item.discount) || 0;
        const originalLineHT = qty * price;
        let lineDiscount = 0;
        if (item.discountType === 'AMOUNT' || item.discountType === 'MAD') {
            lineDiscount = discount;
        }
        else {
            lineDiscount = originalLineHT * (discount / 100);
        }
        const lineHT = Math.max(0, originalLineHT - lineDiscount);
        const lineTVA = lineHT * (tax / 100);
        const lineTTC = lineHT + lineTVA;
        const hasDiscount = discount > 0;
        const rowH = hasDiscount ? discountedRowH : standardRowH;
        const rowY = currentY - rowH;
        const themeConfig = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor);
        const primary = themeConfig.primary;
        // Zebra stripe
        if (index % 2 === 0) {
            page.drawRectangle({
                x: startX, y: rowY, width: pdfTemplateConfig_1.LAYOUT.table.width, height: rowH,
                color: (0, pdf_lib_1.rgb)(0.97, 0.97, 0.99),
            });
        }
        // Bottom row separator
        page.drawLine({
            start: { x: startX, y: rowY },
            end: { x: startX + pdfTemplateConfig_1.LAYOUT.table.width, y: rowY },
            color: pdfTemplateConfig_1.UI_COLORS.border, thickness: 0.4,
        });
        const colW = {
            qty: pdfTemplateConfig_1.LAYOUT.table.width * pdfTemplateConfig_1.LAYOUT.table.columns.quantity,
            price: pdfTemplateConfig_1.LAYOUT.table.width * pdfTemplateConfig_1.LAYOUT.table.columns.unitPrice,
            tax: pdfTemplateConfig_1.LAYOUT.table.width * pdfTemplateConfig_1.LAYOUT.table.columns.tax,
            total: pdfTemplateConfig_1.LAYOUT.table.width * pdfTemplateConfig_1.LAYOUT.table.columns.total
        };
        const topOffset = hasDiscount ? 14 : 7;
        const textY = rowY + topOffset;
        const desc = (0, pdfTemplateConfig_1.truncateText)(item.description, 45);
        const isLast = index === items.length - 1;
        // Column text widths for right alignment
        const qtyStr = qty.toString();
        const priceStr = price.toFixed(2);
        const taxStr = `${tax.toFixed(0)}%`;
        const totalStr = (0, pdfTemplateConfig_1.formatCurrency)(lineTTC, currency);
        const qtyW = font.widthOfTextAtSize(qtyStr, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size);
        const priceW = font.widthOfTextAtSize(priceStr, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size);
        const taxW = font.widthOfTextAtSize(taxStr, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size);
        const totalW = (isLast ? boldFont : font).widthOfTextAtSize(totalStr, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size);
        (0, exports.drawText)(page, desc, pos.description + 6, textY, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, pdfTemplateConfig_1.UI_COLORS.darkGray, 165);
        if (hasDiscount) {
            const discountLabel = item.discountType === 'AMOUNT' || item.discountType === 'MAD'
                ? `REMISE: ${discount.toFixed(2)} ${currency}`
                : `REMISE: ${discount}%`;
            (0, exports.drawText)(page, discountLabel, pos.description + 6, textY - 12, 8, boldFont, (0, pdf_lib_1.rgb)(0.8, 0.1, 0.1));
        }
        // Right-aligned columns: pos + colWidth - textWidth - rightPadding
        (0, exports.drawText)(page, qtyStr, pos.quantity + colW.qty - qtyW - 10, textY, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, pdfTemplateConfig_1.UI_COLORS.darkGray);
        (0, exports.drawText)(page, priceStr, pos.unitPrice + colW.price - priceW - 10, textY, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, pdfTemplateConfig_1.UI_COLORS.darkGray);
        (0, exports.drawText)(page, taxStr, pos.tax + colW.tax - taxW - 10, textY, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, pdfTemplateConfig_1.UI_COLORS.mediumGray);
        (0, exports.drawText)(page, totalStr, pos.total + colW.total - totalW - 10, textY, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, isLast ? boldFont : font, isLast ? primary : pdfTemplateConfig_1.UI_COLORS.darkGray);
        currentY -= rowH;
    });
    return { newY: currentY, totalHT, totalTVA, totalTTC: totalHT + totalTVA, totalDiscount };
};
exports.renderLineItems = renderLineItems;
// ============================================================================
// TOTALS
// ============================================================================
/**
 * Render the HT / TVA / TTC summary block.
 * @returns { nextY }
 */
const renderTotals = (page, font, boldFont, currentY, totalHT, totalTVA, totalTTC, currency = 'MAD', theme = 'MODERN', isCreditNote = false, primaryColor, totalDiscount = 0) => {
    const primary = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor).primary;
    const blockW = 220;
    const startX = pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right - blockW;
    let y = currentY - 32;
    // Separator above totals
    page.drawLine({
        start: { x: startX, y: y + 16 },
        end: { x: pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right, y: y + 16 },
        color: pdfTemplateConfig_1.UI_COLORS.border, thickness: 1,
    });
    const valueX = pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right - 4;
    const drawTotalRow = (label, value, isAccent = false, isDiscount = false) => {
        const labelFont = isAccent ? boldFont : font;
        const valueFont = boldFont;
        const color = isAccent ? primary : (isDiscount ? (0, pdf_lib_1.rgb)(0.8, 0.1, 0.1) : pdfTemplateConfig_1.UI_COLORS.mediumGray);
        const valColor = isAccent ? primary : (isDiscount ? (0, pdf_lib_1.rgb)(0.8, 0.1, 0.1) : pdfTemplateConfig_1.UI_COLORS.darkGray);
        const size = isAccent ? pdfTemplateConfig_1.TYPOGRAPHY.header.size : pdfTemplateConfig_1.TYPOGRAPHY.body.size;
        (0, exports.drawText)(page, label, startX, y, size, labelFont, color);
        const valW = boldFont.widthOfTextAtSize(value, size);
        (0, exports.drawText)(page, value, valueX - valW, y, size, valueFont, valColor);
        y -= isAccent ? 12 : 18;
    };
    if (totalDiscount > 0) {
        drawTotalRow('Sous-total HT', (0, pdfTemplateConfig_1.formatCurrency)(totalHT + totalDiscount, currency));
        drawTotalRow('Remise', `-${(0, pdfTemplateConfig_1.formatCurrency)(totalDiscount, currency)}`, false, true);
        drawTotalRow('Net HT', (0, pdfTemplateConfig_1.formatCurrency)(totalHT, currency));
    }
    else {
        drawTotalRow('Sous-total HT', (0, pdfTemplateConfig_1.formatCurrency)(totalHT, currency));
    }
    drawTotalRow('TVA', (0, pdfTemplateConfig_1.formatCurrency)(totalTVA, currency));
    // Separator before grand total
    page.drawLine({
        start: { x: startX, y: y + 14 },
        end: { x: pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right, y: y + 14 },
        color: primary, thickness: 1.5,
    });
    y -= 4;
    // Grand total highlight card
    const totalCardH = 34;
    const cardY = y - 25;
    page.drawRectangle({ x: startX - 8, y: cardY, width: blockW + 8, height: totalCardH, color: primary });
    const totalLabel = isCreditNote ? 'Total Avoir TTC' : 'Total TTC';
    const totalVal = (0, pdfTemplateConfig_1.formatCurrency)(totalTTC, currency);
    const totalValW = boldFont.widthOfTextAtSize(totalVal, 13);
    (0, exports.drawText)(page, totalLabel, startX, cardY + 11, 11, boldFont, pdfTemplateConfig_1.UI_COLORS.white);
    (0, exports.drawText)(page, totalVal, valueX - totalValW, cardY + 11, 13, boldFont, pdfTemplateConfig_1.UI_COLORS.white);
    return cardY - 10;
};
exports.renderTotals = renderTotals;
// ============================================================================
// PAYMENTS
// ============================================================================
/**
 * Render payments received and remaining balance.
 * @returns nextY
 */
const renderPayments = (page, font, boldFont, currentY, payments, totalAmount, currency = 'MAD', theme = 'MODERN', isCreditNote = false, primaryColor) => {
    if (!payments || payments.length === 0)
        return currentY;
    const primary = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor).primary;
    const blockW = 220;
    const startX = pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right - blockW;
    const valueX = pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right - 4;
    let y = currentY - 32; // Increased space above payments
    drawSectionLabel(page, 'PAIEMENTS', startX, y + 14, boldFont, primary);
    y -= 8;
    let totalPaid = 0;
    for (const p of payments) {
        totalPaid += Number(p.amount);
        const amtW = font.widthOfTextAtSize((0, pdfTemplateConfig_1.formatCurrency)(Number(p.amount), currency), pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size);
        (0, exports.drawText)(page, `${p.method} — ${(0, pdfTemplateConfig_1.formatDate)(p.date)}`, startX, y, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, pdfTemplateConfig_1.UI_COLORS.mediumGray);
        (0, exports.drawText)(page, `-${(0, pdfTemplateConfig_1.formatCurrency)(Number(p.amount), currency)}`, valueX - amtW, y, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, (0, pdf_lib_1.rgb)(0, 0.55, 0.2));
        y -= 15;
    }
    const balance = totalAmount - totalPaid;
    const balanceColor = balance > 0.01 ? (isCreditNote ? (0, pdf_lib_1.rgb)(0.8, 0.4, 0.0) : (0, pdf_lib_1.rgb)(0.8, 0.1, 0.1)) : (0, pdf_lib_1.rgb)(0, 0.55, 0.2);
    const balanceLabel = balance > 0.01 ? (isCreditNote ? 'Reste à rembourser :' : 'Reste à payer :') : 'Soldé :';
    const balStr = (0, pdfTemplateConfig_1.formatCurrency)(Math.max(0, balance), currency);
    const balW = boldFont.widthOfTextAtSize(balStr, pdfTemplateConfig_1.TYPOGRAPHY.body.size);
    page.drawLine({ start: { x: startX, y: y + 12 }, end: { x: pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right, y: y + 12 }, color: pdfTemplateConfig_1.UI_COLORS.border, thickness: 0.5 });
    y -= 4;
    (0, exports.drawText)(page, balanceLabel, startX, y, pdfTemplateConfig_1.TYPOGRAPHY.body.size, boldFont, balanceColor);
    (0, exports.drawText)(page, balStr, valueX - balW, y, pdfTemplateConfig_1.TYPOGRAPHY.body.size, boldFont, balanceColor);
    return y - 24;
};
exports.renderPayments = renderPayments;
// ============================================================================
// REFUNDS ON INVOICE
// ============================================================================
/**
 * Render refund deductions on the main invoice PDF.
 * @returns nextY
 */
const renderRefundsOnInvoice = (page, font, boldFont, currentY, refunds, currency = 'MAD', theme = 'MODERN', primaryColor) => {
    if (!refunds || refunds.length === 0)
        return currentY;
    const primary = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor).primary;
    const blockW = 220;
    const startX = pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right - blockW;
    const valueX = pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right - 4;
    let y = currentY - 20;
    drawSectionLabel(page, 'RETOUR / REMBOURSEMENT', startX, y + 14, boldFont, (0, pdf_lib_1.rgb)(0.8, 0.1, 0.1));
    y -= 8;
    let totalRefunded = 0;
    for (const refund of refunds) {
        if (!refund.items)
            continue;
        for (const item of refund.items) {
            const price = Number(item.price);
            const qty = Number(item.quantity);
            const itemTotal = price * qty;
            totalRefunded += itemTotal;
            const label = `${item.description} (x${qty})`;
            const valStr = `-${(0, pdfTemplateConfig_1.formatCurrency)(itemTotal, currency)}`;
            const valW = font.widthOfTextAtSize(valStr, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size);
            (0, exports.drawText)(page, label, startX, y, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, pdfTemplateConfig_1.UI_COLORS.mediumGray, 120);
            (0, exports.drawText)(page, valStr, valueX - valW, y, pdfTemplateConfig_1.TYPOGRAPHY.bodySmall.size, font, (0, pdf_lib_1.rgb)(0.8, 0.1, 0.1));
            y -= 15;
        }
    }
    if (totalRefunded > 0) {
        const netLabel = 'NET À PAYER :';
        const netValue = 0; // Will be handled in the main service call to show net total
        page.drawLine({
            start: { x: startX, y: y + 12 },
            end: { x: pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right, y: y + 12 },
            color: pdfTemplateConfig_1.UI_COLORS.border,
            thickness: 0.5
        });
    }
    return y - 10;
};
exports.renderRefundsOnInvoice = renderRefundsOnInvoice;
// ============================================================================
// LEGAL MENTIONS
// ============================================================================
/**
 * Render terms, conditions, and legal mentions at the bottom of the document.
 * @returns nextY
 */
const renderLegalMentions = (page, font, boldFont, currentY, legalText, theme = 'MODERN', primaryColor) => {
    if (!legalText)
        return currentY;
    const primary = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor).primary;
    const x = pdfTemplateConfig_1.LAYOUT.margins.left;
    let y = currentY - 140; // Moved legal mentions significantly further down
    drawSectionLabel(page, 'CONDITIONS GÉNÉRALES', x, y + 12, boldFont, primary);
    y -= 10;
    (0, exports.drawText)(page, legalText, x, y, pdfTemplateConfig_1.TYPOGRAPHY.small.size, font, pdfTemplateConfig_1.UI_COLORS.lightGray, pdfTemplateConfig_1.LAYOUT.contentWidth);
    return y - 48;
};
exports.renderLegalMentions = renderLegalMentions;
// ============================================================================
// FOOTER
// ============================================================================
/**
 * Render the document footer: separator, company summary, and page indicator.
 */
const renderFooter = (page, font, company, pageNumber, totalPages, theme = 'MODERN', primaryColor) => {
    const primary = (0, pdfTemplateConfig_1.getThemeConfig)(theme, primaryColor).primary;
    const footerY = pdfTemplateConfig_1.LAYOUT.margins.bottom;
    // Separator
    page.drawLine({
        start: { x: pdfTemplateConfig_1.LAYOUT.margins.left, y: footerY + 18 },
        end: { x: pdfTemplateConfig_1.LAYOUT.pageWidth - pdfTemplateConfig_1.LAYOUT.margins.right, y: footerY + 18 },
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
    const maxW = pdfTemplateConfig_1.LAYOUT.pageWidth - (pdfTemplateConfig_1.LAYOUT.margins.left + pdfTemplateConfig_1.LAYOUT.margins.right);
    let fontSize = pdfTemplateConfig_1.TYPOGRAPHY.footnote.size;
    let textW = font.widthOfTextAtSize(footerText, fontSize);
    // Scale down font size if it exceeds content width
    while (textW > maxW && fontSize > 6) {
        fontSize -= 0.5;
        textW = font.widthOfTextAtSize(footerText, fontSize);
    }
    const centeredX = pdfTemplateConfig_1.LAYOUT.pageWidth / 2 - textW / 2;
    (0, exports.drawText)(page, footerText, centeredX, footerY + 6, fontSize, font, pdfTemplateConfig_1.UI_COLORS.lightGray);
    // IBAN if available
    if (company.iban) {
        const ibanText = `IBAN : ${company.iban}`;
        const ibanW = font.widthOfTextAtSize(ibanText, pdfTemplateConfig_1.TYPOGRAPHY.footnote.size);
        (0, exports.drawText)(page, ibanText, pdfTemplateConfig_1.LAYOUT.pageWidth / 2 - ibanW / 2, footerY - 6, pdfTemplateConfig_1.TYPOGRAPHY.footnote.size, font, pdfTemplateConfig_1.UI_COLORS.lightGray);
    }
};
exports.renderFooter = renderFooter;
