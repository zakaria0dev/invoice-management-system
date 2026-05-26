"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const calculations_1 = require("./calculations");
describe('calculateDocumentTotals', () => {
    test('Calculates correctly for a single item with no discount', () => {
        const items = [{
                quantity: 2,
                price: 100,
                tax: 20,
                discount: 0,
                discountType: 'PERCENTAGE'
            }];
        const totals = (0, calculations_1.calculateDocumentTotals)(items);
        expect(totals.subtotalGross).toBe(200);
        expect(totals.totalDiscount).toBe(0);
        expect(totals.netHT).toBe(200);
        expect(totals.taxAmount).toBe(40);
        expect(totals.totalTTC).toBe(240);
    });
    test('Calculates correctly for percentage discount', () => {
        const items = [{
                quantity: 2,
                price: 100,
                tax: 20,
                discount: 10, // 10%
                discountType: 'PERCENTAGE'
            }];
        const totals = (0, calculations_1.calculateDocumentTotals)(items);
        // Gross: 200
        // Discount: 20 (10% of 200)
        // Net HT: 180
        // Tax: 36 (20% of 180)
        // Total: 216
        expect(totals.subtotalGross).toBe(200);
        expect(totals.totalDiscount).toBe(20);
        expect(totals.netHT).toBe(180);
        expect(totals.taxAmount).toBe(36);
        expect(totals.totalTTC).toBe(216);
    });
    test('Calculates correctly for fixed amount discount', () => {
        const items = [{
                quantity: 2,
                price: 100,
                tax: 20,
                discount: 50, // 50 fixed
                discountType: 'AMOUNT'
            }];
        const totals = (0, calculations_1.calculateDocumentTotals)(items);
        // Gross: 200
        // Discount: 50
        // Net HT: 150
        // Tax: 30 (20% of 150)
        // Total: 180
        expect(totals.subtotalGross).toBe(200);
        expect(totals.totalDiscount).toBe(50);
        expect(totals.netHT).toBe(150);
        expect(totals.taxAmount).toBe(30);
        expect(totals.totalTTC).toBe(180);
    });
    test('Calculates correctly for mixed discount types and items', () => {
        const items = [
            {
                quantity: 1,
                price: 100,
                tax: 20,
                discount: 10, // 10%
                discountType: 'PERCENTAGE'
            },
            {
                quantity: 1,
                price: 200,
                tax: 10,
                discount: 50, // 50 fixed
                discountType: 'AMOUNT'
            }
        ];
        // Item 1: Gross 100, Disc 10, Net 90, Tax 18
        // Item 2: Gross 200, Disc 50, Net 150, Tax 15
        // Totals: Gross 300, Disc 60, Net 240, Tax 33, TTC 273
        const totals = (0, calculations_1.calculateDocumentTotals)(items);
        expect(totals.subtotalGross).toBe(300);
        expect(totals.totalDiscount).toBe(60);
        expect(totals.netHT).toBe(240);
        expect(totals.taxAmount).toBe(33);
        expect(totals.totalTTC).toBe(273);
    });
    test('Supports legacy MAD discount type', () => {
        const items = [{
                quantity: 1,
                price: 100,
                tax: 20,
                discount: 10,
                discountType: 'MAD'
            }];
        const totals = (0, calculations_1.calculateDocumentTotals)(items);
        expect(totals.totalDiscount).toBe(10);
        expect(totals.netHT).toBe(90);
    });
    test('Prevents negative Net HT if discount exceeds price', () => {
        const items = [{
                quantity: 1,
                price: 50,
                tax: 20,
                discount: 100,
                discountType: 'AMOUNT'
            }];
        const totals = (0, calculations_1.calculateDocumentTotals)(items);
        expect(totals.netHT).toBe(0);
        expect(totals.taxAmount).toBe(0);
        expect(totals.totalTTC).toBe(0);
    });
});
