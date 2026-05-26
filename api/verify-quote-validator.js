const { quoteSchema } = require('./src/validators/quote');

const cases = [
    {
        name: 'Valid with empty productId',
        payload: {
            body: {
                validUntil: '2026-12-31',
                clientId: '1',
                items: [{ description: 'Test', quantity: 1, price: 100, tax: 20, productId: '' }]
            }
        }
    },
    {
        name: 'Valid with numeric clientId',
        payload: {
            body: {
                validUntil: '2026-12-31',
                clientId: 1,
                items: [{ description: 'Test', quantity: 1, price: 100, tax: 20 }]
            }
        }
    },
    {
        name: 'Invalid empty clientId',
        payload: {
            body: {
                validUntil: '2026-12-31',
                clientId: '',
                items: [{ description: 'Test', quantity: 1, price: 100, tax: 20 }]
            }
        }
    }
];

cases.forEach(c => {
    console.log(`Testing: ${c.name}`);
    const result = quoteSchema.safeParse(c.payload);
    if (result.success) {
        console.log('  SUCCESS');
        console.log('  Transformed clientId:', result.data.body.clientId);
        console.log('  Transformed productId:', result.data.body.items[0].productId);
    } else {
        console.log('  FAILED');
        console.log('  Errors:', JSON.stringify(result.error.format().body, null, 2));
    }
    console.log('---');
});
