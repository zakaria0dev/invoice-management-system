"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextCreditNoteNumber = exports.getNextQuoteNumber = exports.getNextInvoiceNumber = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getClient = (client) => client ?? prisma_1.default;
const getNextInvoiceNumber = async (client) => {
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
exports.getNextInvoiceNumber = getNextInvoiceNumber;
const getNextQuoteNumber = async () => {
    const prefix = 'QT-'; // User might want DEV- or QT-, staying consistent with pattern
    const lastQuotes = await prisma_1.default.quote.findMany({
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
exports.getNextQuoteNumber = getNextQuoteNumber;
const getNextCreditNoteNumber = async () => {
    const prefix = 'AV-';
    const lastCreditNotes = await prisma_1.default.creditNote.findMany({
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
exports.getNextCreditNoteNumber = getNextCreditNoteNumber;
