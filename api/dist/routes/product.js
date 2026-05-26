"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_1 = require("../controllers/product");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const product_2 = require("../validators/product");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.route('/')
    .get((0, auth_1.restrictToPermission)('products.view'), product_1.getAllProducts)
    .post((0, auth_1.restrictToPermission)('products.create'), (0, validate_1.validate)(product_2.productSchema), product_1.createProduct);
router.route('/:id')
    .put((0, auth_1.restrictToPermission)('products.edit'), (0, validate_1.validate)(product_2.productSchema), product_1.updateProduct)
    .delete((0, auth_1.restrictToPermission)('products.delete'), product_1.deleteProduct);
const upload_1 = require("../middleware/upload");
const product_3 = require("../controllers/product");
router.post('/:id/image', (0, auth_1.restrictToPermission)('products.edit'), upload_1.upload.single('image'), product_3.uploadProductImage);
router.post('/:id/adjust-stock', (0, auth_1.restrictToPermission)('products.edit'), (0, validate_1.validate)(product_2.stockAdjustmentSchema), product_1.adjustStock);
router.get('/:id/stock-movements', (0, auth_1.restrictToPermission)('products.view'), product_1.getStockMovements);
router.get('/:id/history', (0, auth_1.restrictToPermission)('products.view'), product_1.getProductHistory);
exports.default = router;
