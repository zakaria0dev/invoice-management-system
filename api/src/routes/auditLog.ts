import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLog';
import { protect, restrictToPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/', restrictToPermission('auditlogs.view'), getAuditLogs);

export default router;
