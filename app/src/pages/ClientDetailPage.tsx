import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Mail, FileText, Plus, Phone, MapPin, Building2, CreditCard, Loader2, Search, X, Download, Send, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { INVOICE_STATUS, QUOTE_STATUS } from '@/constants/statuses';
import { ErrorState } from '@/components/common/ErrorState';
import { usePermissions } from '@/hooks/usePermissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
} from '@/components/ui/combobox';

export default function ClientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        clients,
        invoices,
        quotes,
        fetchClients,
        fetchInvoices,
        fetchQuotes,
        sendInvoiceEmail,
        updateInvoice,
        sendQuoteEmail,
        updateQuote,
        isLoading,
        error
    } = useAppStore();
    const { t } = useTranslation();
    const { toast } = useToast();
    const { canCreateInvoice, canDownloadInvoice, canSendInvoice, canDownloadQuote, canSendQuote } = usePermissions();

    const [invoicePage, setInvoicePage] = useState(1);
    const [quotePage, setQuotePage] = useState(1);
    const itemsPerPage = 4;

    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
    const [quoteSearch, setQuoteSearch] = useState('');
    const [quoteStatusFilter, setQuoteStatusFilter] = useState('all');

    const [viewingInvoice, setViewingInvoice] = useState<any>(null);
    const [viewingQuote, setViewingQuote] = useState<any>(null);
    const [isSendingId, setIsSendingId] = useState<string | null>(null);


    useEffect(() => {
        fetchClients();
        fetchInvoices();
        fetchQuotes();
    }, [fetchClients, fetchInvoices, fetchQuotes]);

    const client = clients.find((c) => String(c.id) === id);

    if (isLoading && !client) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => { fetchClients(); fetchInvoices(); fetchQuotes(); }} />;
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-xl font-semibold mb-2">{t('clients.not_found', 'Client Not Found')}</h2>
                <button onClick={() => navigate('/clients')} className="text-primary hover:underline">
                    {t('clients.back_to_list', 'Back to Clients')}
                </button>
            </div>
        );
    }

    const clientInvoices = invoices.filter(i => String(i.clientId) === id);
    const clientQuotes = quotes.filter(q => String(q.clientId) === id);

    const handleSendInvoiceEmail = async (invId: string | number) => {
        try {
            setIsSendingId(invId.toString());
            await sendInvoiceEmail(invId.toString());
            await updateInvoice(invId.toString(), { status: INVOICE_STATUS.SENT });
            if (viewingInvoice?.id.toString() === invId.toString()) {
                setViewingInvoice({ ...viewingInvoice, status: INVOICE_STATUS.SENT });
            }
            fetchInvoices();
            toast({ title: t('common.success'), description: t('invoices.email_sent_success') });
        } catch (error: any) {
            toast({
                title: t('common.error'),
                description: error.response?.data?.message || error.message,
                variant: "destructive"
            });
        } finally {
            setIsSendingId(null);
        }
    };

    const handleSendQuoteEmail = async (qId: string | number) => {
        try {
            setIsSendingId(qId.toString());
            await sendQuoteEmail(qId.toString());
            await updateQuote(qId.toString(), { status: QUOTE_STATUS.SENT });
            if (viewingQuote?.id.toString() === qId.toString()) {
                setViewingQuote({ ...viewingQuote, status: QUOTE_STATUS.SENT });
            }
            fetchQuotes();
            toast({ title: t('common.success'), description: t('quotes.email_sent_success') });
        } catch (error: any) {
            toast({
                title: t('common.error'),
                description: error.response?.data?.message || error.message,
                variant: "destructive"
            });
        } finally {
            setIsSendingId(null);
        }
    };

    const filteredInvoices = invoices
        .filter(i => String(i.clientId) === id)
        .filter(i => {
            const matchesSearch = i.number.toLowerCase().includes(invoiceSearch.toLowerCase());
            const matchesStatus = invoiceStatusFilter === 'all' || i.status === invoiceStatusFilter;
            return matchesSearch && matchesStatus;
        });

    const filteredQuotes = quotes
        .filter(q => String(q.clientId) === id)
        .filter(q => {
            const matchesSearch = q.number.toLowerCase().includes(quoteSearch.toLowerCase());
            const matchesStatus = quoteStatusFilter === 'all' || q.status === quoteStatusFilter;
            return matchesSearch && matchesStatus;
        });

    const invoiceTotalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const currentInvoices = filteredInvoices.slice((invoicePage - 1) * itemsPerPage, invoicePage * itemsPerPage);

    const quoteTotalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
    const currentQuotes = filteredQuotes.slice((quotePage - 1) * itemsPerPage, quotePage * itemsPerPage);

    const totalBilled = clientInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const totalPaid = clientInvoices
        .filter(i => i.status === INVOICE_STATUS.PAID)
        .reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const grossOutstanding = clientInvoices.reduce((sum, inv) => {
        if ([INVOICE_STATUS.DRAFT, INVOICE_STATUS.CANCELLED, INVOICE_STATUS.REFUNDED, INVOICE_STATUS.CREDITED, INVOICE_STATUS.SETTLED_WITH_RETURNS, INVOICE_STATUS.PAID].includes(inv.status as any)) return sum;
        const totalPaid = inv.payments?.filter((p: any) => !p.isRefund)?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
        const totalRefunded = Math.abs(inv.payments?.filter((p: any) => p.isRefund)?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0);
        const returnedValue = Math.abs(inv.refunds?.reduce((s: number, r: any) => s + Number(r.amount), 0) || 0);
        const effectiveTotal = Number(inv.total) - returnedValue;
        const netPaid = totalPaid - totalRefunded;
        return sum + Math.max(0, effectiveTotal - netPaid);
    }, 0);
    const outstandingBalance = Math.max(0, grossOutstanding - Number(client.creditBalance || 0));

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/clients')} className="rounded-md p-2 hover:bg-muted transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                </div>
                <div className="flex items-center gap-2">
                    {client.email && (
                        <a href={`mailto:${client.email}`} className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium hover:bg-muted transition-colors">
                            <Mail className="h-4 w-4" /> {t('common.email')}
                        </a>
                    )}
                    {canCreateInvoice() && (
                        <button
                            onClick={() => navigate('/invoices', { state: { clientId: id } })}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
                                !canCreateInvoice() && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={!canCreateInvoice()}
                        >
                            <Plus className="h-4 w-4" /> {t('invoices.new_invoice')}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 space-y-6">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h3 className="font-semibold mb-4 text-lg">{t('clients.contact_info')}</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('clients.ice')}</p>
                                    <p className="text-muted-foreground">{client.ice || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('clients.email')}</p>
                                    <p className="text-muted-foreground">{client.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('clients.phone')}</p>
                                    <p className="text-muted-foreground">{client.phone || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('clients.address')}</p>
                                    <p className="text-muted-foreground">{client.address || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h3 className="font-semibold mb-4 text-lg">{t('clients.financial_summary')}</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('clients.total_billed')}</p>
                                <p className="text-2xl font-bold">{totalBilled.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('clients.total_paid')}</p>
                                <p className="text-2xl font-bold text-emerald-600">{totalPaid.toFixed(2)}</p>
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-sm font-medium">{t('clients.outstanding_balance')}</p>
                                <p className="text-2xl font-bold text-destructive">{outstandingBalance.toFixed(2)}</p>
                            </div>
                            {Number(client.creditBalance || 0) > 0 && (
                                <div className="pt-4 border-t">
                                    <p className="text-sm font-medium text-blue-600 flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> {t('clients.credit_balance', 'Credit Balance')}</p>
                                    <p className="text-2xl font-bold text-blue-600">{Number(client.creditBalance).toFixed(2)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-6">
                    <div className="rounded-xl border bg-card overflow-hidden">
                        <div className="px-6 py-4 border-b bg-muted/30 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-semibold">{t('clients.recent_invoices')}</h3>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder={t('invoices.search_placeholder')}
                                        value={invoiceSearch}
                                        onChange={(e) => setInvoiceSearch(e.target.value)}
                                        className="rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-ring w-full sm:w-32"
                                    />
                                </div>
                                <Combobox
                                    value={invoiceStatusFilter}
                                    onValueChange={(val) => setInvoiceStatusFilter(val)}
                                >
                                    <ComboboxInput placeholder={t('status.all')} className="h-8 text-xs min-w-[100px]" />
                                    <ComboboxContent>
                                        <ComboboxList>
                                            <ComboboxItem value="all">{t('status.all')}</ComboboxItem>
                                            {Object.values(INVOICE_STATUS).map(s => (
                                                <ComboboxItem key={s} value={s}>{t(`status.${s.toLowerCase()}`)}</ComboboxItem>
                                            ))}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                            </div>
                        </div>
                        <div className="divide-y">
                            {filteredInvoices.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground text-sm">{t('invoices.no_invoices_found')}</div>
                            ) : (
                                currentInvoices.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer" onClick={async () => {
                                        try {
                                            const res = await api.get(`/invoices/${inv.id}`);
                                            setViewingInvoice(res.data.data.invoice);
                                        } catch (e) {
                                            setViewingInvoice(inv);
                                        }
                                    }}>
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-primary" />
                                            <div>
                                                <p className="font-medium">{inv.number}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">{Number(inv.total || 0).toFixed(2)}</p>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize
                        ${inv.status === INVOICE_STATUS.PAID ? 'bg-emerald-100 text-emerald-700' :
                                                    inv.status === INVOICE_STATUS.OVERDUE ? 'bg-destructive/10 text-destructive' :
                                                        'bg-blue-100 text-blue-700'}`}>
                                                {t(`status.${inv.status.toLowerCase()}`)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {invoiceTotalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/10">
                                <p className="text-xs text-muted-foreground">
                                    {t('common.results_pagination', {
                                        start: (invoicePage - 1) * itemsPerPage + 1,
                                        end: Math.min(invoicePage * itemsPerPage, filteredInvoices.length),
                                        total: filteredInvoices.length
                                    })}
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={invoicePage === 1}
                                        onClick={() => setInvoicePage(prev => prev - 1)}
                                        className="rounded border bg-background px-2 py-1 text-xs font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                                    >
                                        {t('common.previous')}
                                    </button>
                                    <div className="flex items-center gap-1 hidden sm:flex">
                                        {[...Array(invoiceTotalPages)].map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setInvoicePage(i + 1)}
                                                className={`h-6 w-6 rounded text-xs font-medium transition-colors ${invoicePage === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted border bg-background'}`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        disabled={invoicePage === invoiceTotalPages}
                                        onClick={() => setInvoicePage(prev => prev + 1)}
                                        className="rounded border bg-background px-2 py-1 text-xs font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                                    >
                                        {t('common.next')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border bg-card overflow-hidden">
                        <div className="px-6 py-4 border-b bg-muted/30 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-semibold">{t('clients.recent_quotes')}</h3>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder={t('invoices.search_placeholder')}
                                        value={quoteSearch}
                                        onChange={(e) => setQuoteSearch(e.target.value)}
                                        className="rounded-md border bg-background py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-ring w-full sm:w-32"
                                    />
                                </div>
                                <Combobox
                                    value={quoteStatusFilter}
                                    onValueChange={(val) => setQuoteStatusFilter(val)}
                                >
                                    <ComboboxInput placeholder={t('status.all')} className="h-8 text-xs min-w-[100px]" />
                                    <ComboboxContent>
                                        <ComboboxList>
                                            <ComboboxItem value="all">{t('status.all')}</ComboboxItem>
                                            {Object.values(QUOTE_STATUS).map(s => (
                                                <ComboboxItem key={s} value={s}>{t(`status.${s.toLowerCase()}`)}</ComboboxItem>
                                            ))}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                            </div>
                        </div>
                        <div className="divide-y">
                            {filteredQuotes.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground text-sm">{t('quotes.no_quotes_found')}</div>
                            ) : (
                                currentQuotes.map(quote => (
                                    <div key={quote.id} className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer" onClick={async () => {
                                        try {
                                            const res = await api.get(`/quotes/${quote.id}`);
                                            setViewingQuote(res.data.data.quote);
                                        } catch (e) {
                                            setViewingQuote(quote);
                                        }
                                    }}>
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{quote.number}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(quote.date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">{Number(quote.total || 0).toFixed(2)}</p>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize border`}>
                                                {t(`status.${quote.status.toLowerCase()}`)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {quoteTotalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/10">
                                <p className="text-xs text-muted-foreground">
                                    {t('common.results_pagination', {
                                        start: (quotePage - 1) * itemsPerPage + 1,
                                        end: Math.min(quotePage * itemsPerPage, filteredQuotes.length),
                                        total: filteredQuotes.length
                                    })}
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        disabled={quotePage === 1}
                                        onClick={() => setQuotePage(prev => prev - 1)}
                                        className="rounded border bg-background px-2 py-1 text-xs font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                                    >
                                        {t('common.previous')}
                                    </button>
                                    <div className="flex items-center gap-1 hidden sm:flex">
                                        {[...Array(quoteTotalPages)].map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setQuotePage(i + 1)}
                                                className={`h-6 w-6 rounded text-xs font-medium transition-colors ${quotePage === i + 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted border bg-background'}`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        disabled={quotePage === quoteTotalPages}
                                        onClick={() => setQuotePage(prev => prev + 1)}
                                        className="rounded border bg-background px-2 py-1 text-xs font-medium disabled:opacity-50 hover:bg-muted transition-colors"
                                    >
                                        {t('common.next')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Invoice Detail Modal */}
            {viewingInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setViewingInvoice(null)}>
                    <div className="w-full max-w-lg rounded-xl border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 flex items-center justify-between bg-card/80 backdrop-blur-md px-6 py-4 border-b">
                            <div>
                                <h2 className="text-lg font-bold mono tracking-tight text-foreground">{viewingInvoice.number}</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${viewingInvoice.status === INVOICE_STATUS.PAID ? 'bg-emerald-500/10 text-emerald-600' :
                                        viewingInvoice.status === INVOICE_STATUS.SENT ? 'bg-blue-500/10 text-blue-600' :
                                            viewingInvoice.status === INVOICE_STATUS.CANCELLED ? 'bg-red-500/10 text-red-600' :
                                                'bg-amber-500/10 text-amber-600'
                                        }`}>
                                        {t(`status.${viewingInvoice.status.toLowerCase()}`)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 font-bold">
                                {canDownloadInvoice() && (
                                    <button
                                        onClick={() => {
                                            const { downloadInvoicePDF } = useAppStore.getState();
                                            downloadInvoicePDF(viewingInvoice.id, viewingInvoice.number);
                                        }}
                                        disabled={!canDownloadInvoice()}
                                        className={cn(
                                            "inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95",
                                            !canDownloadInvoice() && "opacity-50 cursor-not-allowed"
                                        )}
                                        title={t('invoices.download_pdf')}
                                    >
                                        <Download className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setViewingInvoice(null)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 max-h-[calc(90vh-70px)] overflow-y-auto">
                            <div className="space-y-4 text-sm mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-muted-foreground block text-[10px] uppercase font-bold">{t('invoices.issue_date')}</label><span>{new Date(viewingInvoice.date).toLocaleDateString()}</span></div>
                                    <div><label className="text-muted-foreground block text-[10px] uppercase font-bold">{t('invoices.due_date')}</label><span>{new Date(viewingInvoice.dueDate).toLocaleDateString()}</span></div>
                                </div>
                                <hr className="border-border" />
                                <div className="space-y-2">
                                    {viewingInvoice.items?.map((item: any, i: number) => {
                                        const lineHT = item.quantity * item.price;
                                        return (
                                            <div key={i} className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{item.description}</p>
                                                    <p className="text-xs text-muted-foreground">{item.quantity} × {item.price} {viewingInvoice.currency}</p>
                                                </div>
                                                <span className="mono font-semibold">{Number(lineHT).toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <hr className="border-border" />
                                <div className="space-y-1.5 pt-2">
                                    {(() => {
                                        const totalHT = viewingInvoice.items?.reduce((acc: number, item: any) => acc + (item.quantity * item.price), 0) || 0;
                                        const totalTVA = Number(viewingInvoice.total) - totalHT;
                                        return (
                                            <>
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                    <span>{t('invoices.subtotal')}</span>
                                                    <span className="mono">{totalHT.toFixed(2)} {viewingInvoice.currency}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                    <span>{t('invoices.tax')}</span>
                                                    <span className="mono">{totalTVA.toFixed(2)} {viewingInvoice.currency}</span>
                                                </div>
                                                <div className="flex justify-between font-bold text-lg pt-1 border-t">
                                                    <span>{t('invoices.total')}</span>
                                                    <span className="mono text-primary font-black">{Number(viewingInvoice.total).toFixed(2)} {viewingInvoice.currency}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                {canSendInvoice() && viewingInvoice.status !== INVOICE_STATUS.CANCELLED && (
                                    <div className="pt-4 border-t">
                                        <Button
                                            onClick={() => handleSendInvoiceEmail(viewingInvoice.id)}
                                            disabled={isSendingId === viewingInvoice.id.toString() || !canSendInvoice()}
                                            className={cn(
                                                "w-full flex items-center justify-center gap-2",
                                                !canSendInvoice() && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {isSendingId === viewingInvoice.id.toString() ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                            {isSendingId === viewingInvoice.id.toString() ? t('common.sending') : t('common.send_email')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quote Detail Modal */}
            {viewingQuote && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setViewingQuote(null)}>
                    <div className="relative w-full max-w-lg rounded-xl border bg-card shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 flex items-center justify-between bg-card/80 backdrop-blur-md px-6 py-4 border-b">
                            <div>
                                <h2 className="text-lg font-bold mono tracking-tight text-foreground">{viewingQuote.number}</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase", viewingQuote.status === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-700 border-slate-200')}>
                                        {t(`status.${viewingQuote.status.toLowerCase()}`)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {canDownloadQuote() && (
                                    <button
                                        onClick={() => {
                                            const { downloadQuotePDF } = useAppStore.getState();
                                            downloadQuotePDF(viewingQuote.id, viewingQuote.number);
                                        }}
                                        disabled={!canDownloadQuote()}
                                        className={cn(
                                            "inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95",
                                            !canDownloadQuote() && "opacity-50 cursor-not-allowed"
                                        )}
                                        title={t('invoices.download_pdf')}
                                    >
                                        <Download className="h-4 w-4" />
                                    </button>
                                )}
                                <button onClick={() => setViewingQuote(null)} className="rounded-full p-2 hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6 max-h-[calc(90vh-70px)] overflow-y-auto">
                            <div className="space-y-4 text-sm mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-muted-foreground block text-[10px] uppercase font-bold">{t('invoices.issue_date')}</label><span>{new Date(viewingQuote.date).toLocaleDateString()}</span></div>
                                    <div><label className="text-muted-foreground block text-[10px] uppercase font-bold">{t('quotes.valid_until')}</label><span>{new Date(viewingQuote.validUntil).toLocaleDateString()}</span></div>
                                </div>
                                <hr className="border-border" />
                                <div className="space-y-2">
                                    {viewingQuote.items?.map((item: any, i: number) => {
                                        const lineHT = item.quantity * item.price;
                                        return (
                                            <div key={i} className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{item.description}</p>
                                                    <p className="text-xs text-muted-foreground">{item.quantity} × {item.price} {viewingQuote.currency}</p>
                                                </div>
                                                <span className="mono font-semibold">{Number(lineHT).toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <hr className="border-border" />
                                <div className="space-y-1.5 pt-2">
                                    <div className="flex justify-between text-2xl font-black text-foreground pt-2 border-t mt-4">
                                        <span>{t('invoices.total')}</span>
                                        <span className="tabular-nums">{Number(viewingQuote.total).toFixed(2)} {viewingQuote.currency}</span>
                                    </div>
                                </div>

                                {canSendQuote() && viewingQuote.status !== 'CANCELLED' && (
                                    <div className="pt-4 border-t">
                                        <Button
                                            onClick={() => handleSendQuoteEmail(viewingQuote.id)}
                                            disabled={isSendingId === viewingQuote.id.toString() || !canSendQuote()}
                                            className={cn(
                                                "w-full flex items-center justify-center gap-2",
                                                !canSendQuote() && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {isSendingId === viewingQuote.id.toString() ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                            {isSendingId === viewingQuote.id.toString() ? t('common.sending') : t('common.send_email')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
