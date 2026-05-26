import { Invoice } from '@/types';
import { useAppStore } from '@/store/useAppStore';

export const useSmartButtons = (invoice: Invoice) => {
    const { updateInvoice, addPayment } = useAppStore();

    const status = invoice.status;
    const total = parseFloat(invoice.total.toString());
    const paid = invoice.payments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0;
    const isOverpaid = paid > total;
    const isCancelled = invoice.isCancelled;

    const buttons = {
        view: true,
        edit: ['DRAFT', 'SENT'].includes(status),

        // Payment actions
        markPaid: status !== 'PAID' && status !== 'CANCELLED' && paid < total && status !== 'DRAFT',
        addPayment: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(status) && paid < total - 0.01,

        // Credit notes
        creditNote: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(status) && !isOverpaid,

        // Advanced actions
        sendReminder: ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(status),
        cancel: ['DRAFT', 'SENT', 'OVERDUE'].includes(status) && paid === 0,
        duplicate: true,
        pdf: true,
        refund: ['PAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(status) && paid > 0 && !isCancelled,
    };

    const handleAction = async (action: string, data?: any) => {
        switch (action) {
            case 'markPaid':
                const remaining = total - paid;
                if (remaining > 0) {
                    await addPayment({
                        invoiceId: invoice.id,
                        amount: remaining,
                        method: data?.method || 'BANK_TRANSFER',
                        date: new Date().toISOString()
                    });
                }
                break;
            case 'cancel':
                if (confirm('Are you sure you want to cancel this invoice?')) {
                    await updateInvoice(invoice.id, { isCancelled: true });
                    const { fetchInvoices, fetchProducts } = useAppStore.getState();
                    await fetchInvoices(); // Force refresh to ensure state is synced
                    await fetchProducts(); // Also refresh products to show restored stock
                }
                break;
        }
    };

    return { buttons, handleAction };
};
