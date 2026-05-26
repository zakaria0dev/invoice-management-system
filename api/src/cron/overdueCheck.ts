import cron from 'node-cron';
import prisma from '../config/prisma';

export const initOverdueCron = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('Running daily overdue status check...');
        try {
            const now = new Date();

            // Find all invoices that are not PAID or CANCELLED, and are past due date
            const overdueInvoices = await prisma.invoice.updateMany({
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
        } catch (error) {
            console.error('Error in overdue status cron:', error);
        }
    });

    console.log('Overdue status cron job initialized.');
};
