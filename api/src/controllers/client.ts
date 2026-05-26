import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/error';
import { clientSchema } from '../validators/client';
import { encrypt, decrypt } from '../utils/encryption';
import { createAuditLog } from '../services/auditService';

export const getAllClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: 'desc' },
        });

        // Decrypt sensitive fields
        const decryptedClients = clients.map(client => ({
            ...client,
            ice: decrypt(client.ice || ''),
            phone: decrypt(client.phone || '')
        }));

        res.status(200).json({
            status: 'success',
            results: decryptedClients.length,
            data: { clients: decryptedClients },
        });
    } catch (error) {
        next(error);
    }
};

export const getClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const client = await prisma.client.findUnique({
            where: { id: BigInt(req.params.id) },
            include: {
                invoices: true,
                quotes: true,
            },
        });

        if (client) {
            client.ice = decrypt(client.ice || '');
            client.phone = decrypt(client.phone || '');
        }

        res.status(200).json({
            status: 'success',
            data: { client },
        });
    } catch (error) {
        next(error);
    }
};

export const createClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = clientSchema.shape.body.safeParse(req.body);
        if (!result.success) {
            return next(new AppError(result.error.issues[0].message, 400));
        }

        const data = { ...result.data };
        if (data.ice) data.ice = encrypt(data.ice);
        if (data.phone) data.phone = encrypt(data.phone);

        const client = await prisma.client.create({
            data,
        });

        // Decrypt for response
        client.ice = decrypt(client.ice || '');
        client.phone = decrypt(client.phone || '');

        await createAuditLog({
            action: 'CREATE_CLIENT',
            entityId: client.id,
            entityType: 'CLIENT',
            details: { name: client.name, email: client.email },
            userId: (req as any).user?.id,
            ipAddress: req.ip
        });

        res.status(201).json({
            status: 'success',
            data: { client },
        });
    } catch (error) {
        next(error);
    }
};

export const updateClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = clientSchema.shape.body.partial().safeParse(req.body);
        if (!result.success) {
            return next(new AppError(result.error.issues[0].message, 400));
        }

        const data = { ...result.data };
        if (data.ice) data.ice = encrypt(data.ice);
        if (data.phone) data.phone = encrypt(data.phone);

        const client = await prisma.client.update({
            where: { id: BigInt(req.params.id) },
            data,
        });

        // Decrypt for response
        client.ice = decrypt(client.ice || '');
        client.phone = decrypt(client.phone || '');

        await createAuditLog({
            action: 'UPDATE_CLIENT',
            entityId: client.id,
            entityType: 'CLIENT',
            details: { name: client.name },
            userId: (req as any).user?.id,
            ipAddress: req.ip
        });

        res.status(200).json({
            status: 'success',
            data: { client },
        });
    } catch (error) {
        next(error);
    }
};

export const deleteClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = BigInt(req.params.id);

        // Check if client exists and has related records
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        invoices: true,
                        quotes: true,
                        creditNotes: true,
                    }
                }
            }
        });

        if (!client) {
            return next(new AppError('Client not found', 404));
        }

        // Prevent deletion if related records exist
        if (client._count.invoices > 0 || client._count.quotes > 0 || client._count.creditNotes > 0) {
            const reasons = [];
            if (client._count.invoices > 0) reasons.push(`${client._count.invoices} invoices`);
            if (client._count.quotes > 0) reasons.push(`${client._count.quotes} quotes`);
            if (client._count.creditNotes > 0) reasons.push(`${client._count.creditNotes} credit notes`);

            return next(new AppError(`Cannot delete client with existing ${reasons.join(', ')}. Please delete or reassign those records first.`, 400));
        }

        await prisma.client.delete({
            where: { id },
        });

        await createAuditLog({
            action: 'DELETE_CLIENT',
            entityId: id,
            entityType: 'CLIENT',
            details: { name: client.name },
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

import multer from 'multer';
import { parse } from 'json2csv';
import ExcelJS from 'exceljs';

export const exportClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const format = req.query.format as string || 'excel';
        const clients = await prisma.client.findMany({
            orderBy: { name: 'asc' }
        });

        if (format === 'csv') {
            const csv = parse(clients);
            res.header('Content-Type', 'text/csv');
            res.attachment('clients.csv');
            return res.send(csv);
        }

        // Excel
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Clients');
        sheet.columns = [
            { header: 'Raison sociale', key: 'name', width: 30 },
            { header: 'ICE', key: 'ice', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Téléphone', key: 'phone', width: 20 },
            { header: 'Adresse', key: 'address', width: 30 },
        ];

        // Decrypt sensitive fields for export
        const exportData = clients.map(client => ({
            ...client,
            ice: decrypt(client.ice || ''),
            phone: decrypt(client.phone || '')
        }));

        sheet.addRows(exportData);

        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('clients.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

export const getImportTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Template');
        sheet.columns = [
            { header: 'Raison sociale (Required)', key: 'name', width: 30 },
            { header: 'ICE', key: 'ice', width: 20 },
            { header: 'Email (Required)', key: 'email', width: 30 },
            { header: 'Téléphone', key: 'phone', width: 20 },
            { header: 'Adresse', key: 'address', width: 30 },
        ];

        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('clients_template.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        next(error);
    }
};

export const importClients = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return next(new AppError('No file uploaded', 400));
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer as any);
        const worksheet = workbook.worksheets[0];

        const validClients: any[] = [];
        const errors: any[] = [];

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const rowData = {
                name: row.getCell(1).value?.toString(),
                ice: row.getCell(2).value?.toString(),
                email: row.getCell(3).value?.toString(),
                phone: row.getCell(4).value?.toString(),
                address: row.getCell(5).value?.toString(),
            };

            const validation = clientSchema.safeParse(rowData);
            if (validation.success) {
                validClients.push(validation.data);
            } else {
                errors.push({ row: rowNumber, error: validation.error.issues.map(i => i.message).join(', ') });
            }
        });

        if (validClients.length > 0) {
            // Encrypt sensitive fields before bulk creation
            const encryptedClients = validClients.map(client => ({
                ...client,
                ice: client.ice ? encrypt(client.ice) : client.ice,
                phone: client.phone ? encrypt(client.phone) : client.phone
            }));

            await prisma.client.createMany({
                data: encryptedClients,
                skipDuplicates: true,
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                imported: validClients.length,
                errors
            }
        });
    } catch (error) {
        next(error);
    }
};
