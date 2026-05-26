import { Router } from 'express';
import { createPayment, getPayments } from '../controllers/payment';
import { protect, restrictToPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { paymentSchema } from '../validators/payment';

const router = Router();

router.use(protect);

router.route('/')
    .get(restrictToPermission('payments.view'), getPayments)
    .post(restrictToPermission('payments.create'), validate(paymentSchema), createPayment);

export default router;   
