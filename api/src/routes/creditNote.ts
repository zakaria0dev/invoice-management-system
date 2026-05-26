import { Router } from 'express';
import {
    getAllCreditNotes,
    getCreditNote,
    getCreditNotePDF,
    deleteCreditNote,
    sendCreditNoteEmail,
    applyToLedger,
    refundCreditNote
} from '../controllers/creditNote';
import { protect, restrictToPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.route('/')
    .get(restrictToPermission('creditnotes.view'), getAllCreditNotes);

router.route('/:id')
    .get(restrictToPermission('creditnotes.view'), getCreditNote)
    .delete(restrictToPermission('creditnotes.edit'), deleteCreditNote); // Note: frontend only had edit/create for CNs

router.get('/:id/pdf', restrictToPermission('creditnotes.view'), getCreditNotePDF);
router.post('/:id/send', restrictToPermission('invoices.send'), sendCreditNoteEmail);
router.post('/:id/apply-ledger', restrictToPermission('creditnotes.edit'), applyToLedger);
router.post('/:id/refund', restrictToPermission('creditnotes.edit'), refundCreditNote);

export default router;
