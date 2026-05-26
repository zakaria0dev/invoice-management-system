import { Router } from 'express';
import { register, login, verifyPassword, getMe, updatePassword, updateProfile, uploadAvatar, upload } from '../controllers/auth';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/auth';
const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/verify-password', protect, verifyPassword);
router.post('/update-password', protect, updatePassword);
router.put('/update-profile', protect, updateProfile);
router.post('/update-avatar', protect, upload.single('avatar'), uploadAvatar);

export default router;
