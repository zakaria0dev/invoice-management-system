import { updateInvoiceSchema, updateInvoiceStatusSchema } from '../validators/invoice';
import { updateQuoteSchema, updateQuoteStatusSchema } from '../validators/quote';
import { z } from 'zod';

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
        const result = updateInvoiceStatusSchema.parse({ body: fullInvoiceData });
        console.log('Result body keys:', Object.keys(result.body));
        if (Object.keys(result.body).length === 1 && result.body.status) {
            console.log('✅ Correctly stripped everything but status');
        } else {
            console.error('❌ FAILED: Did not strip fields');
        }
    } catch (e: any) {
        console.error('❌ ERROR:', e.message);
    }

    console.log('\n2. Testing NEW Invoice Update Validator (Permissive - SHOULD KEEP FIELDS)');
    try {
        const result = updateInvoiceSchema.parse({ body: fullInvoiceData });
        console.log('Result body keys:', Object.keys(result.body));
        if (Object.keys(result.body).length > 1) {
            console.log('✅ Correctly kept all fields');
        } else {
            console.error('❌ FAILED: Stripped fields');
        }
    } catch (e: any) {
        console.error('❌ ERROR:', e.message);
    }

    const fullQuoteData = {
        notes: 'Updated quote notes',
        validUntil: '2026-06-01',
        status: 'SENT'
    };

    console.log('\n3. Testing Quote Status Validator (Restrictive - SHOULD STRIP)');
    try {
        const result = updateQuoteStatusSchema.parse({ body: fullQuoteData });
        console.log('Result body keys:', Object.keys(result.body));
        if (Object.keys(result.body).length === 1 && result.body.status) {
            console.log('✅ Correctly stripped everything but status');
        } else {
            console.error('❌ FAILED');
        }
    } catch (e: any) {
        console.error('❌ ERROR:', e.message);
    }

    console.log('\n4. Testing NEW Quote Update Validator (Permissive - SHOULD KEEP)');
    try {
        const result = updateQuoteSchema.parse({ body: fullQuoteData });
        console.log('Result body keys:', Object.keys(result.body));
        if (Object.keys(result.body).length > 1) {
            console.log('✅ Correctly kept all fields');
        } else {
            console.error('❌ FAILED');
        }
    } catch (e: any) {
        console.error('❌ ERROR:', e.message);
    }

    console.log('\n--- TESTS COMPLETE ---');
}

runTest();
