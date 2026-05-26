"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const invoice_1 = require("../validators/invoice");
const quote_1 = require("../validators/quote");
function runTest() {
    console.log('--- STARTING VALIDATOR TESTS ---');
    const fullInvoiceData = {
        notes: 'Updated notes',
        dueDate: '2026-05-01',
        status: 'SENT',
        items: [
            { description: 'Item 1', quantity: 2, price: 100 }
        ]
    };
    console.log('\n1. Testing Invoice Status Validator (Restrictive - SHOULD STRIP OTHER FIELDS)');
    try {
        const result = invoice_1.updateInvoiceStatusSchema.parse({ body: fullInvoiceData });
        console.log('Result body keys:', Object.keys(result.body));
        if (Object.keys(result.body).length === 1 && result.body.status) {
            console.log('✅ Correctly stripped everything but status');
        }
        else {
            console.error('❌ FAILED: Did not strip fields');
        }
    }
    catch (e) {
        console.error('❌ ERROR:', e.message);
    }
    console.log('\n2. Testing NEW Invoice Update Validator (Permissive - SHOULD KEEP FIELDS)');
    try {
        const result = invoice_1.updateInvoiceSchema.parse({ body: fullInvoiceData });
        console.log('Result body keys:', Object.keys(result.body));
        if (Object.keys(result.body).length > 1) {
            console.log('✅ Correctly kept all fields');
        }
        else {
            console.error('❌ FAILED: Stripped fields');
        }
    }
    catch (e) {
        console.error('❌ ERROR:', e.message);
    }
    const fullQuoteData = {
        notes: 'Updated quote notes',
        validUntil: '2026-06-01',
        status: 'SENT'
    };
    console.log('\n3. Testing Quote Status Validator (Restrictive - SHOULD STRIP)');
    try {
        const result = quote_1.updateQuoteStatusSchema.parse({ body: fullQuoteData });
        console.log('Result body keys:', Object.keys(result.body));
        if (Object.keys(result.body).length === 1 && result.body.status) {
            console.log('✅ Correctly stripped everything but status');
        }
        else {
            console.error('❌ FAILED');
        }
    }
    catch (e) {
        console.error('❌ ERROR:', e.message);
    }
    console.log('\n4. Testing NEW Quote Update Validator (Permissive - SHOULD KEEP)');
    try {
        const result = quote_1.updateQuoteSchema.parse({ body: fullQuoteData });
        console.log('Result body keys:', Object.keys(result.body));
        if (Object.keys(result.body).length > 1) {
            console.log('✅ Correctly kept all fields');
        }
        else {
            console.error('❌ FAILED');
        }
    }
    catch (e) {
        console.error('❌ ERROR:', e.message);
    }
    console.log('\n--- TESTS COMPLETE ---');
}
runTest();
