"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateInvoiceStatus = exports.calculateInvoiceMetrics = void 0;
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
const calculateInvoiceMetrics = (invoice) => {
    const originalTotal = parseFloat(invoice.total?.toString() || '0');
    // Returns Value: Sum of originalRequestedValue from all refunds
    const returnsValue = invoice.refunds?.reduce((sum, r) => {
        let metadata = r.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            }
            catch (e) {
                metadata = {};
            }
        }
        return sum + parseFloat(metadata?.originalRequestedValue?.toString() || '0');
    }, 0) || 0;
    // Applied Credits: Sum of applied credit notes
    const appliedCredits = invoice.creditNotes?.filter((cn) => cn.status === 'APPLIED' || cn.status === 'REFUNDED').reduce((sum, cn) => sum + parseFloat(cn.total?.toString() || '0'), 0) || 0;
    // Payments: All positive payment records
    const paymentsReceived = invoice.payments?.filter((p) => !p.isRefund)
        .reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0) || 0;
    // Cash Refunds: All negative payment records (absolute value)
    const cashRefundsGiven = Math.abs(invoice.payments?.filter((p) => p.isRefund)
        .reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0) || 0);
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
exports.calculateInvoiceMetrics = calculateInvoiceMetrics;
const calculateInvoiceStatus = (invoice) => {
    if (invoice.isCancelled || invoice.status === 'CANCELLED')
        return 'CANCELLED';
    const { effectiveTotal, remainingBalance, returnsValue, isSettled } = (0, exports.calculateInvoiceMetrics)(invoice);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    // 1. Fully Refunded / Credited (Effective cost is zero)
    if (effectiveTotal <= 0.01 && returnsValue > 0)
        return 'REFUNDED';
    if (effectiveTotal <= 0.01)
        return 'CREDITED';
    // 2. Settled (Balance is zero)
    if (isSettled) {
        if (returnsValue > 0)
            return 'SETTLED_WITH_RETURNS'; // Cast to any if client not updated yet
        return 'PAID';
    }
    // 3. Unsettled (Balance remains)
    if (remainingBalance < effectiveTotal - 0.01)
        return 'PARTIALLY_PAID';
    if (today > dueDate)
        return 'OVERDUE';
    return (invoice.status === 'DRAFT' ? 'DRAFT' : 'SENT');
};
exports.calculateInvoiceStatus = calculateInvoiceStatus;
