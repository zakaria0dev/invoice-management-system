"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOverdueCron = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../config/prisma"));
const initOverdueCron = () => {
    // Run every day at midnight
    node_cron_1.default.schedule('0 0 * * *', async () => {
        console.log('Running daily overdue status check...');
        try {
            const now = new Date();
            // Find all invoices that are not PAID or CANCELLED, and are past due date
            const overdueInvoices = await prisma_1.default.invoice.updateMany({
                where: {
                    dueDate: { lt: now },
                    status: {
                        notIn: ['PAID', 'CANCELLED', 'OVERDUE']
                    }
                },
                data: {
                    status: 'OVERDUE'
                }
            });
            console.log(`Updated ${overdueInvoices.count} invoices to OVERDUE status.`);
        }
        catch (error) {
            console.error('Error in overdue status cron:', error);
        }
    });
    console.log('Overdue status cron job initialized.');
};
exports.initOverdueCron = initOverdueCron;
