"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importClients = exports.getImportTemplate = exports.exportClients = exports.deleteClient = exports.updateClient = exports.createClient = exports.getClient = exports.getAllClients = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const error_1 = require("../middleware/error");
const client_1 = require("../validators/client");
const encryption_1 = require("../utils/encryption");
const auditService_1 = require("../services/auditService");
const getAllClients = async (req, res, next) => {
    try {
        const clients = await prisma_1.default.client.findMany({
            orderBy: { createdAt: 'desc' },
        });
        // Decrypt sensitive fields
        const decryptedClients = clients.map(client => ({
            ...client,
            ice: (0, encryption_1.decrypt)(client.ice || ''),
            phone: (0, encryption_1.decrypt)(client.phone || '')
        }));
        res.status(200).json({
            status: 'success',
            results: decryptedClients.length,
            data: { clients: decryptedClients },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllClients = getAllClients;
const getClient = async (req, res, next) => {
    try {
        const client = await prisma_1.default.client.findUnique({
            where: { id: BigInt(req.params.id) },
            include: {
                invoices: true,
                quotes: true,
            },
        });
        if (client) {
            client.ice = (0, encryption_1.decrypt)(client.ice || '');
            client.phone = (0, encryption_1.decrypt)(client.phone || '');
        }
        res.status(200).json({
            status: 'success',
            data: { client },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getClient = getClient;
const createClient = async (req, res, next) => {
    try {
        const result = client_1.clientSchema.shape.body.safeParse(req.body);
        if (!result.success) {
            return next(new error_1.AppError(result.error.issues[0].message, 400));
        }
        const data = { ...result.data };
        if (data.ice)
            data.ice = (0, encryption_1.encrypt)(data.ice);
        if (data.phone)
            data.phone = (0, encryption_1.encrypt)(data.phone);
        const client = await prisma_1.default.client.create({
            data,
        });
        // Decrypt for response
        client.ice = (0, encryption_1.decrypt)(client.ice || '');
        client.phone = (0, encryption_1.decrypt)(client.phone || '');
        await (0, auditService_1.createAuditLog)({
            action: 'CREATE_CLIENT',
            entityId: client.id,
            entityType: 'CLIENT',
            details: { name: client.name, email: client.email },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(201).json({
            status: 'success',
            data: { client },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createClient = createClient;
const updateClient = async (req, res, next) => {
    try {
        const result = client_1.clientSchema.shape.body.partial().safeParse(req.body);
        if (!result.success) {
            return next(new error_1.AppError(result.error.issues[0].message, 400));
        }
        const data = { ...result.data };
        if (data.ice)
            data.ice = (0, encryption_1.encrypt)(data.ice);
        if (data.phone)
            data.phone = (0, encryption_1.encrypt)(data.phone);
        const client = await prisma_1.default.client.update({
            where: { id: BigInt(req.params.id) },
            data,
        });
        // Decrypt for response
        client.ice = (0, encryption_1.decrypt)(client.ice || '');
        client.phone = (0, encryption_1.decrypt)(client.phone || '');
        await (0, auditService_1.createAuditLog)({
            action: 'UPDATE_CLIENT',
            entityId: client.id,
            entityType: 'CLIENT',
            details: { name: client.name },
            userId: req.user?.id,
            ipAddress: req.ip
        });
        res.status(200).json({
            status: 'success',
            data: { client },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateClient = updateClient;
const deleteClient = async (req, res, next) => {
    try {
        const id = BigInt(req.params.id);
        // Check if client exists and has related records
        const client = await prisma_1.default.client.findUnique({
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
            return next(new error_1.AppError('Client not found', 404));
        }
        // Prevent deletion if related records exist
        if (client._count.invoices > 0 || client._count.quotes > 0 || client._count.creditNotes > 0) {
            const reasons = [];
            if (client._count.invoices > 0)
                reasons.push(`${client._count.invoices} invoices`);
            if (client._count.quotes > 0)
                reasons.push(`${client._count.quotes} quotes`);
            if (client._count.creditNotes > 0)
                reasons.push(`${client._count.creditNotes} credit notes`);
            return next(new error_1.AppError(`Cannot delete client with existing ${reasons.join(', ')}. Please delete or reassign those records first.`, 400));
        }
        await prisma_1.default.client.delete({
            where: { id },
        });
        await (0, auditService_1.createAuditLog)({
            action: 'DELETE_CLIENT',
            entityId: id,
            entityType: 'CLIENT',
            details: { name: client.name },
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
exports.deleteClient = deleteClient;
const json2csv_1 = require("json2csv");
const exceljs_1 = __importDefault(require("exceljs"));
const exportClients = async (req, res, next) => {
    try {
        const format = req.query.format || 'excel';
        const clients = await prisma_1.default.client.findMany({
            orderBy: { name: 'asc' }
        });
        if (format === 'csv') {
            const csv = (0, json2csv_1.parse)(clients);
            res.header('Content-Type', 'text/csv');
            res.attachment('clients.csv');
            return res.send(csv);
        }
        // Excel
        const workbook = new exceljs_1.default.Workbook();
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
            ice: (0, encryption_1.decrypt)(client.ice || ''),
            phone: (0, encryption_1.decrypt)(client.phone || '')
        }));
        sheet.addRows(exportData);
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment('clients.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        next(error);
    }
};
exports.exportClients = exportClients;
const getImportTemplate = async (req, res, next) => {
    try {
        const workbook = new exceljs_1.default.Workbook();
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
    }
    catch (error) {
        next(error);
    }
};
exports.getImportTemplate = getImportTemplate;
const importClients = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new error_1.AppError('No file uploaded', 400));
        }
        const workbook = new exceljs_1.default.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        const validClients = [];
        const errors = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1)
                return; // Skip header
            const rowData = {
                name: row.getCell(1).value?.toString(),
                ice: row.getCell(2).value?.toString(),
                email: row.getCell(3).value?.toString(),
                phone: row.getCell(4).value?.toString(),
                address: row.getCell(5).value?.toString(),
            };
            const validation = client_1.clientSchema.safeParse(rowData);
            if (validation.success) {
                validClients.push(validation.data);
            }
            else {
                errors.push({ row: rowNumber, error: validation.error.issues.map(i => i.message).join(', ') });
            }
        });
        if (validClients.length > 0) {
            // Encrypt sensitive fields before bulk creation
            const encryptedClients = validClients.map(client => ({
                ...client,
                ice: client.ice ? (0, encryption_1.encrypt)(client.ice) : client.ice,
                phone: client.phone ? (0, encryption_1.encrypt)(client.phone) : client.phone
            }));
            await prisma_1.default.client.createMany({
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
    }
    catch (error) {
        next(error);
    }
};
exports.importClients = importClients;
