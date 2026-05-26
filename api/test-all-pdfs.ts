import { generateInvoicePDF, generateQuotePDF, generateCreditNotePDF } from './src/services/pdfService';
import fs from 'fs';
import path from 'path';

async function testPDFs() {
    console.log('--- Starting PDF Generation Test ---');

    // 1. Mock Invoice with Items
    const mockInvoice = {
        id: BigInt(123),
        number: 'INV-TEST-PRO',
        date: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'SENT',
        total: 12000.00,
        currency: 'MAD',
        client: {
            name: 'Client Grand Compte',
            email: 'client@example.com',
            address: '123 Boulevard Mohammed V, Casablanca',
            ice: '001548777000081'
        },
        items: [
            { description: 'Service de Consulting Stratégique / خدمة استشارية', quantity: 1, price: 10000, tax: 20 },
            { description: 'Frais de Déplacement / مصاريف التنقل', quantity: 1, price: 0, tax: 0 }
        ],
        payments: []
    };

    console.log('Generating Professional Invoice PDF...');
    const invoicePdf = await generateInvoicePDF(mockInvoice);
    fs.writeFileSync(path.join(__dirname, 'test-invoice-pro.pdf'), invoicePdf);
    console.log('✓ test-invoice-pro.pdf created');

    // 2. Mock Quote
    const mockQuote = {
        id: BigInt(456),
        number: 'DEV-TEST-PRO',
        date: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'DRAFT',
        total: 5000.00,
        currency: 'MAD',
        client: mockInvoice.client,
        items: [
            { description: 'Logiciel de Gestion Commerciale', quantity: 2, price: 2500, tax: 20 }
        ]
    };

    console.log('Generating Professional Quote PDF...');
    const quotePdf = await generateQuotePDF(mockQuote);
    fs.writeFileSync(path.join(__dirname, 'test-quote-pro.pdf'), quotePdf);
    console.log('✓ test-quote-pro.pdf created');

    console.log('--- PDF Tests Completed ---');
}

testPDFs().catch(console.error);
