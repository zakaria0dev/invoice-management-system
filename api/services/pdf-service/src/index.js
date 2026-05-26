const express = require('express');
const cors = require('cors');
const Joi = require('joi');
const PdfPrinter = require('pdfmake');
const path = require('path');

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// PDFMake fonts
const fonts = {
    Roboto: {
        normal: path.join(__dirname, '../fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, '../fonts/Roboto-Medium.ttf'),
        italics: path.join(__dirname, '../fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '../fonts/Roboto-MediumItalic.ttf')
    }
};

const printer = new PdfPrinter(fonts);

const invoiceSchema = Joi.object({
    invoice: Joi.object({
        number: Joi.string().required(),
        date: Joi.string().required(),
        dueDate: Joi.string().required(),
        from: Joi.object({
            name: Joi.string().required(),
            address: Joi.string().required(),
            email: Joi.string().optional(),
            phone: Joi.string().optional(),
            ice: Joi.string().optional()
        }).required(),
        to: Joi.object({
            name: Joi.string().required(),
            address: Joi.string().required(),
            email: Joi.string().optional(),
            phone: Joi.string().optional(),
            ice: Joi.string().optional()
        }).required()
    }).required(),
    items: Joi.array().items(
        Joi.object({
            description: Joi.string().required(),
            quantity: Joi.number().required(),
            unitPrice: Joi.number().required(),
            tax: Joi.number().optional()
        })
    ).required(),
    settings: Joi.object({
        taxRate: Joi.number().optional().default(0.2),
        currency: Joi.string().optional().default('USD')
    }).optional()
});

app.post('/api/invoice/pdf', (req, res) => {
    const { error, value } = invoiceSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ status: 'error', message: error.details[0].message });
    }

    const { invoice, items, settings } = value;

    // Calculate totals
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const totalTax = items.reduce((acc, item) => acc + (item.tax || (item.quantity * item.unitPrice * (settings.taxRate || 0))), 0);
    const total = subtotal + totalTax;

    const docDefinition = {
        content: [
            {
                columns: [
                    {
                        text: 'INVOICE',
                        fontSize: 24,
                        bold: true,
                        color: '#333'
                    },
                    {
                        text: invoice.number,
                        alignment: 'right',
                        fontSize: 16,
                        color: '#666'
                    }
                ]
            },
            { text: '\n' },
            {
                columns: [
                    {
                        width: '50%',
                        stack: [
                            { text: 'From:', bold: true, fontSize: 10, color: '#999' },
                            { text: invoice.from.name, bold: true },
                            { text: invoice.from.address, fontSize: 10 },
                            invoice.from.ice ? { text: `ICE: ${invoice.from.ice}`, fontSize: 10 } : '',
                            { text: invoice.from.email || '', fontSize: 10 }
                        ]
                    },
                    {
                        width: '50%',
                        stack: [
                            { text: 'Bill To:', bold: true, fontSize: 10, color: '#999', alignment: 'right' },
                            { text: invoice.to.name, bold: true, alignment: 'right' },
                            { text: invoice.to.address, fontSize: 10, alignment: 'right' },
                            invoice.to.ice ? { text: `ICE: ${invoice.to.ice}`, fontSize: 10, alignment: 'right' } : '',
                            { text: invoice.to.email || '', fontSize: 10, alignment: 'right' }
                        ]
                    }
                ]
            },
            { text: '\n\n' },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 50, 80, 80],
                    body: [
                        [
                            { text: 'Description', style: 'tableHeader' },
                            { text: 'Qty', style: 'tableHeader', alignment: 'center' },
                            { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
                            { text: 'Total', style: 'tableHeader', alignment: 'right' }
                        ],
                        ...items.map(item => [
                            item.description,
                            { text: item.quantity, alignment: 'center' },
                            { text: `${item.unitPrice.toLocaleString()} ${settings.currency}`, alignment: 'right' },
                            { text: `${(item.quantity * item.unitPrice).toLocaleString()} ${settings.currency}`, alignment: 'right' }
                        ])
                    ]
                },
                layout: 'lightHorizontalLines'
            },
            { text: '\n\n' },
            {
                columns: [
                    { width: '*', text: '' },
                    {
                        width: 160,
                        stack: [
                            {
                                columns: [
                                    { text: 'Subtotal' },
                                    { text: `${subtotal.toLocaleString()} ${settings.currency}`, alignment: 'right' }
                                ]
                            },
                            {
                                columns: [
                                    { text: 'Tax' },
                                    { text: `${totalTax.toLocaleString()} ${settings.currency}`, alignment: 'right' }
                                ]
                            },
                            { text: '\n', fontSize: 2 },
                            {
                                canvas: [{ type: 'line', x1: 0, y1: 5, x2: 160, y2: 5, lineWidth: 1 }]
                            },
                            { text: '\n', fontSize: 2 },
                            {
                                columns: [
                                    { text: 'Total', bold: true, fontSize: 14 },
                                    { text: `${total.toLocaleString()} ${settings.currency}`, alignment: 'right', bold: true, fontSize: 14 }
                                ]
                            }
                        ]
                    }
                ]
            },
            { text: '\n\n' },
            { text: 'Payment Details:', bold: true, fontSize: 11 },
            { text: 'Please pay within 30 days of receiving this invoice.', fontSize: 10, color: '#666' }
        ],
        styles: {
            tableHeader: {
                bold: true,
                fontSize: 12,
                color: 'white',
                fillColor: '#2b58a2',
                margin: [0, 5, 0, 5]
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.number}.pdf`);

    pdfDoc.pipe(res);
    pdfDoc.end();
});

app.listen(port, () => {
    console.log(`PDF Microservice running on port ${port}`);
});
