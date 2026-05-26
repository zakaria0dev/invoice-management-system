"use strict";
/**
 * Calculation Utility for Invoices and Quotes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLineNetPrice = exports.calculateDocumentTotals = void 0;
/**
 * Calculates correct totals for a list of items.
 * Formula:
 * 1. line_total = qty * price
 * 2. line_discount = if % then line_total * % else discount_amount
 * 3. line_net_ht = line_total - line_discount
 * 4. line_tax = line_net_ht * (tax / 100)
 */
const calculateDocumentTotals = (items) => {
    let subtotalGross = 0;
    let totalDiscount = 0;
    let taxAmount = 0;
    (items || []).forEach(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const tax = Number(item.tax) || 0;
        const discount = Number(item.discount) || 0;
        const lineTotal = qty * price;
        // Support both 'AMOUNT' (modern) and 'MAD' (legacy)
        const lineDiscount = (item.discountType === 'AMOUNT' || item.discountType === 'MAD')
            ? discount
            : lineTotal * (discount / 100);
        const lineNetHT = Math.max(0, lineTotal - lineDiscount);
        const lineTax = lineNetHT * (tax / 100);
        subtotalGross += lineTotal;
        totalDiscount += lineDiscount;
        taxAmount += lineTax;
    });
    const netHT = Math.max(0, subtotalGross - totalDiscount);
    const totalTTC = netHT + taxAmount;
    return {
        subtotalGross: roundToTwo(subtotalGross),
        totalDiscount: roundToTwo(totalDiscount),
        netHT: roundToTwo(netHT),
        taxAmount: roundToTwo(taxAmount),
        totalTTC: roundToTwo(totalTTC)
    };
};
exports.calculateDocumentTotals = calculateDocumentTotals;
/**
 * Calculates the net unit price of a single item after discount.
 * This is useful for Credit Notes where prices must match the discounted invoice value.
 */
const calculateLineNetPrice = (item) => {
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;
    const qty = Number(item.quantity) || 1; // Default to 1 to avoid division by zero
    if (item.discountType === 'AMOUNT' || item.discountType === 'MAD') {
        const perUnitDiscount = discount / qty;
        return roundToTwo(Math.max(0, price - perUnitDiscount));
    }
    else {
        // PERCENTAGE
        return roundToTwo(Math.max(0, price * (1 - discount / 100)));
    }
};
exports.calculateLineNetPrice = calculateLineNetPrice;
/**
 * Rounds a number to 2 decimal places to avoid floating point issues.
 */
const roundToTwo = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};
