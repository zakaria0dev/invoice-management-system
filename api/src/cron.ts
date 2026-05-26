import cron from 'node-cron';
import { processOverdueInvoices } from './services/reminderService';

// Run every Sunday at 08:00 AM for weekly weekend reminders
cron.schedule('0 8 * * 0', async () => {
    console.log('[Cron] Running weekend overdue processing and reminders...');
    try {
        await processOverdueInvoices();
        console.log('[Cron] Weekend processing completed successfully.');
    } catch (error) {
        console.error('[Cron Error] Error in weekend job:', error);
    }
});
