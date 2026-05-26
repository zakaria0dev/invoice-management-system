const express = require('express');
const cors = require('cors');
const Joi = require('japi'); // Wait, user asked for Joi, I'll use joi
const JoiReal = require('joi');
const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');
const generateDocDefinition = require('./invoice-template');

const app = express();
const port = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// PDFMake Fonts
const fonts = {
    Roboto: {
        normal: path.join(__dirname, 'fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, 'fonts/Roboto-Medium.ttf'),
        italics: path.join(__dirname, 'fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, 'fonts/Roboto-MediumItalic.ttf')
    }
};

const printer = new PdfPrinter(fonts);

// Validation Schema
const invoiceSchema = JoiReal.object({
    invoice: JoiReal.object({
        number: JoiReal.string().required(),
        date: JoiReal.string().required(),
        dueDate: JoiReal.string().required(),
        from: JoiReal.object({
            name: JoiReal.string().required(),
            address: JoiReal.string().required(),
            email: JoiReal.string().email().optional(),
            phone: JoiReal.string().optional(),
            ice: JoiReal.string().optional()
        }).required(),
        to: JoiReal.object({
            name: JoiReal.string().required(),
            address: JoiReal.string().required(),
            email: JoiReal.string().email().optional(),
            phone: JoiReal.string().optional(),
            ice: JoiReal.string().optional()
        }).required()
    }).required(),
    items: JoiReal.array().items(
        JoiReal.object({
            description: JoiReal.string().required(),
            quantity: JoiReal.number().min(1).required(),
            unitPrice: JoiReal.number().min(0).required(),
            tax: JoiReal.number().min(0).optional()
        })
    ).min(1).required(),
    settings: JoiReal.object({
        taxRate: JoiReal.number().min(0).max(1).optional().default(0.2),
        currency: JoiReal.string().optional().default('USD')
    }).optional().default({ taxRate: 0.2, currency: 'USD' })
});

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'PDF Service is healthy' });
});

// POST /api/invoice/pdf
app.post('/api/invoice/pdf', (req, res) => {
    const { error, value } = invoiceSchema.validate(req.body);

    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details[0].message
        });
    }

    try {
        const docDefinition = generateDocDefinition(value, printer);
        const pdfDoc = printer.createPdfKitDocument(docDefinition);

        // Dynamic Filename: Invoice_[number]_[date].pdf
        const filename = `Invoice_${value.invoice.number}_${value.invoice.date.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`🚀 PDF Microservice running on port ${port}`);
});
