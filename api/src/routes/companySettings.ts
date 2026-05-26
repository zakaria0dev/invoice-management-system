import { Router } from 'express';
import {
    getCompanySettings,
    updateCompanySettings,
    uploadLogo
} from '../controllers/companySettings';
import { upload } from '../middleware/upload';
import { protect, restrictTo } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { companySettingsSchema } from '../validators/companySettings';

const router = Router();

router.use(protect);

router.post('/logo', restrictTo('ADMIN'), upload.single('logo'), uploadLogo);

router.route('/')
    .get(restrictTo('ADMIN'), getCompanySettings)
    .put(restrictTo('ADMIN'), validate(companySettingsSchema), updateCompanySettings);

export default router;
