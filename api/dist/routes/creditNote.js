"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const creditNote_1 = require("../controllers/creditNote");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.route('/')
    .get((0, auth_1.restrictToPermission)('creditnotes.view'), creditNote_1.getAllCreditNotes);
router.route('/:id')
    .get((0, auth_1.restrictToPermission)('creditnotes.view'), creditNote_1.getCreditNote)
    .delete((0, auth_1.restrictToPermission)('creditnotes.edit'), creditNote_1.deleteCreditNote); // Note: frontend only had edit/create for CNs
router.get('/:id/pdf', (0, auth_1.restrictToPermission)('creditnotes.view'), creditNote_1.getCreditNotePDF);
router.post('/:id/send', (0, auth_1.restrictToPermission)('invoices.send'), creditNote_1.sendCreditNoteEmail);
router.post('/:id/apply-ledger', (0, auth_1.restrictToPermission)('creditnotes.edit'), creditNote_1.applyToLedger);
router.post('/:id/refund', (0, auth_1.restrictToPermission)('creditnotes.edit'), creditNote_1.refundCreditNote);
exports.default = router;
