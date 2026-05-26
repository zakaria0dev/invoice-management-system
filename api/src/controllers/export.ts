import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { exportToCSV, exportToExcel } from '../services/exportService';

export const exportInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { format, ids, startDate, endDate, status } = req.query;

        const where: any = {};
        if (ids) {
            where.id = { in: (ids as string).split(',').map(id => id.trim()) };
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }
        if (status && status !== 'all') {
            where.status = status;
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: { client: true },
            orderBy: { createdAt: 'desc' }
        });

        const data = invoices.map((inv: any) => ({
            number: inv.number,
            client: inv.client.name,
            date: inv.date.toLocaleDateString(),
            total: Number(inv.total),
            status: inv.status,
        }));

        if (format === 'csv') {
            const csv = exportToCSV(data, ['number', 'client', 'date', 'total', 'status']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
            return res.send(csv);
        }

        if (format === 'excel') {
            const buffer = await exportToExcel(data, 'Invoices');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=invoices.xlsx');
            return res.send(buffer);
        }

        res.status(400).json({ status: 'error', message: 'Invalid format' });
    } catch (error) {
        next(error);
    }
};

export const exportQuotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { format, ids, startDate, endDate, status } = req.query;

        const where: any = {};
        if (ids) {
            where.id = { in: (ids as string).split(',').map(id => id.trim()) };
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate as string);
            if (endDate) where.date.lte = new Date(endDate as string);
        }
        if (status && status !== 'all') {
            where.status = status;
        }

        const quotes = await prisma.quote.findMany({
            where,
            include: { client: true },
            orderBy: { createdAt: 'desc' }
        });

        const data = quotes.map((q: any) => ({
            number: q.number,
            client: q.client.name,
            date: q.date.toLocaleDateString(),
            validUntil: q.validUntil.toLocaleDateString(),
            total: Number(q.total),
            status: q.status,
        }));

        if (format === 'csv') {
            const csv = exportToCSV(data, ['number', 'client', 'date', 'validUntil', 'total', 'status']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=quotes.csv');
            return res.send(csv);
        }

        if (format === 'excel') {
            const buffer = await exportToExcel(data, 'Quotes');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=quotes.xlsx');
            return res.send(buffer);
        }

        res.status(400).json({ status: 'error', message: 'Invalid format' });
    } catch (error) {
        next(error);
    }
};
