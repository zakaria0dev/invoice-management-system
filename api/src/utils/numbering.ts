import prisma from '../config/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Robust numbering utility for Invoices, Quotes, and Credit Notes.
 * Uses pattern matching to find the highest number and increment it.
 *
 * The helpers accept an optional Prisma client/transaction so they can be used
 * safely inside `prisma.$transaction` to avoid race conditions.
 */

type PrismaClientOrTx = Prisma.TransactionClient | typeof prisma;

const getClient = (client?: PrismaClientOrTx) => client ?? prisma;

export const getNextInvoiceNumber = async (client?: PrismaClientOrTx) => {
    const c = getClient(client);
    const prefix = 'INV-';

    // Find recent invoices with this prefix to determine the next number
    const lastInvoices = await c.invoice.findMany({
        where: {
            number: { startsWith: prefix }
        },
        select: { number: true },
        orderBy: { number: 'desc' },
        take: 10
    });

    let maxNum = 0;
    lastInvoices.forEach(inv => {
        const parts = inv.number.split('-');
        const numPart = parseInt(parts[parts.length - 1]);
        if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
        }
    });

    return `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;
};

export const getNextQuoteNumber = async () => {
    const prefix = 'QT-'; // User might want DEV- or QT-, staying consistent with pattern
    const lastQuotes = await prisma.quote.findMany({
        where: {
            number: { startsWith: prefix }
        },
        select: { number: true },
        orderBy: { number: 'desc' },
        take: 5
    });

    let maxNum = 0;
    lastQuotes.forEach(q => {
        const parts = q.number.split('-');
        const numPart = parseInt(parts[parts.length - 1]);
        if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
        }
    });

    return `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;
};

export const getNextCreditNoteNumber = async () => {
    const prefix = 'AV-';
    const lastCreditNotes = await prisma.creditNote.findMany({
        where: {
            number: { startsWith: prefix }
        },
        select: { number: true },
        orderBy: { number: 'desc' },
        take: 5
    });

    let maxNum = 0;
    lastCreditNotes.forEach(cn => {
        const parts = cn.number.split('-');
        const numPart = parseInt(parts[parts.length - 1]);
        if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
        }
    });

    return `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;
};
