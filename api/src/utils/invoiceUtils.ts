import { InvoiceStatus } from '@prisma/client';

export interface InvoiceWithPayments {
    id: bigint | number;
    total: number | string | any;
    dueDate: Date;
    isCancelled: boolean;
    status: string;
    payments?: { amount: number | string | any, isRefund?: boolean }[];
    refunds?: { amount: number | string | any, metadata?: any }[];
    creditNotes?: { total: number | string | any, status: string }[];
}

/**
 * FORMALIZED REFUND & STATUS LOGIC (MINI-SPEC):
 * 
 * 1. DEFINITIONS:
 *    - Effective Total (ET): Original Total - Returned Items Value - Applied Credits.
 *    - Net Paid (NP): All positive payments - All cash refunds given back.
 *    - Remaining Balance (RB): Effective Total - Net Paid.
 * 
 * 2. STATUS PRIORITY:
 *    - REFUNDED: ET <= 0 (Items returned cover the whole invoice value).
 *    - SETTLED_WITH_RETURNS: RB <= 0 AND ET > 0 AND Returns > 0.
 *    - PAID: RB <= 0 AND Returns == 0.
 *    - PARTIALLY_PAID: RB > 0 AND NP > 0.
 *    - OVERDUE: RB > 0 AND Today > DueDate.
 *    - SENT/DRAFT: RB > 0 AND today <= DueDate.
 */

export const calculateInvoiceMetrics = (invoice: InvoiceWithPayments) => {
    const originalTotal = parseFloat(invoice.total?.toString() || '0');

    // Returns Value: Sum of originalRequestedValue from all refunds
    const returnsValue = invoice.refunds?.reduce((sum: number, r: any) => {
        let metadata = r.metadata;
        if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
        }
        return sum + parseFloat(metadata?.originalRequestedValue?.toString() || '0');
    }, 0) || 0;

    // Applied Credits: Sum of applied credit notes
    const appliedCredits = invoice.creditNotes?.filter((cn: any) =>
        cn.status === 'APPLIED' || cn.status === 'REFUNDED'
    ).reduce((sum: number, cn: any) => sum + parseFloat(cn.total?.toString() || '0'), 0) || 0;

    // Payments: All positive payment records
    const paymentsReceived = invoice.payments?.filter((p: any) => !p.isRefund)
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount?.toString() || '0'), 0) || 0;

    // Cash Refunds: All negative payment records (absolute value)
    const cashRefundsGiven = Math.abs(invoice.payments?.filter((p: any) => p.isRefund)
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount?.toString() || '0'), 0) || 0);

    const netPaid = paymentsReceived - cashRefundsGiven;
    const effectiveTotal = Math.max(0, originalTotal - returnsValue - appliedCredits);
    const remainingBalance = Math.max(0, effectiveTotal - netPaid);

    return {
        effectiveTotal,
        netPaid,
        remainingBalance,
        returnsValue,
        appliedCredits,
        isSettled: remainingBalance <= 0.01
    };
};

export const calculateInvoiceStatus = (invoice: InvoiceWithPayments): InvoiceStatus => {
    if (invoice.isCancelled || invoice.status === 'CANCELLED') return 'CANCELLED' as InvoiceStatus;

    const { effectiveTotal, remainingBalance, returnsValue, isSettled } = calculateInvoiceMetrics(invoice);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    // 1. Fully Refunded / Credited (Effective cost is zero)
    if (effectiveTotal <= 0.01 && returnsValue > 0) return 'REFUNDED' as InvoiceStatus;
    if (effectiveTotal <= 0.01) return 'CREDITED' as InvoiceStatus;

    // 2. Settled (Balance is zero)
    if (isSettled) {
        if (returnsValue > 0) return 'SETTLED_WITH_RETURNS' as any; // Cast to any if client not updated yet
        return 'PAID' as InvoiceStatus;
    }

    // 3. Unsettled (Balance remains)
    if (remainingBalance < effectiveTotal - 0.01) return 'PARTIALLY_PAID' as InvoiceStatus;
    if (today > dueDate) return 'OVERDUE' as InvoiceStatus;

    return (invoice.status === 'DRAFT' ? 'DRAFT' : 'SENT') as InvoiceStatus;
};
