import { generateInvoicePDF } from './src/services/pdfService';
import fs from 'fs';
import path from 'path';

async function verifyPaymentPDF() {
    console.log('--- Verifying Payment Information in PDF ---');

    const mockInvoiceWithPayments = {
        id: BigInt(123),
        number: 'INV-PAYMENT-TEST',
        date: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PARTIALLY_PAID',
        total: 1000.00,
        currency: 'MAD',
        client: {
            name: 'Test Client',
            email: 'test@example.com',
            address: 'Test Street, Casablanca',
            ice: '123456789'
        },
        items: [
            { description: 'Test Item', quantity: 1, price: 1000, tax: 0 }
        ],
        payments: [
            { amount: 400.00, date: new Date(), method: 'CASH' }
        ]
    };

    try {
        console.log('Generating Invoice PDF with Payments...');
        const pdfBytes = await generateInvoicePDF(mockInvoiceWithPayments);
        const fileName = 'verify-payment-pdf.pdf';
        fs.writeFileSync(path.join(__dirname, fileName), pdfBytes);
        console.log(`✓ ${fileName} created. Please check it for the PAIEMENTS section.`);
    } catch (error) {
        console.error('Failed to generate PDF:', error);
    }
}

verifyPaymentPDF().catch(console.error);
