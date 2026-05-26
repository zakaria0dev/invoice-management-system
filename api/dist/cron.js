"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const reminderService_1 = require("./services/reminderService");
// Run every Sunday at 08:00 AM for weekly weekend reminders
node_cron_1.default.schedule('0 8 * * 0', async () => {
    console.log('[Cron] Running weekend overdue processing and reminders...');
    try {
        await (0, reminderService_1.processOverdueInvoices)();
        console.log('[Cron] Weekend processing completed successfully.');
    }
    catch (error) {
        console.error('[Cron Error] Error in weekend job:', error);
    }
});
