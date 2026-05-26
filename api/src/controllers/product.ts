import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error';
import { productSchema, stockAdjustmentSchema } from '../validators/product';
import { createAuditLog } from '../services/auditService';

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: { name: 'asc' },
        });

        res.status(200).json({
            status: 'success',
            results: products.length,
            data: { products },
        });
    } catch (error) {
        next(error);
    }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = productSchema.parse({ body: req.body });
        const productData = validatedData.body;

        const product = await prisma.product.create({
            data: productData as any,
        });

        // Log history
        await (prisma as any).productHistory.create({
            data: {
                productId: product.id,
                productName: product.name,
                action: 'CREATE',
                changes: productData,
                userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
            }
        });

        await createAuditLog({
            action: 'CREATE_PRODUCT',
            entityId: product.id,
            entityType: 'PRODUCT',
            details: { name: product.name },
            userId: (req as any).user?.id,
            ipAddress: req.ip
        });

        res.status(201).json({
            status: 'success',
            data: { product },
        });
    } catch (error) {
        console.error('Error in createProduct:', error);
        next(error);
    }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validatedData = productSchema.parse({ body: req.body });
        const productData = validatedData.body;

        const id = BigInt(req.params.id as string);
        const oldProduct = await prisma.product.findUnique({ where: { id } });

        if (!oldProduct) {
            return next(new AppError('No product found with that ID', 404));
        }

        const product = await prisma.product.update({
            where: { id },
            data: productData as any,
        });

        // Calculate changes
        const changes: any = {};
        for (const key in productData) {
            const oldValue = (oldProduct as any)[key];
            const newValue = (productData as any)[key];

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
            await (prisma as any).productHistory.create({
                data: {
                    productId: id,
                    productName: product.name,
                    action: 'UPDATE',
                    changes,
                    userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
                }
            });

            await createAuditLog({
                action: 'UPDATE_PRODUCT',
                entityId: id,
                entityType: 'PRODUCT',
                details: changes,
                userId: (req as any).user?.id,
                ipAddress: req.ip
            });
        }

        res.status(200).json({
            status: 'success',
            data: { product },
        });
    } catch (error) {
        console.error('Error in updateProduct:', error);
        next(error);
    }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = BigInt(req.params.id as string);
        const product = await prisma.product.findUnique({
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
            return next(new AppError('No product found with that ID', 404));
        }

        // Prevent deletion if related records exist
        if (product._count.invoiceItems > 0 || product._count.quoteItems > 0 || product._count.creditNoteItems > 0) {
            const reasons = [];
            if (product._count.invoiceItems > 0) reasons.push(`${product._count.invoiceItems} invoices`);
            if (product._count.quoteItems > 0) reasons.push(`${product._count.quoteItems} quotes`);
            if (product._count.creditNoteItems > 0) reasons.push(`${product._count.creditNoteItems} credit notes`);

            return next(new AppError(`Cannot delete product used in ${reasons.join(', ')}. Please delete those documents first or deactivate the product.`, 400));
        }

        await prisma.product.delete({
            where: { id },
        });

        // Log history
        await (prisma as any).productHistory.create({
            data: {
                productId: id,
                productName: product.name,
                action: 'DELETE',
                userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
            }
        });

        await createAuditLog({
            action: 'DELETE_PRODUCT',
            entityId: id,
            entityType: 'PRODUCT',
            details: { name: product.name },
            userId: (req as any).user?.id,
            ipAddress: req.ip
        });

        res.status(204).json({
            status: 'success',
            data: null,
        });
    } catch (error) {
        next(error);
    }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { quantity, type, note } = req.body;
        const productId = BigInt(req.params.id as string);

        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return next(new AppError('No product found with that ID', 404));
        }

        if (product.stock !== null && product.stock + quantity < 0) {
            return next(new AppError(`Cannot remove ${Math.abs(quantity)} items. Only ${product.stock} available.`, 400));
        }

        // Transaction to ensure atomicity
        const [updatedProduct, movement] = await prisma.$transaction([
            prisma.product.update({
                where: { id: productId },
                data: {
                    stock: { increment: quantity }
                }
            }),
            prisma.stockMovement.create({
                data: {
                    productId,
                    quantity,
                    type,
                    note
                }
            }),
            (prisma as any).productHistory.create({
                data: {
                    productId,
                    productName: product.name,
                    action: 'STOCK_ADJUST',
                    changes: { quantity, type, note },
                    userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
                }
            }),
            createAuditLog({
                action: 'STOCK_ADJUST',
                entityId: productId,
                entityType: 'PRODUCT',
                details: { quantity, type, note, name: product.name },
                userId: (req as any).user?.id,
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
    } catch (error) {
        next(error);
    }
};

export const getProductHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = BigInt(req.params.id as string);
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return next(new AppError('No product found with that ID', 404));

        const history = await (prisma as any).productHistory.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({
            status: 'success',
            results: history.length,
            data: { history },
        });
    } catch (error) {
        next(error);
    }
};

export const getStockMovements = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = BigInt(req.params.id as string);
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return next(new AppError('No product found with that ID', 404));

        const movements = await prisma.stockMovement.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({
            status: 'success',
            results: movements.length,
            data: { movements },
        });
    } catch (error) {
        next(error);
    }
};

export const uploadProductImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return next(new AppError('Please upload an image file', 400));
        }

        const id = BigInt(req.params.id as string);
        const imageUrl = `/uploads/${req.file.filename}`;

        let product = await prisma.product.findUnique({ where: { id } });

        if (!product) {
            // Might want to clean up uploaded file if product ignores it, but skipping for simplicity
            return next(new AppError('No product found with that ID', 404));
        }

        product = await prisma.product.update({
            where: { id },
            data: { imageUrl } as any,
        });

        // Log history
        await (prisma as any).productHistory.create({
            data: {
                productId: id,
                productName: product.name,
                action: 'UPDATE',
                changes: {
                    imageUrl: {
                        from: (product as any).imageUrl,
                        to: imageUrl
                    }
                },
                userId: (req as any).user?.id ? BigInt((req as any).user.id) : null
            }
        });

        await createAuditLog({
            action: 'UPDATE_PRODUCT_IMAGE',
            entityId: id,
            entityType: 'PRODUCT',
            details: { imageUrl },
            userId: (req as any).user?.id,
            ipAddress: req.ip
        });

        res.status(200).json({
            status: 'success',
            data: { product },
        });
    } catch (error) {
        next(error);
    }
};
