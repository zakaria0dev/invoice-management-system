"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoice_1 = require("../controllers/invoice");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const invoice_2 = require("../validators/invoice");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.route('/')
    .get((0, auth_1.restrictToPermission)('invoices.view'), invoice_1.getAllInvoices)
    .post((0, auth_1.restrictToPermission)('invoices.create'), (0, validate_1.validate)(invoice_2.invoiceSchema), invoice_1.createInvoice);
router.patch('/bulk-status', (0, auth_1.restrictToPermission)('invoices.edit'), invoice_1.bulkStatusUpdate);
router.post('/bulk-delete', (0, auth_1.restrictToPermission)('invoices.delete'), invoice_1.bulkDeleteInvoices);
router.route('/:id')
    .get((0, auth_1.restrictToPermission)('invoices.view'), invoice_1.getInvoice)
    .put((0, auth_1.restrictToPermission)('invoices.edit'), (0, validate_1.validate)(invoice_2.invoiceSchema), invoice_1.updateInvoice)
    .patch((0, auth_1.restrictToPermission)('invoices.edit'), (0, validate_1.validate)(invoice_2.updateInvoiceSchema), invoice_1.updateInvoice)
    .delete((0, auth_1.restrictToPermission)('invoices.delete'), invoice_1.deleteInvoice);
router.get('/:id/pdf', (0, auth_1.restrictToPermission)('invoices.view'), invoice_1.getInvoicePDF);
router.post('/:id/cancel', (0, auth_1.restrictToPermission)('invoices.cancel'), invoice_1.cancelInvoice);
router.post('/:id/send', (0, auth_1.restrictToPermission)('invoices.send'), invoice_1.sendInvoiceEmail);
router.post('/:id/signature', (0, auth_1.restrictToPermission)('invoices.edit'), invoice_1.updateSignature);
router.get('/refunds/all', (0, auth_1.restrictToPermission)('payments.view'), invoice_1.getAllRefunds);
router.post('/:id/refund', (0, auth_1.restrictToPermission)('invoices.refund'), invoice_1.refundInvoice);
router.get('/refunds/:id/pdf', (0, auth_1.restrictToPermission)('payments.view'), invoice_1.getRefundPDF);
router.post('/refunds/:id/send', (0, auth_1.restrictToPermission)('invoices.send'), invoice_1.sendRefundEmail);
router.post('/:id/credit-note', (0, auth_1.restrictToPermission)('creditnotes.create'), (0, validate_1.validate)(invoice_2.creditNoteSchema), invoice_1.createCreditNote);
exports.default = router;
