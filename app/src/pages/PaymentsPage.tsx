import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { Search, CreditCard, Calendar, Filter } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function PaymentsPage() {
  const { payments, settings, fetchPayments, fetchSettings, isLoading, error } = useAppStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    fetchPayments();
    if (!settings) fetchSettings();
  }, [fetchPayments, fetchSettings, settings]);

  if (error) {
    return <ErrorState error={error} onRetry={fetchPayments} />;
  }

  const isRefund = (p: any) => p.isRefund || p.method === 'REFUND' || p.creditNoteId;

  const filtered = payments.filter((p: any) => {
    const matchSearch =
      (p.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.clientName || p.invoice?.client?.name || '').toLowerCase().includes(search.toLowerCase());

    const paymentDate = new Date(p.date).toISOString().split('T')[0];
    const matchDate = (!startDate || paymentDate >= startDate) && (!endDate || paymentDate <= endDate);

    const matchStatus = (() => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'refunded') return isRefund(p);
      if (statusFilter === 'paid') return !isRefund(p);
      if (statusFilter === 'partially_paid') {
        const invoice = p.invoice;
        return !isRefund(p) && invoice && (invoice.status === 'PARTIALLY_PAID');
      }
      return true;
    })();

    return matchSearch && matchDate && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentPayments = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalReceived = filtered.filter(p => !isRefund(p)).reduce((s, p) => s + Math.max(0, Number(p.amount)), 0);
  const totalRefunded = filtered.filter(p => isRefund(p)).reduce((s, p) => s + Math.abs(Number(p.amount)), 0);
  const netRevenue = totalReceived - totalRefunded;
  const currency = settings?.currency || 'MAD';

  return (
    <div className="animate-fade-in space-y-6">
      <div className="page-header">
        <h1 className="page-title">{t('payments.title')}</h1>
        <div className="flex flex-wrap gap-4 mt-2">
          <p className="page-description flex items-center gap-2">
            <span className="text-muted-foreground">{t('payments.total_received')}:</span>
            <span className="font-semibold text-green-600">{totalReceived.toLocaleString()} {currency}</span>
          </p>
          <p className="page-description flex items-center gap-2 border-l pl-4">
            <span className="text-muted-foreground">{t('refunds.total_refunded_label')}:</span>
            <span className="font-semibold text-red-600">{totalRefunded.toLocaleString()} {currency}</span>
          </p>
          <p className="page-description flex items-center gap-2 border-l pl-4">
            <span className="font-bold text-foreground">{t('refunds.net_revenue')}:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 text-xl">{netRevenue.toLocaleString()} {currency}</span>
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 flex-wrap">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('dashboard.search_placeholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px] h-10 shadow-sm">
              <SelectValue placeholder={t('status.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('status.all')}</SelectItem>
              <SelectItem value="paid">{t('status.paid')}</SelectItem>
              <SelectItem value="partially_paid">{t('status.partially_paid')}</SelectItem>
              <SelectItem value="refunded">{t('status.refunded')}</SelectItem>
            </SelectContent>
          </Select>
          <DatePicker
            date={startDate ? new Date(startDate) : undefined}
            setDate={(date) => { setStartDate(date?.toISOString().split('T')[0] || ''); setCurrentPage(1); }}
            placeholder={t('invoices.start_date')}
            className="w-[170px] h-10 shadow-sm"
          />
          <span className="text-muted-foreground font-black mx-1">→</span>
          <DatePicker
            date={endDate ? new Date(endDate) : undefined}
            setDate={(date) => { setEndDate(date?.toISOString().split('T')[0] || ''); setCurrentPage(1); }}
            placeholder={t('invoices.end_date')}
            className="w-[170px] h-10 shadow-sm"
          />
          {(startDate || endDate || search || statusFilter !== 'all') && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setStatusFilter('all'); setCurrentPage(1); }}
              className="text-xs font-medium text-destructive hover:underline ml-2"
            >
              {t('common.reset')}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('invoices.invoice')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t('invoices.client')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t('payments.method')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t('invoices.date')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('invoices.amount')}</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t('invoices.status')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-muted p-3">
                        <CreditCard className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <p className="text-base font-medium">{t('payments.no_payments_found')}</p>
                      <p className="text-sm text-muted-foreground">{t('payments.no_payments_description')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPayments.map((p: any) => {
                  const isRef = p.isRefund || p.method === 'REFUND' || p.creditNoteId;
                  const amt = Number(p.amount);

                  return (
                    <tr key={p.id} className="table-row-hover border-b last:border-0">
                      <td className="px-4 py-3 mono font-medium text-xs">
                        {p.creditNoteId ? `CN #${p.creditNote?.number || 'Refund'}` : (p.invoiceNumber || '-')}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">{p.clientName || p.invoice?.client?.name || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {t(`payments.methods.${p.method?.toLowerCase()}`)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{new Date(p.date).toLocaleDateString()}</td>
                      <td className={`px-4 py-3 text-right mono font-semibold ${isRef ? 'text-red-600' : 'text-green-600'}`}>
                        {amt.toLocaleString()} {currency}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`status-badge ${isRef ? 'bg-purple-100 text-purple-700' : 'status-paid'}`}>
                          {isRef ? t('status.refunded') : t('status.paid')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-sm text-muted-foreground font-medium">
            {t('common.results_pagination', {
              start: (currentPage - 1) * itemsPerPage + 1,
              end: Math.min(currentPage * itemsPerPage, filtered.length),
              total: filtered.length
            })}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-muted transition-colors"
            >
              {t('common.previous')}
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${currentPage === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted border'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-muted transition-colors"
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
