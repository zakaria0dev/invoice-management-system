import { Router } from 'express';
import {
    getAllClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    exportClients,
    getImportTemplate,
    importClients
} from '../controllers/client';
import { protect, restrictToPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { clientSchema } from '../validators/client';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(protect);

router.post('/import', restrictToPermission('clients.create'), upload.single('file'), importClients);
router.get('/export', restrictToPermission('reports.export'), exportClients);
router.get('/template', restrictToPermission('reports.export'), getImportTemplate);

router.route('/')
    .get(restrictToPermission('clients.view'), getAllClients)
    .post(restrictToPermission('clients.create'), validate(clientSchema), createClient);

router.route('/:id')
    .get(restrictToPermission('clients.view'), getClient)
    .put(restrictToPermission('clients.edit'), validate(clientSchema), updateClient)
    .delete(restrictToPermission('clients.delete'), deleteClient);

export default router;
