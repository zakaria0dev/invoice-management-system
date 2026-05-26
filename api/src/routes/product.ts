import { Router } from 'express';
import {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    getStockMovements,
    getProductHistory,
} from '../controllers/product';
import { protect, restrictToPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { productSchema, stockAdjustmentSchema } from '../validators/product';

const router = Router();

router.use(protect);

router.route('/')
    .get(restrictToPermission('products.view'), getAllProducts)
    .post(restrictToPermission('products.create'), validate(productSchema), createProduct);

router.route('/:id')
    .put(restrictToPermission('products.edit'), validate(productSchema), updateProduct)
    .delete(restrictToPermission('products.delete'), deleteProduct);

import { upload } from '../middleware/upload';
import { uploadProductImage } from '../controllers/product';

router.post('/:id/image', restrictToPermission('products.edit'), upload.single('image'), uploadProductImage);

router.post('/:id/adjust-stock', restrictToPermission('products.edit'), validate(stockAdjustmentSchema), adjustStock);
router.get('/:id/stock-movements', restrictToPermission('products.view'), getStockMovements);
router.get('/:id/history', restrictToPermission('products.view'), getProductHistory);

export default router;
