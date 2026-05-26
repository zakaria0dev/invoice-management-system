import { Router } from 'express';
import { getStats } from '../controllers/dashboard';
import { protect, restrictToPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/stats', restrictToPermission('reports.view'), getStats);

export default router;
