"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportQuotes = exports.exportInvoices = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const exportService_1 = require("../services/exportService");
const exportInvoices = async (req, res, next) => {
    try {
        const { format, ids, startDate, endDate, status } = req.query;
        const where = {};
        if (ids) {
            where.id = { in: ids.split(',').map(id => id.trim()) };
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        const invoices = await prisma_1.default.invoice.findMany({
            where,
            include: { client: true },
            orderBy: { createdAt: 'desc' }
        });
        const data = invoices.map((inv) => ({
            number: inv.number,
            client: inv.client.name,
            date: inv.date.toLocaleDateString(),
            total: Number(inv.total),
            status: inv.status,
        }));
        if (format === 'csv') {
            const csv = (0, exportService_1.exportToCSV)(data, ['number', 'client', 'date', 'total', 'status']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
            return res.send(csv);
        }
        if (format === 'excel') {
            const buffer = await (0, exportService_1.exportToExcel)(data, 'Invoices');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=invoices.xlsx');
            return res.send(buffer);
        }
        res.status(400).json({ status: 'error', message: 'Invalid format' });
    }
    catch (error) {
        next(error);
    }
};
exports.exportInvoices = exportInvoices;
const exportQuotes = async (req, res, next) => {
    try {
        const { format, ids, startDate, endDate, status } = req.query;
        const where = {};
        if (ids) {
            where.id = { in: ids.split(',').map(id => id.trim()) };
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        const quotes = await prisma_1.default.quote.findMany({
            where,
            include: { client: true },
            orderBy: { createdAt: 'desc' }
        });
        const data = quotes.map((q) => ({
            number: q.number,
            client: q.client.name,
            date: q.date.toLocaleDateString(),
            validUntil: q.validUntil.toLocaleDateString(),
            total: Number(q.total),
            status: q.status,
        }));
        if (format === 'csv') {
            const csv = (0, exportService_1.exportToCSV)(data, ['number', 'client', 'date', 'validUntil', 'total', 'status']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=quotes.csv');
            return res.send(csv);
        }
        if (format === 'excel') {
            const buffer = await (0, exportService_1.exportToExcel)(data, 'Quotes');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=quotes.xlsx');
            return res.send(buffer);
        }
        res.status(400).json({ status: 'error', message: 'Invalid format' });
    }
    catch (error) {
        next(error);
    }
};
exports.exportQuotes = exportQuotes;
