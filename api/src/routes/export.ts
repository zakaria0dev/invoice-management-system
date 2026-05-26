import { Router } from 'express';
import { exportInvoices, exportQuotes } from '../controllers/export';
import { protect, restrictToPermission } from '../middleware/auth';

const router = Router();

router.use(protect);
router.use(restrictToPermission('reports.export'));

router.get('/invoices', exportInvoices);
router.get('/quotes', exportQuotes);

export default router;
