"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProductImage = exports.getStockMovements = exports.getProductHistory = exports.adjustStock = exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getAllProducts = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const product_1 = require("../validators/product");
const auditService_1 = require("../services/auditService");
const getAllProducts = async (req, res, next) => {
    try {
        const products = await prisma_1.default.product.findMany({
            orderBy: { name: 'asc' },
        });
        res.status(200).json({
            status: 'success',
            results: products.length,
            data: { products },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllProducts = getAllProducts;
const createProduct = async (req, res, next) => {
    try {
        const validatedData = product_1.productSchema.parse({ body: req.body });
        const productData = validatedData.body;
        const product = await prisma_1.default.product.create({
            data: productData,
        });
        // Log history
        await prisma_1.default.productHistory.create({
            data: {
                productId: product.id,
                productName: product.name,
                action: 'CREATE',
                changes: productData,
                userId: req.user?.id ? BigInt(req.user.id) : null
            }
        });
        await (0, auditService_1.createAuditLog)({
            action: 'CREATE_PRODUCT',
            entityId: product.id,
            entityType: 'PRODUCT',
            details: { name: product.name },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(201).json({
            status: 'success',
            data: { product },
        });
    }
    catch (error) {
        console.error('Error in createProduct:', error);
        next(error);
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res, next) => {
    try {
        const validatedData = product_1.productSchema.parse({ body: req.body });
        const productData = validatedData.body;
        const id = BigInt(req.params.id);
        const oldProduct = await prisma_1.default.product.findUnique({ where: { id } });
        if (!oldProduct) {
            return next(new error_1.AppError('No product found with that ID', 404));
        }
        const product = await prisma_1.default.product.update({
            where: { id },
            data: productData,
        });
        // Calculate changes
        const changes = {};
        for (const key in productData) {
            const oldValue = oldProduct[key];
            const newValue = productData[key];
            // Normalize for comparison (especially for Decimal vs Number)
            const normOld = (oldValue !== null && oldValue !== undefined) ? String(oldValue) : '';
            const normNew = (newValue !== null && newValue !== undefined) ? String(newValue) : '';
            if (normOld !== normNew) {
                changes[key] = {
                    from: oldValue,
                    to: newValue
                };
            }
        }
        // Log history
        if (Object.keys(changes).length > 0) {
            await prisma_1.default.productHistory.create({
                data: {
                    productId: id,
                    productName: product.name,
                    action: 'UPDATE',
                    changes,
                    userId: req.user?.id ? BigInt(req.user.id) : null
                }
            });
            await (0, auditService_1.createAuditLog)({
                action: 'UPDATE_PRODUCT',
                entityId: id,
                entityType: 'PRODUCT',
                details: changes,
                userId: req.user?.id,
                ipAddress: req.ip
            });
        }
        res.status(200).json({
            status: 'success',
            data: { product },
        });
    }
    catch (error) {
        console.error('Error in updateProduct:', error);
        next(error);
    }
};
exports.updateProduct = updateProduct;
const deleteProduct = async (req, res, next) => {
    try {
        const id = BigInt(req.params.id);
        const product = await prisma_1.default.product.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        invoiceItems: true,
                        quoteItems: true,
                        creditNoteItems: true,
                    }
                }
            }
        });
        if (!product) {
            return next(new error_1.AppError('No product found with that ID', 404));
        }
        // Prevent deletion if related records exist
        if (product._count.invoiceItems > 0 || product._count.quoteItems > 0 || product._count.creditNoteItems > 0) {
            const reasons = [];
            if (product._count.invoiceItems > 0)
                reasons.push(`${product._count.invoiceItems} invoices`);
            if (product._count.quoteItems > 0)
                reasons.push(`${product._count.quoteItems} quotes`);
            if (product._count.creditNoteItems > 0)
                reasons.push(`${product._count.creditNoteItems} credit notes`);
            return next(new error_1.AppError(`Cannot delete product used in ${reasons.join(', ')}. Please delete those documents first or deactivate the product.`, 400));
        }
        await prisma_1.default.product.delete({
            where: { id },
        });
        // Log history
        await prisma_1.default.productHistory.create({
            data: {
                productId: id,
                productName: product.name,
                action: 'DELETE',
                userId: req.user?.id ? BigInt(req.user.id) : null
            }
        });
        await (0, auditService_1.createAuditLog)({
            action: 'DELETE_PRODUCT',
            entityId: id,
            entityType: 'PRODUCT',
            details: { name: product.name },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(204).json({
            status: 'success',
            data: null,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteProduct = deleteProduct;
const adjustStock = async (req, res, next) => {
    try {
        const { quantity, type, note } = req.body;
        const productId = BigInt(req.params.id);
        // Check if product exists
        const product = await prisma_1.default.product.findUnique({
            where: { id: productId }
        });
        if (!product) {
            return next(new error_1.AppError('No product found with that ID', 404));
        }
        if (product.stock !== null && product.stock + quantity < 0) {
            return next(new error_1.AppError(`Cannot remove ${Math.abs(quantity)} items. Only ${product.stock} available.`, 400));
        }
        // Transaction to ensure atomicity
        const [updatedProduct, movement] = await prisma_1.default.$transaction([
            prisma_1.default.product.update({
                where: { id: productId },
                data: {
                    stock: { increment: quantity }
                }
            }),
            prisma_1.default.stockMovement.create({
                data: {
                    productId,
                    quantity,
                    type,
                    note
                }
            }),
            prisma_1.default.productHistory.create({
                data: {
                    productId,
                    productName: product.name,
                    action: 'STOCK_ADJUST',
                    changes: { quantity, type, note },
                    userId: req.user?.id ? BigInt(req.user.id) : null
                }
            }),
            (0, auditService_1.createAuditLog)({
                action: 'STOCK_ADJUST',
                entityId: productId,
                entityType: 'PRODUCT',
                details: { quantity, type, note, name: product.name },
                userId: req.user?.id,
                ipAddress: req.ip
            })
        ]);
        res.status(200).json({
            status: 'success',
            data: {
                product: updatedProduct,
                movement
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.adjustStock = adjustStock;
const getProductHistory = async (req, res, next) => {
    try {
        const productId = BigInt(req.params.id);
        const product = await prisma_1.default.product.findUnique({ where: { id: productId } });
        if (!product)
            return next(new error_1.AppError('No product found with that ID', 404));
        const history = await prisma_1.default.productHistory.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({
            status: 'success',
            results: history.length,
            data: { history },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProductHistory = getProductHistory;
const getStockMovements = async (req, res, next) => {
    try {
        const productId = BigInt(req.params.id);
        const product = await prisma_1.default.product.findUnique({ where: { id: productId } });
        if (!product)
            return next(new error_1.AppError('No product found with that ID', 404));
        const movements = await prisma_1.default.stockMovement.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json({
            status: 'success',
            results: movements.length,
            data: { movements },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getStockMovements = getStockMovements;
const uploadProductImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new error_1.AppError('Please upload an image file', 400));
        }
        const id = BigInt(req.params.id);
        const imageUrl = `/uploads/${req.file.filename}`;
        let product = await prisma_1.default.product.findUnique({ where: { id } });
        if (!product) {
            // Might want to clean up uploaded file if product ignores it, but skipping for simplicity
            return next(new error_1.AppError('No product found with that ID', 404));
        }
        product = await prisma_1.default.product.update({
            where: { id },
            data: { imageUrl },
        });
        // Log history
        await prisma_1.default.productHistory.create({
            data: {
                productId: id,
                productName: product.name,
                action: 'UPDATE',
                changes: {
                    imageUrl: {
                        from: product.imageUrl,
                        to: imageUrl
                    }
                },
                userId: req.user?.id ? BigInt(req.user.id) : null
            }
        });
        await (0, auditService_1.createAuditLog)({
            action: 'UPDATE_PRODUCT_IMAGE',
            entityId: id,
            entityType: 'PRODUCT',
            details: { imageUrl },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(200).json({
            status: 'success',
            data: { product },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadProductImage = uploadProductImage;
