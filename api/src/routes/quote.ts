import { Router } from 'express';
import {
    getAllQuotes,
    createQuote,
    getQuote,
    getQuotePDF,
    deleteQuote,
    rejectQuote,
    convertToInvoice,
    updateQuote,
    updateSignature,
    sendQuoteEmail
} from '../controllers/quote';
import { protect, restrictToPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { quoteSchema, updateQuoteStatusSchema, updateQuoteSchema } from '../validators/quote';

const router = Router();

router.use(protect);

router.route('/')
    .get(restrictToPermission('quotes.view'), getAllQuotes)
    .post(restrictToPermission('quotes.create'), validate(quoteSchema), createQuote);

router.route('/:id')
    .get(restrictToPermission('quotes.view'), getQuote)
    .put(restrictToPermission('quotes.edit'), validate(quoteSchema), updateQuote)
    .patch(restrictToPermission('quotes.edit'), validate(updateQuoteSchema), updateQuote)
    .delete(restrictToPermission('quotes.delete'), deleteQuote);

router.get('/:id/pdf', restrictToPermission('quotes.view'), getQuotePDF);
router.post('/:id/send', restrictToPermission('quotes.send'), sendQuoteEmail);
router.post('/:id/reject', restrictToPermission('quotes.convert'), rejectQuote);
router.post('/:id/convert', restrictToPermission('quotes.convert'), convertToInvoice);
router.post('/:id/signature', restrictToPermission('quotes.edit'), updateSignature);

export default router;
