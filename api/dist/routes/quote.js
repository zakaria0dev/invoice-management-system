"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quote_1 = require("../controllers/quote");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const quote_2 = require("../validators/quote");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.route('/')
    .get((0, auth_1.restrictToPermission)('quotes.view'), quote_1.getAllQuotes)
    .post((0, auth_1.restrictToPermission)('quotes.create'), (0, validate_1.validate)(quote_2.quoteSchema), quote_1.createQuote);
router.route('/:id')
    .get((0, auth_1.restrictToPermission)('quotes.view'), quote_1.getQuote)
    .put((0, auth_1.restrictToPermission)('quotes.edit'), (0, validate_1.validate)(quote_2.quoteSchema), quote_1.updateQuote)
    .patch((0, auth_1.restrictToPermission)('quotes.edit'), (0, validate_1.validate)(quote_2.updateQuoteSchema), quote_1.updateQuote)
    .delete((0, auth_1.restrictToPermission)('quotes.delete'), quote_1.deleteQuote);
router.get('/:id/pdf', (0, auth_1.restrictToPermission)('quotes.view'), quote_1.getQuotePDF);
router.post('/:id/send', (0, auth_1.restrictToPermission)('quotes.send'), quote_1.sendQuoteEmail);
router.post('/:id/reject', (0, auth_1.restrictToPermission)('quotes.convert'), quote_1.rejectQuote);
router.post('/:id/convert', (0, auth_1.restrictToPermission)('quotes.convert'), quote_1.convertToInvoice);
router.post('/:id/signature', (0, auth_1.restrictToPermission)('quotes.edit'), quote_1.updateSignature);
exports.default = router;
