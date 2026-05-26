import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const results = await Promise.all([
            prisma.payment.aggregate({
                _sum: { amount: true }
            }),
            prisma.invoice.count({ where: { NOT: { status: 'CANCELLED' } } }),
            prisma.invoice.count({ where: { status: 'OVERDUE' } }),
            prisma.client.count(),
            prisma.invoice.groupBy({
                by: ['status'],
                _count: { _all: true },
            }),
            prisma.payment.findMany({
                where: {
                    date: {
                        gte: new Date(new Date().setDate(new Date().getDate() - 12 * 7))
                    }
                },
                select: { date: true, amount: true, isRefund: true },
                orderBy: { date: 'asc' }
            }),
            prisma.invoice.groupBy({
                by: ['clientId'],
                _sum: { total: true },
                orderBy: { _sum: { total: 'desc' } },
                take: 5
            }),
            prisma.invoiceItem.groupBy({
                by: ['productId'],
                _count: { _all: true },
                orderBy: { _count: { productId: 'desc' } },
                take: 5
            })
        ]);

        const [
            totalRevenue,
            totalInvoices,
            overdueInvoices,
            totalClients,
            statusCounts,
            monthlyRevenue,
            rawTopClients,
            rawTopProducts
        ] = results;

        const [totalInvoicesAmount, receivedForPending] = await Promise.all([
            prisma.invoice.aggregate({
                _sum: { total: true },
                where: {
                    AND: [
                        { NOT: { status: 'PAID' } },
                        { NOT: { status: 'CANCELLED' } }
                    ]
                }
            }),
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: {
                    invoice: {
                        AND: [
                            { NOT: { status: 'PAID' } },
                            { NOT: { status: 'CANCELLED' } }
                        ]
                    }
                }
            })
        ]);

        // Get Names
        const topClientsWithNames = await Promise.all(
            (rawTopClients as any).map(async (c: any) => {
                const client = await prisma.client.findUnique({ where: { id: c.clientId }, select: { name: true } });
                return { ...c, name: client?.name || 'Unknown' };
            })
        );

        const topProductsWithNames = await Promise.all(
            (rawTopProducts as any).map(async (p: any) => {
                if (!p.productId) return { ...p, name: 'Custom Item' };
                const product = await prisma.product.findUnique({ where: { id: p.productId }, select: { name: true } });
                return { ...p, name: product?.name || 'Unknown' };
            })
        );

        const totalRefundsValue = (await prisma.refund.aggregate({
            _sum: { amount: true }, // This is cash, but for dashboard summary it's often used. 
            // Wait, we need originalRequestedValue from metadata for accuracy.
        }));

        // For performance in dashboard, we might use a slightly different approach or a more complex query.
        // But to be consistent with my other fixes:
        const allPendingInvoices = await prisma.invoice.findMany({
            where: {
                AND: [
                    { NOT: { status: 'PAID' } },
                    { NOT: { status: 'CANCELLED' } },
                    { NOT: { status: 'REFUNDED' } }
                ]
            },
            select: {
                total: true,
                refunds: { select: { metadata: true } },
                creditNotes: { where: { OR: [{ status: 'APPLIED' }, { status: 'REFUNDED' }] }, select: { total: true } }
            }
        });

        const effectiveTotalPending = allPendingInvoices.reduce((sum, inv) => {
            const returns = inv.refunds.reduce((s, r) => {
                const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
                return s + parseFloat(meta?.originalRequestedValue?.toString() || '0');
            }, 0);
            const credits = inv.creditNotes.reduce((s, cn) => s + Number(cn.total), 0);
            return sum + Math.max(0, Number(inv.total) - returns - credits);
        }, 0);

        const pendingAmount = effectiveTotalPending - (Number(receivedForPending._sum.amount) || 0);

        res.status(200).json({
            status: 'success',
            data: {
                totalRevenue: totalRevenue._sum.amount || 0,
                pendingAmount: pendingAmount,
                totalInvoices,
                overdueInvoices,
                totalClients,
                statusDistribution: statusCounts.reduce((acc: any, curr: any) => {
                    acc[curr.status] = curr._count._all;
                    return acc;
                }, {}),
                cashFlow: (() => {
                    const cashFlowMap = new Map();
                    (monthlyRevenue as any[]).forEach((p: any) => {
                        const d = new Date(p.date);
                        const day = d.getDay();
                        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                        const monday = new Date(d.setDate(diff));
                        monday.setHours(0, 0, 0, 0);
                        const key = monday.toLocaleString('en-GB', { day: 'numeric', month: 'short' });

                        if (!cashFlowMap.has(key)) {
                            cashFlowMap.set(key, { name: key, income: 0, expense: 0, sortDate: monday.getTime() });
                        }
                        const entry = cashFlowMap.get(key);
                        if (p.isRefund) entry.expense -= Number(p.amount);
                        else entry.income += Number(p.amount);
                    });
                    return Array.from(cashFlowMap.values()).sort((a: any, b: any) => a.sortDate - b.sortDate);
                })(),
                topClients: topClientsWithNames,
                topProducts: topProductsWithNames
            },
        });
    } catch (error) {
        next(error);
    }
};
