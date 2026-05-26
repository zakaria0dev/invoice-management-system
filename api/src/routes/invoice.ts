import { Router } from 'express';
import {
    getAllInvoices,
    createInvoice,
    getInvoice,
    getInvoicePDF,
    sendInvoiceEmail,
    updateSignature,
    createCreditNote,
    updateInvoice,
    deleteInvoice,
    cancelInvoice,
    refundInvoice,
    getAllRefunds,
    getRefundPDF,
    sendRefundEmail,
    bulkStatusUpdate,
    bulkDeleteInvoices
} from '../controllers/invoice';
import { protect, restrictToPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { invoiceSchema, updateInvoiceStatusSchema, updateInvoiceSchema, creditNoteSchema } from '../validators/invoice';

const router = Router();

router.use(protect);

router.route('/')
    .get(restrictToPermission('invoices.view'), getAllInvoices)
    .post(restrictToPermission('invoices.create'), validate(invoiceSchema), createInvoice);

router.patch('/bulk-status', restrictToPermission('invoices.edit'), bulkStatusUpdate);
router.post('/bulk-delete', restrictToPermission('invoices.delete'), bulkDeleteInvoices);

router.route('/:id')
    .get(restrictToPermission('invoices.view'), getInvoice)
    .put(restrictToPermission('invoices.edit'), validate(invoiceSchema), updateInvoice)
    .patch(restrictToPermission('invoices.edit'), validate(updateInvoiceSchema), updateInvoice)
    .delete(restrictToPermission('invoices.delete'), deleteInvoice);

router.get('/:id/pdf', restrictToPermission('invoices.view'), getInvoicePDF);
router.post('/:id/cancel', restrictToPermission('invoices.cancel'), cancelInvoice);
router.post('/:id/send', restrictToPermission('invoices.send'), sendInvoiceEmail);
router.post('/:id/signature', restrictToPermission('invoices.edit'), updateSignature);
router.get('/refunds/all', restrictToPermission('payments.view'), getAllRefunds);
router.post('/:id/refund', restrictToPermission('invoices.refund'), refundInvoice);
router.get('/refunds/:id/pdf', restrictToPermission('payments.view'), getRefundPDF);
router.post('/refunds/:id/send', restrictToPermission('invoices.send'), sendRefundEmail);
router.post('/:id/credit-note', restrictToPermission('creditnotes.create'), validate(creditNoteSchema), createCreditNote);

export default router;
