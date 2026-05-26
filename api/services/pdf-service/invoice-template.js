const path = require('path');

module.exports = (data, printer) => {
    const { invoice, items, settings } = data;
    const { taxRate = 0.2, currency = 'USD' } = settings || {};

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = items.reduce((sum, item) => sum + (item.tax || (item.quantity * item.unitPrice * taxRate)), 0);
    const total = subtotal + taxAmount;

    return {
        content: [
            // Header
            {
                columns: [
                    {
                        stack: [
                            { text: `INVOICE #${invoice.number}`, style: 'header' },
                            { text: `Date: ${invoice.date}`, fontSize: 10, color: '#666' },
                            { text: `Due Date: ${invoice.dueDate}`, fontSize: 10, color: '#666' },
                        ]
                    },
                    {
                        // Logo Placeholder - In a real app, you'd pass a base64 or path
                        canvas: [
                            {
                                type: 'rect',
                                x: 0,
                                y: 0,
                                w: 100,
                                h: 50,
                                r: 5,
                                lineColor: '#eee',
                                color: '#f9f9f9',
                            }
                        ],
                        width: 100,
                        alignment: 'right'
                    }
                ]
            },
            { text: '', margin: [0, 20] },

            // Addresses
            {
                columns: [
                    {
                        width: '50%',
                        stack: [
                            { text: 'FROM', style: 'subheader' },
                            { text: invoice.from.name, bold: true },
                            { text: invoice.from.address, fontSize: 10 },
                            invoice.from.email ? { text: invoice.from.email, fontSize: 10, color: '#444' } : '',
                            invoice.from.ice ? { text: `ICE: ${invoice.from.ice}`, fontSize: 10, color: '#444' } : '',
                        ]
                    },
                    {
                        width: '50%',
                        stack: [
                            { text: 'BILL TO', style: 'subheader', alignment: 'right' },
                            { text: invoice.to.name, bold: true, alignment: 'right' },
                            { text: invoice.to.address, fontSize: 10, alignment: 'right' },
                            invoice.to.email ? { text: invoice.to.email, fontSize: 10, color: '#444', alignment: 'right' } : '',
                            invoice.to.ice ? { text: `ICE: ${invoice.to.ice}`, fontSize: 10, color: '#444', alignment: 'right' } : '',
                        ]
                    }
                ]
            },
            { text: '', margin: [0, 30] },

            // Items Table
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 50, 80, 70, 80],
                    body: [
                        [
                            { text: 'Description', style: 'tableHeader' },
                            { text: 'Qty', style: 'tableHeader', alignment: 'center' },
                            { text: 'Price', style: 'tableHeader', alignment: 'right' },
                            { text: 'Tax', style: 'tableHeader', alignment: 'right' },
                            { text: 'Total', style: 'tableHeader', alignment: 'right' },
                        ],
                        ...items.map((item, i) => [
                            { text: item.description, style: i % 2 === 0 ? 'tableRowEven' : 'tableRowOdd' },
                            { text: item.quantity, style: i % 2 === 0 ? 'tableRowEven' : 'tableRowOdd', alignment: 'center' },
                            { text: `${item.unitPrice.toLocaleString()} ${currency}`, style: i % 2 === 0 ? 'tableRowEven' : 'tableRowOdd', alignment: 'right' },
                            { text: `${(item.tax || (item.quantity * item.unitPrice * taxRate)).toLocaleString()} ${currency}`, style: i % 2 === 0 ? 'tableRowEven' : 'tableRowOdd', alignment: 'right' },
                            { text: `${((item.quantity * item.unitPrice) + (item.tax || (item.quantity * item.unitPrice * taxRate))).toLocaleString()} ${currency}`, style: i % 2 === 0 ? 'tableRowEven' : 'tableRowOdd', alignment: 'right', bold: true },
                        ])
                    ]
                },
                layout: 'noBorders'
            },
            { text: '', margin: [0, 20] },

            // Summary
            {
                columns: [
                    { width: '*', text: '' },
                    {
                        width: 200,
                        table: {
                            widths: ['*', '*'],
                            body: [
                                [
                                    { text: 'Subtotal:', fontSize: 10, margin: [0, 5] },
                                    { text: `${subtotal.toLocaleString()} ${currency}`, alignment: 'right', margin: [0, 5] }
                                ],
                                [
                                    { text: 'Total Tax:', fontSize: 10, margin: [0, 5] },
                                    { text: `${taxAmount.toLocaleString()} ${currency}`, alignment: 'right', margin: [0, 5] }
                                ],
                                [
                                    { text: 'TOTAL:', style: 'totalLabel' },
                                    { text: `${total.toLocaleString()} ${currency}`, style: 'totalValue' }
                                ]
                            ]
                        },
                        layout: 'lightHorizontalLines'
                    }
                ]
            },

            // Footer
            {
                stack: [
                    { text: 'Payment due by ' + invoice.dueDate, bold: true, margin: [0, 40, 0, 5] },
                    { text: 'Thank you for your business!', italics: true, color: '#666' },
                ],
                alignment: 'center'
            }
        ],
        footer: (currentPage, pageCount) => {
            return {
                text: `Page ${currentPage} / ${pageCount}`,
                alignment: 'center',
                fontSize: 8,
                color: '#999',
                margin: [0, 10]
            };
        },
        styles: {
            header: {
                fontSize: 24,
                bold: true,
                color: '#2563eb',
                margin: [0, 0, 0, 10]
            },
            subheader: {
                fontSize: 10,
                bold: true,
                color: '#999',
                margin: [0, 0, 0, 5]
            },
            tableHeader: {
                bold: true,
                fontSize: 11,
                color: 'white',
                fillColor: '#1e40af',
                margin: [5, 5, 5, 5]
            },
            tableRowOdd: {
                fontSize: 10,
                fillColor: '#f8fafc',
                margin: [5, 5, 5, 5]
            },
            tableRowEven: {
                fontSize: 10,
                margin: [5, 5, 5, 5]
            },
            totalLabel: {
                fontSize: 14,
                bold: true,
                margin: [0, 10]
            },
            totalValue: {
                fontSize: 18,
                bold: true,
                color: '#2563eb',
                alignment: 'right',
                margin: [0, 10]
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };
};
