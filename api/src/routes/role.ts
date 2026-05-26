import { Router } from 'express';
import {
    getAllRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    getAllPermissions,
} from '../controllers/role';
import { protect, restrictToPermission } from '../middleware/auth';

const router = Router();

router.use(protect);

router.get('/permissions', restrictToPermission('roles.view'), getAllPermissions);
router.get('/', restrictToPermission('roles.view'), getAllRoles);
router.get('/:id', restrictToPermission('roles.view'), getRole);
router.post('/', restrictToPermission('roles.create'), createRole);
router.put('/:id', restrictToPermission('roles.edit'), updateRole);
router.delete('/:id', restrictToPermission('roles.delete'), deleteRole);

export default router;
