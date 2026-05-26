import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Trash2,
    X,
    Download,
    FileText,
    Send,
    RefreshCw,
    CreditCard,
    Plus,
    Filter,
    ArrowRight,
    UserCircle,
    Package
} from 'lucide-react';
import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { toast as sonner } from 'sonner';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxTrigger,
    ComboboxValue,
    ComboboxEmpty
} from '@/components/ui/combobox';
import { calculateLineNetPrice } from '@/utils/calculations';

// ─── types ──────────────────────────────────────────────────────────────────
type CN_Status = 'DRAFT' | 'ISSUED' | 'APPLIED' | 'PARTIALLY_APPLIED' | 'REFUNDED';
type CN_Type = 'FULL' | 'PARTIAL' | 'ITEM';

// ─── helpers ────────────────────────────────────────────────────────────────

// ─── sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CN_Status }) {
    const { t } = useTranslation();

    const styles: Record<CN_Status, string> = {
        DRAFT: 'bg-muted text-muted-foreground border-muted-foreground/20',
        ISSUED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        APPLIED: 'bg-success/10 text-success border-success/20',
        PARTIALLY_APPLIED: 'bg-warning/10 text-warning border-warning/20',
        REFUNDED: 'bg-primary/10 text-primary border-primary/20',
    };

    const labels: Record<CN_Status, string> = {
        DRAFT: t('status.draft'),
        ISSUED: t('status.issued'),
        APPLIED: t('status.applied'),
        PARTIALLY_APPLIED: t('status.partially_applied'),
        REFUNDED: t('status.refunded'),
    };

    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase transition-colors', styles[status])}>
            {labels[status]}
        </span>
    );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function CreditNotesPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const { canDownloadCreditNote, canDeleteCreditNote, canRecordPayment, canSendCreditNote, canCreateCreditNote, canDownloadRefund, canSendRefund } = usePermissions();

    const {
        creditNotes,
        fetchCreditNotes,
        deleteCreditNote,
        downloadCreditNotePDF,
        sendCreditNoteEmail,
        applyCreditNoteToLedger,
        refundCreditNote,
        invoices,
        fetchInvoices,
        createCreditNote: apiCreateCN,
        isLoading
    } = useAppStore();

    const handleDeleteWithUndo = (id: string | number, number: string) => {
        const timeout = setTimeout(async () => {
            try {
                await deleteCreditNote(id);
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || err.message || `Failed to delete credit note ${number}`;
                sonner.error(errorMessage);
            }
        }, 5000);

        sonner(`Credit note ${number} will be deleted in 5s`, {
            action: {
                label: "Undo",
                onClick: () => {
                    clearTimeout(timeout);
                    sonner.info("Deletion cancelled");
                }
            }
        });
    };

    // UI States
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | CN_Status>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [viewing, setViewing] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState<string | number | null>(null);
    const [invoiceSearch, setInvoiceSearch] = useState('');

    // Create CN Data
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
    const [createData, setCreateData] = useState({
        type: 'FULL' as CN_Type,
        amount: 0,
        reason: '',
        items: [] as any[]
    });

    const selectedInvoice = useMemo(() =>
        invoices.find(inv => inv.id.toString() === selectedInvoiceId),
        [invoices, selectedInvoiceId]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    useEffect(() => {
        fetchCreditNotes();
        fetchInvoices();
    }, [fetchCreditNotes, fetchInvoices]);

    // Derived
    const filtered = useMemo(() => {
        return (creditNotes || []).filter((cn) => {
            const matchSearch =
                cn.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
                cn.number?.toLowerCase().includes(search.toLowerCase()) ||
                cn.invoice?.number?.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' || cn.status === statusFilter;

            const cnDate = new Date(cn.date).toISOString().split('T')[0];
            const matchDate = (!startDate || cnDate >= startDate) && (!endDate || cnDate <= endDate);

            return matchSearch && matchStatus && matchDate;
        });
    }, [creditNotes, search, statusFilter, startDate, endDate]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentCreditNotes = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Handlers
    const handleCreateCN = async () => {
        if (!selectedInvoice) return;
        try {
            setIsCreating(true);
            const payload = {
                ...createData,
                items: createData.items.map(i => ({
                    ...i,
                    quantity: Number(i.creditQty)
                }))
            };
            await apiCreateCN(selectedInvoice.id, payload);
            toast({ title: t('common.success'), description: t('credit_notes.created') });
            setShowCreateModal(false);
            resetCreateForm();
            fetchCreditNotes();
        } catch (error: any) {
            toast({ title: t('common.error'), description: error.response?.data?.message || 'Failed to create credit note', variant: 'destructive' });
        } finally {
            setIsCreating(false);
        }
    };

    const resetCreateForm = () => {
        setSelectedInvoiceId('');
        setInvoiceSearch('');
        setCreateData({ type: 'FULL', amount: 0, reason: '', items: [] });
    };

    const handleApplyToLedger = async (id: string | number) => {
        try {
            await applyCreditNoteToLedger(id);
            toast({ title: t('common.success'), description: t('credit_notes.applied_to_balance') });
            fetchCreditNotes();
            setViewing(null);
        } catch (error: any) {
            toast({ title: t('common.error'), description: error.response?.data?.message || 'Failed to apply to ledger', variant: 'destructive' });
        }
    };

    const handleRefund = async (id: string | number) => {
        try {
            await refundCreditNote(id);
            toast({ title: t('common.success'), description: t('credit_notes.refund_recorded') });
            fetchCreditNotes();
            setViewing(null);
        } catch (error: any) {
            toast({ title: t('common.error'), description: error.response?.data?.message || 'Failed to record refund', variant: 'destructive' });
        }
    };

    const handleSendEmail = async (cn: any) => {
        try {
            setIsSendingEmail(cn.id);
            await sendCreditNoteEmail(cn.id);
            toast({ title: t('common.success'), description: t('credit_notes.email_sent') });
        } catch (error: any) {
            toast({ title: t('common.error'), description: t('credit_notes.email_failed'), variant: 'destructive' });
        } finally {
            setIsSendingEmail(null);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t('credit_notes.title')}</h1>
                    <p className="text-muted-foreground">{t('credit_notes.description')}</p>
                </div>
                <Button
                    onClick={() => setShowCreateModal(true)}
                    disabled={!canCreateCreditNote()}
                    className={cn(
                        "bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 shadow-lg shadow-primary/20 text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]",
                        !canCreateCreditNote() && "opacity-50 cursor-not-allowed hover:scale-100"
                    )}
                >
                    <Plus className="h-5 w-5 mr-2" /> {t('credit_notes.create_button')}
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center transition-all">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        placeholder={t('credit_notes.search_placeholder')}
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring transition-all h-10 shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
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
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                    <Filter className="h-4 w-4 text-muted-foreground mr-1 shrink-0" />
                    {(['all', 'DRAFT', 'ISSUED', 'APPLIED'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                            className={cn(
                                'whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold border transition-all',
                                statusFilter === s
                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                    : 'bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/20'
                            )}
                        >
                            {s === 'all' ? t('status.all') : t(`status.${s.toLowerCase()}`)}
                        </button>
                    ))}
                    {(startDate || endDate || search || statusFilter !== 'all') && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setStatusFilter('all'); setCurrentPage(1); }}
                            className="text-xs font-bold uppercase tracking-wider text-destructive hover:underline ml-2"
                        >
                            {t('common.reset')}
                        </button>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/30 text-muted-foreground">
                                <th className="px-4 py-3 text-left font-bold uppercase text-[10px] tracking-wider">{t('invoices.number')}</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[10px] tracking-wider">{t('invoices.invoice')}</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[10px] tracking-wider">{t('invoices.client')}</th>
                                <th className="px-4 py-3 text-left font-bold uppercase text-[10px] tracking-wider">{t('common.type')}</th>
                                <th className="px-4 py-3 text-right font-bold uppercase text-[10px] tracking-wider">{t('common.amount')}</th>
                                <th className="px-4 py-3 text-center font-bold uppercase text-[10px] tracking-wider">{t('common.status')}</th>
                                <th className="px-4 py-3 text-right font-bold uppercase text-[10px] tracking-wider w-16">{t('invoices.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                                        <td className="px-4 py-4 truncate max-w-[150px]"><Skeleton className="h-4 w-32" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-12" /></td>
                                        <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                                        <td className="px-4 py-4 text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                                        <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                                    </tr>
                                ))
                            ) : currentCreditNotes.map((cn_item) => (
                                <tr
                                    key={cn_item.id}
                                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => setViewing(cn_item)}
                                >
                                    <td className="px-4 py-3 font-medium mono">{cn_item.number}</td>
                                    <td className="px-4 py-3 text-muted-foreground mono">{cn_item.invoice?.number}</td>
                                    <td className="px-4 py-3 truncate max-w-[150px]">{cn_item.client?.name}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-muted-foreground/10">
                                            {cn_item.type || 'FULL'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold mono">
                                        {Number(cn_item.total).toLocaleString()} {cn_item.invoice?.currency || 'MAD'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StatusBadge status={cn_item.status} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => downloadCreditNotePDF(cn_item.id, cn_item.number)}
                                                disabled={!canDownloadCreditNote()}
                                                className={cn(
                                                    "rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                                                    !canDownloadCreditNote() && "opacity-50 cursor-not-allowed"
                                                )}
                                                title={t('common.download')}
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => { /* logic */ }}
                                                disabled={!canSendCreditNote()}
                                                className={cn(
                                                    "rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                                                    !canSendCreditNote() && "opacity-50 cursor-not-allowed"
                                                )}
                                                title={t('common.send_email')}
                                            >
                                                <Send className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteWithUndo(cn_item.id, cn_item.number)}
                                                disabled={!canDeleteCreditNote()}
                                                className={cn(
                                                    "rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
                                                    !canDeleteCreditNote() && "opacity-50 cursor-not-allowed"
                                                )}
                                                title={t('common.delete')}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-muted-foreground italic">
                                        {t('credit_notes.no_results')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                        {t('common.results_pagination', {
                            start: (currentPage - 1) * itemsPerPage + 1,
                            end: Math.min(currentPage * itemsPerPage, filtered.length),
                            total: filtered.length
                        })}
                    </p>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="h-8 w-8 p-0"
                        >
                            &lt;
                        </Button>
                        {[...Array(totalPages)].map((_, i) => (
                            <Button
                                key={i}
                                variant={currentPage === i + 1 ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(i + 1)}
                                className="h-8 w-8 p-0 text-[10px]"
                            >
                                {i + 1}
                            </Button>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="h-8 w-8 p-0"
                        >
                            &gt;
                        </Button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('credit_notes.create_title')}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* Step 1: Select Invoice */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{t('credit_notes.select_invoice_step')}</label>
                            
                            {/* Search input */}
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                <input
                                    type="text"
                                    placeholder={t('credit_notes.search_placeholder')}
                                    value={invoiceSearch}
                                    onChange={(e) => setInvoiceSearch(e.target.value)}
                                    // Stop propagation to prevent Dialog from intercepting keyboard events
                                    onKeyDown={(e) => e.stopPropagation()}
                                    className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring transition-all h-10 shadow-sm"
                                />
                            </div>
                            
                            {/* Invoice selection list */}
                            <div className="border rounded-xl max-h-52 overflow-y-auto divide-y bg-card/50 shadow-inner scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                {(invoices || [])
                                    .filter(i => i.status === 'PAID')
                                    .filter(i =>
                                        i.number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                                        i.client?.name?.toLowerCase().includes(invoiceSearch.toLowerCase())
                                    )
                                    .map(inv => (
                                        <div
                                            key={inv.id}
                                            onClick={() => {
                                                setSelectedInvoiceId(inv.id.toString());
                                                setCreateData(d => ({ ...d, amount: Number(inv.total) || 0 }));
                                            }}
                                            className={cn(
                                                "p-3 cursor-pointer transition-all hover:bg-muted flex items-center justify-between group",
                                                selectedInvoiceId === inv.id.toString() && "bg-primary/5 border-l-4 border-primary"
                                            )}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className={cn(
                                                    "font-bold mono transition-colors",
                                                    selectedInvoiceId === inv.id.toString() ? "text-primary" : "text-foreground"
                                                )}>
                                                    {inv.number}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                                    {inv.client?.name}
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-bold mono">
                                                    {Number(inv.total).toFixed(2)} {inv.currency}
                                                </span>
                                                {selectedInvoiceId === inv.id.toString() && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse mt-1" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                {(invoices || []).filter(i => i.status === 'PAID').length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground space-y-2">
                                        <div className="mx-auto w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                            <Search className="h-4 w-4 opacity-20" />
                                        </div>
                                        <p className="text-xs italic">{t('common.no_results')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedInvoice && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                {/* Type Selector */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{t('credit_notes.credit_type_step')}</label>
                                    <div className="flex gap-2">
                                        {(['FULL', 'PARTIAL', 'ITEM'] as CN_Type[]).map(tSelect => (
                                            <button
                                                key={tSelect}
                                                onClick={() => {
                                                    let newAmount = createData.amount;
                                                    if (tSelect === 'FULL') {
                                                        newAmount = Number(selectedInvoice.total);
                                                    } else if (tSelect === 'ITEM') {
                                                        newAmount = createData.items.reduce((acc, i) => {
                                                            const netPrice = calculateLineNetPrice(i);
                                                            return acc + (netPrice * Number(i.creditQty) * (1 + (Number(i.tax) || 0) / 100));
                                                        }, 0);
                                                    }
                                                    setCreateData(d => ({ ...d, type: tSelect, amount: parseFloat(Number(newAmount).toFixed(2)) }));
                                                }}
                                                className={cn(
                                                    "flex-1 py-2 px-3 rounded-lg border text-[10px] font-black uppercase transition-all",
                                                    createData.type === tSelect
                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                        : "bg-muted/50 text-muted-foreground hover:bg-muted border-transparent"
                                                )}
                                            >
                                                {tSelect}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Amount / Reason */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">3. Amount & Reason</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={createData.amount || ''}
                                                disabled={createData.type === 'FULL' || createData.type === 'ITEM'}
                                                onChange={e => setCreateData(d => ({ ...d, amount: Number(e.target.value) }))}
                                                className="w-full bg-muted/30 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring font-bold mono"
                                                placeholder="Amount"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                                                {selectedInvoice.currency}
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={createData.reason}
                                        onChange={e => setCreateData(d => ({ ...d, reason: e.target.value }))}
                                        className="w-full bg-muted/30 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                                        placeholder="Reason for credit (e.g. Returned goods)"
                                    />
                                </div>
                            </div>
                        )}

                        {createData.type === 'ITEM' && selectedInvoice && (
                            <div className="border rounded-xl p-4 bg-muted/10 space-y-3">
                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                    <Package className="h-3 w-3" /> Select Items to Credit
                                </h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {(selectedInvoice.items || []).map((item: any) => {
                                        // Calculate already credited quantity across all previous credit notes
                                        let alreadyCredited = 0;
                                        (selectedInvoice.creditNotes || []).forEach(cn => {
                                            (cn.items || []).forEach((cnItem: any) => {
                                                if (cnItem.productId && item.productId && cnItem.productId.toString() === item.productId.toString()) {
                                                    alreadyCredited += cnItem.quantity;
                                                } else if (cnItem.description === item.description) {
                                                    alreadyCredited += cnItem.quantity;
                                                }
                                            });
                                        });

                                        const maxQty = Math.max(0, Number(item.quantity) - alreadyCredited);
                                        const isSoldOut = maxQty <= 0;
                                        const isSelected = createData.items.some(i => i.id === item.id);
                                        const creditQty = createData.items.find(i => i.id === item.id)?.creditQty || maxQty;

                                        const handleToggle = () => {
                                            if (isSoldOut) return;
                                            const newItems = isSelected
                                                ? createData.items.filter(i => i.id !== item.id)
                                                : [...createData.items, { ...item, creditQty: maxQty }];
                                            const newAmount = newItems.reduce((acc, i) => {
                                                const netPrice = calculateLineNetPrice(i);
                                                return acc + (netPrice * Number(i.creditQty) * (1 + (Number(i.tax) || 0) / 100));
                                            }, 0);
                                            setCreateData(d => ({ ...d, items: newItems, amount: parseFloat(newAmount.toFixed(2)) }));
                                        };

                                        const handleQtyChange = (val: number) => {
                                            const qty = Math.min(maxQty, Math.max(1, val));
                                            const newItems = createData.items.map(i => i.id === item.id ? { ...i, creditQty: qty } : i);
                                            const newAmount = newItems.reduce((acc, i) => {
                                                const netPrice = calculateLineNetPrice(i);
                                                return acc + (netPrice * Number(i.creditQty) * (1 + (Number(i.tax) || 0) / 100));
                                            }, 0);
                                            setCreateData(d => ({ ...d, items: newItems, amount: parseFloat(newAmount.toFixed(2)) }));
                                        };

                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "flex items-center justify-between p-2 rounded-lg border transition-colors relative transition-all duration-200",
                                                    isSoldOut ? "opacity-50 grayscale bg-muted/20 cursor-not-allowed" :
                                                        isSelected ? "bg-primary/10 border-primary shadow-sm" : "bg-card hover:bg-muted/50 border-transparent"
                                                )}
                                            >
                                                <div className="flex-1 cursor-pointer select-none" onClick={handleToggle}>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-bold leading-tight">{item.description}</p>
                                                        {isSoldOut && (
                                                            <span className="text-[8px] bg-red-500 text-white px-1 rounded font-black tracking-tighter">ÉPUISÉ</span>
                                                        )}
                                                    </div>
                                                    {Number(item.discount || 0) > 0 && (
                                                        <p className="text-[9px] text-red-600 font-bold uppercase mt-0.5 tracking-wider">
                                                            {t('invoices.discount')}: {item.discountType === 'AMOUNT' || item.discountType === 'MAD' ? `${Number(item.discount).toFixed(2)} ${selectedInvoice.currency}` : `${item.discount}%`}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] opacity-70">
                                                            {item.quantity} x <span className="line-through">{Number(item.price).toFixed(2)}</span> <span className="font-bold text-foreground">{calculateLineNetPrice(item).toFixed(2)}</span> {selectedInvoice.currency}
                                                        </p>
                                                        {alreadyCredited > 0 && (
                                                            <p className="text-[9px] font-bold text-orange-600">
                                                                Credité: {alreadyCredited} | Restant: {maxQty}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelected && !isSoldOut && (
                                                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={maxQty}
                                                            value={creditQty}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={e => handleQtyChange(Number(e.target.value))}
                                                            className="w-16 bg-background border rounded px-1.5 py-0.5 text-xs font-bold mono outline-none focus:ring-1 focus:ring-primary"
                                                        />
                                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6">
                        <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isCreating}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleCreateCN}
                            disabled={isCreating || !selectedInvoice || createData.amount <= 0}
                            className="bg-primary px-8"
                        >
                            {isCreating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                            {t('credit_notes.generate_button')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail View */}
            {viewing && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/10 backdrop-blur-sm p-4 animate-in fade-in"
                    onClick={() => setViewing(null)}
                >
                    <div
                        className="w-full max-w-2xl bg-card border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] scale-in"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b flex justify-between items-start bg-muted/10">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black mono">{viewing.number}</h2>
                                    <StatusBadge status={viewing.status} />
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> {viewing.invoice?.number}</span>
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                    <span>{new Date(viewing.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setViewing(null)} className="rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border bg-muted/5">
                                    <h3 className="text-[10px] font-black uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                        <UserCircle className="h-3 w-3" /> Client Details
                                    </h3>
                                    <p className="font-bold text-sm">{viewing.client?.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{viewing.client?.email}</p>
                                </div>
                                <div className="p-4 rounded-xl border bg-primary/5 border-primary/20">
                                    <h3 className="text-[10px] font-black uppercase text-primary mb-3 flex items-center gap-2">
                                        <CreditCard className="h-3 w-3" /> Credit Value
                                    </h3>
                                    <p className="text-2xl font-black mono">{Number(viewing.total).toLocaleString()} <small className="text-xs">{viewing.invoice?.currency || 'MAD'}</small></p>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary/10">
                                        <span className="text-[9px] uppercase font-bold opacity-60">Status</span>
                                        <span className="text-xs font-black text-primary">{viewing.resolution?.replace(/_/g, ' ') || 'TO BE DECIDED'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Audit Trail */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Audit Trail & History</h3>
                                <div className="space-y-3 pl-4 border-l-2 border-muted">
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card" />
                                        <p className="text-xs font-bold">{t('credit_notes.issued_audit')}</p>
                                        <p className="text-[10px] text-muted-foreground">{t('credit_notes.generated_by')} <span className="text-foreground">{viewing.user?.name || viewing.user?.email || 'System'}</span> on {new Date(viewing.createdAt || viewing.date).toLocaleString()}</p>
                                    </div>
                                    {viewing.status === 'APPLIED' && (
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
                                            <p className="text-xs font-bold">{t('credit_notes.applied_to_balance')}</p>
                                            <p className="text-[10px] text-muted-foreground">{t('credit_notes.balance_moved_desc', { total: viewing.total })}</p>
                                        </div>
                                    )}
                                    {viewing.status === 'REFUNDED' && (
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-card" />
                                            <p className="text-xs font-bold">Refund Processed</p>
                                            <p className="text-[10px] text-muted-foreground">The amount was physically refunded to the customer.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b pb-2">Included Items</h3>
                                <div className="rounded-xl border overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-bold uppercase text-[9px]">Description</th>
                                                <th className="px-4 py-2 text-center font-bold uppercase text-[9px]">Qty</th>
                                                <th className="px-4 py-2 text-right font-bold uppercase text-[9px]">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {(viewing.items || []).map((item: any, i: number) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-2.5 font-medium">{item.description}</td>
                                                    <td className="px-4 py-2.5 text-center mono">{item.quantity}</td>
                                                    <td className="px-4 py-2.5 text-right font-bold mono">{(item.quantity * item.price * (1 + (Number(item.tax) || 0) / 100)).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            {(!viewing.items || viewing.items.length === 0) && (
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">Adjustment Credit (No specific items)</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Actions Footnote */}
                        <div className="p-6 border-t bg-muted/20 flex gap-3">
                            {viewing.status === 'ISSUED' && (
                                <>
                                    <Button
                                        onClick={() => handleApplyToLedger(viewing.id)}
                                        disabled={!canRecordPayment()}
                                        className={cn(
                                            "flex-1 bg-amber-600 hover:bg-amber-700 font-bold uppercase text-[10px] tracking-widest h-11",
                                            !canRecordPayment() && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" /> {t('credit_notes.move_to_balance')}
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!canDownloadCreditNote()}
                                onClick={() => downloadCreditNotePDF(viewing.id, viewing.number)}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    !canDownloadCreditNote() && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Download className="h-3.5 w-3.5 mr-2" />
                                {t('common.download')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
