import { Router } from 'express';
import {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/user';
import { protect, restrictToPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { userSchema, updateUserSchema } from '../validators/user';

const router = Router();

router.use(protect);

router.route('/')
    .get(restrictToPermission('users.view'), getAllUsers)
    .post(restrictToPermission('users.create'), validate(userSchema), createUser);

router.route('/:id')
    .put(restrictToPermission('users.edit'), validate(updateUserSchema), updateUser)
    .delete(restrictToPermission('users.delete'), deleteUser);

export default router;
