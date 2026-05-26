/**
 * Calculation Utility for Invoices and Quotes (Frontend)
 */

export interface CalculationItem {
    quantity?: number | string;
    price?: number | string;
    tax?: number | string;
    discount?: number | string;
    discountType?: 'PERCENTAGE' | 'AMOUNT' | string;
}

export interface DocumentTotals {
    subtotalGross: number;
    totalDiscount: number;
    netHT: number;
    taxAmount: number;
    totalTTC: number;
}

/**
 * Calculates correct totals for a list of items.
 */
export const calculateDocumentTotals = (items: CalculationItem[]): DocumentTotals => {
    let subtotalGross = 0;
    let totalDiscount = 0;
    let taxAmount = 0;

    (items || []).forEach(item => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const tax = Number(item.tax) || 0;
        const discount = Number(item.discount) || 0;

        const lineTotal = qty * price;
        let lineDiscount = 0;

        // Support both 'AMOUNT' (modern) and 'MAD' (legacy)
        if (item.discountType === 'AMOUNT' || item.discountType === 'MAD') {
            lineDiscount = discount;
        } else {
            // Default to PERCENTAGE
            lineDiscount = lineTotal * (discount / 100);
        }

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

/**
 * Calculates the net unit price of a single item after discount.
 * This is useful for Credit Notes where prices must match the discounted invoice value.
 */
export const calculateLineNetPrice = (item: { price: number | string; discount: number | string; discountType: string; quantity: number | string }): number => {
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;
    const qty = Number(item.quantity) || 1; // Default to 1 to avoid division by zero

    if (item.discountType === 'AMOUNT' || item.discountType === 'MAD') {
        const perUnitDiscount = discount / qty;
        return roundToTwo(Math.max(0, price - perUnitDiscount));
    } else {
        // PERCENTAGE
        return roundToTwo(Math.max(0, price * (1 - discount / 100)));
    }
};

const roundToTwo = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};
