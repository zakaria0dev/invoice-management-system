import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { Search, RefreshCw, Eye, Calendar, User, Hash, Info, Download, Send, X } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

export default function RefundsPage() {
    const { refunds, fetchRefunds, downloadRefundPDF, sendRefundEmail, isLoading, error } = useAppStore();
    const { t } = useTranslation();
    const { toast } = useToast();
    const { canDownloadRefund, canSendRefund } = usePermissions();
    const [viewingRefund, setViewingRefund] = useState<any>(null);
    const [isSendingId, setIsSendingId] = useState<string | number | null>(null);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    useEffect(() => {
        fetchRefunds();
    }, [fetchRefunds]);

    const handleSendEmail = async (id: string | number) => {
        try {
            setIsSendingId(id);
            await sendRefundEmail(id);
            toast({
                title: "Success",
                description: 'Email sent successfully!',
            });
        } catch (err: any) {
            toast({
                title: "Error",
                description: `Failed to send email: ${err.response?.data?.message || err.message}`,
                variant: "destructive"
            });
        } finally {
            setIsSendingId(null);
        }
    };

    if (error) {
        return <ErrorState error={error} onRetry={fetchRefunds} />;
    }

    const filtered = refunds.filter((r: any) => {
        const matchSearch =
            (r.invoice?.number || '').toLowerCase().includes(search.toLowerCase()) ||
            (r.invoice?.client?.name || '').toLowerCase().includes(search.toLowerCase());

        const refundDate = new Date(r.createdAt).toISOString().split('T')[0];
        const matchDate = (!startDate || refundDate >= startDate) && (!endDate || refundDate <= endDate);

        return matchSearch && matchDate;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentRefunds = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="animate-fade-in space-y-6">
            <div className="page-header">
                <h1 className="page-title">{t('refunds.title')}</h1>
                <p className="page-description">{t('refunds.subtitle')}</p>
            </div>

            <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4">
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
                    {(startDate || endDate || search) && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setCurrentPage(1); }}
                            className="text-xs font-medium text-destructive hover:underline ml-2"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('refunds.original_invoice')}</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('refunds.client')}</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('refunds.date')}</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('refunds.amount')}</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('refunds.reason')}</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground w-32">{t('refunds.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-40" /></td>
                                        <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-20 ml-auto rounded-lg" /></td>
                                    </tr>
                                ))
                            ) : refunds.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                        {t('refunds.no_refunds')}
                                    </td>
                                </tr>
                            ) : (
                                currentRefunds.map((refund) => (
                                    <tr key={refund.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Hash className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-mono font-medium">{refund.invoice?.number}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                <span>{refund.invoice?.client?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                                {format(new Date(refund.createdAt), 'dd MMM yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-primary">
                                            -{Number(refund.amount).toLocaleString()} {refund.invoice?.currency}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground italic truncate max-w-[200px]" title={refund.reason}>
                                            <div className="flex items-center gap-2">
                                                <Info className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                <span className="truncate pr-1">{refund.reason || t('refunds.no_reason')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => setViewingRefund(refund)}
                                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors"
                                                    title={t('refunds.view_details')}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => downloadRefundPDF(refund.id)}
                                                    disabled={!canDownloadRefund()}
                                                    className={cn(
                                                        "p-1.5 hover:bg-primary/10 hover:text-primary rounded-md transition-colors",
                                                        !canDownloadRefund() && "opacity-50 cursor-not-allowed"
                                                    )}
                                                    title={t('common.download')}
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleSendEmail(refund.id)}
                                                    disabled={isSendingId === refund.id || !canSendRefund()}
                                                    className={cn(
                                                        "p-1.5 hover:bg-primary/10 hover:text-primary rounded-md transition-colors",
                                                        (isSendingId === refund.id || !canSendRefund()) && "opacity-50 cursor-not-allowed"
                                                    )}
                                                    title={t('common.send_email')}
                                                >
                                                    {isSendingId === refund.id ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Send className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewingRefund && (
                <Dialog open={!!viewingRefund} onOpenChange={() => setViewingRefund(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-primary flex items-center gap-2">
                                <RefreshCw className="h-5 w-5" />
                                {t('refunds.details_title')}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-2 space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t('refunds.refund_id')}</span>
                                    <span className="font-mono font-medium">RF-{viewingRefund.id}</span>
                                </div>
                                <div className="space-y-1 text-right">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t('refunds.original_invoice')}</span>
                                    <span className="font-mono font-medium">{viewingRefund.invoice?.number}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t('refunds.client')}</span>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{viewingRefund.invoice?.client?.name}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t('refunds.date')}</span>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(new Date(viewingRefund.createdAt), 'dd MMMM yyyy HH:mm')}</span>
                                </div>
                            </div>

                            <div className="rounded-lg bg-primary/5 p-3 flex justify-between items-center text-primary">
                                <span className="font-bold">{t('refunds.total_refunded')}</span>
                                <span className="mono font-black text-lg">-{Number(viewingRefund.amount).toFixed(2)} {viewingRefund.invoice?.currency}</span>
                            </div>

                            <div className="space-y-1.5">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t('refunds.items_restored')}</span>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                    {viewingRefund.items?.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-start py-2 border-b border-dashed border-muted last:border-0">
                                            <div className="space-y-0.5">
                                                <p className="font-medium leading-none">{item.description}</p>
                                                <p className="text-[10px] text-muted-foreground">{t('refunds.qty_restored')} {item.quantity}</p>
                                            </div>
                                            <span className="mono font-medium">{Number(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {viewingRefund.reason && (
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">{t('refunds.reason')}</span>
                                    <div className="p-3 bg-muted/30 border rounded-lg italic text-muted-foreground">
                                        "{viewingRefund.reason}"
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" className="flex-1" onClick={() => setViewingRefund(null)}>{t('common.cancel')}</Button>
                            <Button
                                className={cn(
                                    "bg-primary hover:bg-primary/90 text-primary-foreground flex-1",
                                    !canDownloadRefund() && "opacity-50 cursor-not-allowed"
                                )}
                                disabled={!canDownloadRefund()}
                                onClick={() => downloadRefundPDF(viewingRefund.id)}
                            >
                                <Download className="h-4 w-4 mr-2" /> PDF
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                    <p className="text-sm text-muted-foreground">
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
