import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { QUOTE_STATUS } from '@/constants/statuses';
import { ArrowRight, Trash2, Plus, X, Search, Download, Send, FileSpreadsheet, XCircle, Ban, RefreshCw, Calendar, ChevronDown, FileText, Pencil, Monitor } from 'lucide-react';
import POSInterface from '@/components/POSInterface';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/ErrorState';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { calculateDocumentTotals } from '@/utils/calculations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast as sonner } from 'sonner';
import { Controller } from 'react-hook-form';
import { DatePicker } from '@/components/ui/date-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxTrigger,
  ComboboxValue,
} from '@/components/ui/combobox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function QuotesPage() {
  const {
    quotes, deleteQuote, rejectQuote, convertQuoteToInvoice, fetchQuotes, updateQuote,
    clients, products, addQuote, fetchClients, fetchProducts,
    downloadQuotePDF, sendQuoteEmail, isLoading, error, exportQuotes
  } = useAppStore();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canCreateQuote, canEditQuote, canDeleteQuote, canViewQuotes, canSendQuote, canConvertQuote, canDownloadQuote, canExportQuotes } = usePermissions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 11;

  const quoteSchema = z.object({
    clientId: z.union([z.string(), z.number()]).refine(val => val !== '', t('invoices.select_client')),
    date: z.string().min(1, t('invoices.issue_date')),
    validUntil: z.string().min(1, t('quotes.valid_until')),
    currency: z.string().default('MAD'),
    items: z.array(z.object({
      productId: z.union([z.string(), z.number()]).optional(),
      description: z.string().min(1, t('invoices.description')),
      quantity: z.coerce.number().min(1),
      price: z.coerce.number().min(0),
      tax: z.coerce.number().default(20),
      discount: z.coerce.number().min(0).optional().default(0),
      discountType: z.enum(['PERCENTAGE', 'AMOUNT']).optional().default('PERCENTAGE'),
    })).min(1, t('invoices.items')),
    notes: z.string().optional().default(''),
  });

  type QuoteFormData = z.infer<typeof quoteSchema>;

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isDirty, isSubmitting } } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      clientId: '',
      items: [{ description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' }],
      currency: 'MAD',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    },
  });

  const watchedItems = watch('items');
  const watchedCurrency = watch('currency');
  const { netHT: totalHT, totalDiscount, taxAmount: totalTVA, totalTTC } = calculateDocumentTotals(watchedItems || []);
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const fetchAll = useCallback(() => {
    fetchQuotes();
    fetchClients();
    fetchProducts();
  }, [fetchQuotes, fetchClients, fetchProducts]);

  const onSubmit = useCallback(async (data: QuoteFormData) => {
    try {
      const payload = {
        ...data,
        clientId: (data.clientId || "").toString(),
        date: new Date(data.date).toISOString().split('T')[0],
        validUntil: new Date(data.validUntil).toISOString().split('T')[0],
        items: data.items.map(item => ({
          ...item,
          productId: (item.productId && item.productId !== "") ? item.productId.toString() : undefined,
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          tax: Number(item.tax) || 0,
          discount: Number(item.discount) || 0
        })),
        status: QUOTE_STATUS.DRAFT,
        total: totalTTC
      };

      if (isEditing && selectedQuote) {
        await updateQuote(selectedQuote.id, payload);
        sonner.success(t('quotes.updated_success', 'Quote updated successfully'));
      } else {
        await addQuote(payload);
        sonner.success(t('quotes.created_success', 'Quote created successfully'));
      }

      setShowForm(false);
      setIsEditing(false);
      setSelectedQuote(null);
      reset({
        clientId: '',
        items: [{ description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' }],
        currency: 'MAD',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchQuotes();
    } catch (error: any) {
      console.error("Quote creation failed:", error.response?.data || error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive"
      });
    }
  }, [isEditing, selectedQuote, totalTTC, t, updateQuote, addQuote, reset, fetchQuotes, toast]);

  const handleCloseForm = () => {
    if (isDirty) {
      setShowExitConfirm(true);
      return;
    }
    performExit();
  };

  const performExit = () => {
    setShowForm(false);
    setIsEditing(false);
    setSelectedQuote(null);
    setShowExitConfirm(false);
    reset({
      clientId: '',
      items: [{ description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' }],
      currency: 'MAD',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const handleNew = () => {
      reset({
        clientId: '',
        items: [{ description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' }],
        currency: 'MAD',
        date: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      });
      setIsEditing(false);
      setShowForm(true);
    };

    const handleSave = () => { if (showForm) handleSubmit(onSubmit)(); };

    window.addEventListener('shortcuts:new-invoice' as any, handleNew);
    window.addEventListener('shortcuts:save-form' as any, handleSave);

    return () => {
      window.removeEventListener('shortcuts:new-invoice' as any, handleNew);
      window.removeEventListener('shortcuts:save-form' as any, handleSave);
    };
  }, [showForm, handleSubmit, reset, onSubmit]);

  const [isSending, setIsSending] = useState<string | null>(null);

  if (error) {
    return <ErrorState error={error} onRetry={fetchAll} />;
  }

  const handleProductSelect = useCallback((index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    setValue(`items.${index}.productId`, productId || '');

    if (product) {
      setValue(`items.${index}.description`, product.name);
      setValue(`items.${index}.price`, Number(product.priceHT));
      setValue(`items.${index}.tax`, Number(product.tva));

      // Stock Limit Check
      const originalItem = isEditing ? selectedQuote?.items?.find((item: any) => item.productId === productId) : null;
      const originalQty = originalItem ? Number(originalItem.quantity) : 0;
      const logicalStock = (Number(product.stock) || 0) + originalQty;

      const currentQty = Number(watchedItems?.[index]?.quantity || 1);
      if (typeof product.stock === 'number' && product.stock >= 0 && currentQty > logicalStock) {
        setValue(`items.${index}.quantity`, logicalStock || 0);
      }
    } else {
      setValue(`items.${index}.description`, '');
      setValue(`items.${index}.price`, 0);
      setValue(`items.${index}.tax`, 0);
    }
  }, [products, setValue, isEditing, selectedQuote, watchedItems]);

  const handleSendEmail = useCallback(async (id: string | number) => {
    try {
      setIsSending(id.toString());
      await sendQuoteEmail(id.toString());
      if (selectedQuote?.id.toString() === id.toString()) {
        setSelectedQuote({ ...selectedQuote, status: QUOTE_STATUS.SENT });
      }
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send email: ${error.response?.data?.message || error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSending(null);
    }
  }, [selectedQuote, sendQuoteEmail, fetchQuotes, toast]);

  const handleEditQuote = useCallback((quoteToEdit: any) => {
    if (!canEditQuote()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit quotes",
        variant: "destructive"
      });
      return;
    }
    reset({
      clientId: quoteToEdit.clientId?.toString() || "",
      items: quoteToEdit.items || [],
      currency: quoteToEdit.currency || "MAD",
      date: quoteToEdit.date ? new Date(quoteToEdit.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      validUntil: quoteToEdit.validUntil ? new Date(quoteToEdit.validUntil).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: quoteToEdit.notes || ""
    });
    setSelectedQuote(quoteToEdit);
    setIsEditing(true);
    setShowForm(true);
  }, [canEditQuote, reset, toast]);

  const handleDeleteQuote = useCallback((id: string | number, number: string) => {
    if (!canDeleteQuote()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete quotes",
        variant: "destructive"
      });
      return;
    }
    handleDeleteWithUndo(id, number);
  }, [canDeleteQuote, toast]);

  const handleDeleteWithUndo = useCallback((id: string | number, number: string) => {
    const timeout = setTimeout(async () => {
      try {
        await deleteQuote(id);
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || `Failed to delete quote ${number}`;
        sonner.error(message);
      }
    }, 5000);

    sonner(`Quote ${number} will be deleted in 5s`, {
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timeout);
          sonner.info("Deletion cancelled");
        }
      }
    });
  }, [deleteQuote]);

  const handleDownloadQuote = useCallback((id: string | number, number: string) => {
    if (!canDownloadQuote()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to download quotes",
        variant: "destructive"
      });
      return;
    }
    downloadQuotePDF(id, number);
  }, [canDownloadQuote, downloadQuotePDF, toast]);

  const handleConvertQuote = useCallback((id: string | number) => {
    if (!canConvertQuote()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to convert quotes",
        variant: "destructive"
      });
      return;
    }
    convertQuoteToInvoice(id);
    setSelectedQuote(null);
  }, [canConvertQuote, convertQuoteToInvoice, toast]);

  const handleRejectQuote = useCallback((id: string | number) => {
    if (!canConvertQuote()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to reject quotes",
        variant: "destructive"
      });
      return;
    }
    rejectQuote(id);
    setSelectedQuote(null);
  }, [canConvertQuote, rejectQuote, toast]);

  const filtered = quotes.filter((q) => {
    const matchSearch =
      (q.client?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (q.number?.toLowerCase() || '').includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || q.status.toLowerCase() === statusFilter.toLowerCase();

    // Date filter
    const quoteDate = new Date(q.date).toISOString().split('T')[0];
    const matchDate = (!startDate || quoteDate >= startDate) && (!endDate || quoteDate <= endDate);

    return matchSearch && matchStatus && matchDate;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentQuotes = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const setQuickFilter = (type: '7days' | 'month' | 'year') => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = '';
    if (type === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().split('T')[0];
    } else if (type === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else if (type === 'year') {
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    }
    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1);
  };

  const statuses = ['all', QUOTE_STATUS.DRAFT, QUOTE_STATUS.SENT, QUOTE_STATUS.VALIDATED, QUOTE_STATUS.REJECTED, QUOTE_STATUS.CONVERTED, QUOTE_STATUS.CANCELLED];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-muted text-muted-foreground border-border';
      case 'SENT': return 'bg-primary/10 text-primary border-primary/20';
      case 'VALIDATED': return 'bg-success/10 text-success border-success/20';
      case 'REJECTED': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'CANCELLED': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            {t('quotes.title')}
          </h1>
          <p className="text-sm font-medium text-foreground/60">{t('quotes.total_quotes', { count: filtered.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreateQuote() && (
            <Button
              variant="outline"
              onClick={() => { navigate('/quotes/creating'); }}
              className="gap-2 h-11 px-4 border-dashed bg-primary/5 hover:bg-primary/10 text-primary transition-all shadow-sm hidden md:flex"
              type="button"
            >
              <Monitor className="h-5 w-5 mr-1" /> {t('common.pos_mode')}
            </Button>
          )}
          {canExportQuotes() && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-11 px-4 border-dashed bg-muted/30">
                  <Download className="h-4 w-4" /> {t('common.export', 'Exporter')} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportQuotes('csv', { startDate, endDate, status: statusFilter })}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportQuotes('excel', { startDate, endDate, status: statusFilter })}>
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {canCreateQuote() && (
            <Button
              onClick={() => { setIsEditing(false); reset({ clientId: '', items: [{ description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' }], currency: 'MAD', date: new Date().toISOString().split('T')[0], notes: '' }); setShowForm(true); }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 shadow-lg shadow-primary/20 text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-5 w-5 mr-2" /> {t('quotes.new_quote')}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col xl:flex-row gap-6 items-center justify-between transition-all">
        <div className="flex flex-col xl:flex-row gap-4 w-full items-start">
          <div className="flex flex-col gap-2 w-full xl:max-w-md">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{t('common.search', 'SEARCH')}</label>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder={t('quotes.search_placeholder', 'Search by number or client...')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring transition-all h-10 shadow-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setCurrentPage(1); }}
                  className="absolute right-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{t('common.date_range')}</label>
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
                    setDate={(endDate) => { setEndDate(endDate?.toISOString().split('T')[0] || ''); setCurrentPage(1); }}
                    placeholder={t('invoices.end_date')}
                    className="w-[170px] h-10 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 invisible">Quick Filters</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQuickFilter('7days')}
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border hover:bg-muted transition-all"
                  >
                    <Calendar className="h-3 w-3 mr-1.5 inline-block" />
                    {t('common.last_7_days')}
                  </button>
                  <button
                    onClick={() => setQuickFilter('month')}
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border hover:bg-muted transition-all"
                  >
                    <Calendar className="h-3 w-3 mr-1.5 inline-block" />
                    {t('common.this_month')}
                  </button>
                  <button
                    onClick={() => setQuickFilter('year')}
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border hover:bg-muted transition-all"
                  >
                    <Calendar className="h-3 w-3 mr-1.5 inline-block" />
                    {t('common.this_year')}
                  </button>
                </div>
              </div>

              <div className="flex items-end pb-1">
                {(startDate || endDate || search || statusFilter !== 'all') && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setStatusFilter('all'); setCurrentPage(1); }}
                    className="text-xs font-bold uppercase tracking-wider text-destructive hover:underline"
                  >
                    {t('common.reset')}
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                    statusFilter === s
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {t(`status.${s.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-foreground/70">{t('quotes.quote')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-foreground/70 hidden sm:table-cell">{t('invoices.client')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-foreground/70 hidden md:table-cell">{t('quotes.valid_until')}</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-foreground/70">{t('invoices.amount')}</th>
                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-foreground/70">{t('invoices.status')}</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-foreground/70 w-16">{t('invoices.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {t('common.no_results')}
                  </td>
                </tr>
              ) : (
                currentQuotes.map((q) => (
                  <tr key={q.id} className="table-row-hover border-b last:border-0 cursor-pointer" onClick={() => setSelectedQuote(q)}>
                    <td className="px-4 py-3 font-medium">{q.number}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{q.client?.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{new Date(q.validUntil).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">{Number(q.total).toFixed(2)} {q.currency}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", getStatusColor(q.status))}>
                        {t(`status.${q.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {q.status === QUOTE_STATUS.DRAFT && canEditQuote() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditQuote(q);
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            title={t('quotes.edit_quote')}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {(q.status === QUOTE_STATUS.DRAFT || q.status === QUOTE_STATUS.SENT) && canSendQuote() && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSendEmail(q.id); }}
                            disabled={isSending === q.id.toString()}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                            title={q.status === QUOTE_STATUS.DRAFT ? t('quotes.send_quote') : t('quotes.send_reminder')}
                          >
                            {isSending === q.id.toString() ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {q.status === QUOTE_STATUS.DRAFT && canDeleteQuote() && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteQuote(q.id, q.number); }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <p className="text-[10px] text-foreground/50 font-black uppercase tracking-widest">
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

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8 pb-4 border-b">
              <h2 className="text-2xl font-black tracking-tight text-primary uppercase">
                {isEditing ? t('quotes.edit_quote') : t('quotes.new_quote')}
              </h2>
              <button onClick={handleCloseForm} className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-all" type="button">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.client')}</label>
                  <Controller
                    name="clientId"
                    control={control}
                    render={({ field }) => {
                      const [clientSearch, setClientSearch] = useState('');

                      const filteredClients = clients.filter(client =>
                        client.name.toLowerCase().includes(clientSearch.toLowerCase())
                      );

                      return (
                        <Combobox
                          value={field.value}
                          onValueChange={(val) => field.onChange(val)}
                        >
                          <ComboboxTrigger className="w-full flex h-10 items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                            <ComboboxValue placeholder={t('invoices.select_client')}>
                              {clients.find(c => c.id === field.value)?.name}
                            </ComboboxValue>
                          </ComboboxTrigger>
                          <ComboboxContent side="bottom" align="start">
                            <div className="flex items-center border-b px-3">
                              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                              <ComboboxInput
                                placeholder={t('invoices.search_placeholder')}
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              />
                            </div>
                            <ComboboxEmpty>{t('common.no_results')}</ComboboxEmpty>
                            <ComboboxList>
                              {filteredClients.map((client) => (
                                <ComboboxItem key={client.id} value={client.id} label={client.name}>
                                  {client.name}
                                </ComboboxItem>
                              ))}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      );
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.issue_date')}</label>
                  <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        setDate={(date) => field.onChange(date?.toISOString().split('T')[0])}
                      />
                    )}
                  />
                  {errors.date && <p className="mt-1 text-[10px] text-destructive font-bold uppercase">{errors.date.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('quotes.valid_until')}</label>
                  <Controller
                    name="validUntil"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        date={field.value ? new Date(field.value) : undefined}
                        setDate={(date) => field.onChange(date?.toISOString().split('T')[0])}
                        disabled={(date: Date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                      />
                    )}
                  />
                  {errors.validUntil && <p className="mt-1 text-[10px] text-destructive font-bold uppercase">{errors.validUntil.message}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.items')}</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' })} className="text-xs h-8">
                    <Plus className="mr-2 h-3.5 w-3.5" /> {t('invoices.add_item')}
                  </Button>
                </div>

                <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <div className="col-span-4">{t('invoices.description')}</div>
                  <div className="col-span-1">{t('invoices.qty')}</div>
                  <div className="col-span-2">{t('invoices.price')}</div>
                  <div className="col-span-1">{t('invoices.tax')}</div>
                  <div className="col-span-3">{t('invoices.discount')}</div>
                  <div className="col-span-1"></div>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end group bg-muted/10 p-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/20 transition-all">
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.description')}</label>
                      <Combobox
                        value={watchedItems?.[index]?.productId || ''}
                        onValueChange={(val) => handleProductSelect(index, val as string)}
                      >
                        <ComboboxTrigger className="w-full flex h-9 items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors">
                          <ComboboxValue placeholder={t('invoices.quick_select')}>
                            {products.find(p => p.id === watchedItems?.[index]?.productId)?.name}
                          </ComboboxValue>
                        </ComboboxTrigger>
                        <ComboboxContent side="bottom" align="start">
                          <ComboboxEmpty>{t('common.no_results')}</ComboboxEmpty>
                          <ComboboxList>
                            {products.map((p) => {
                              const isSelectedElsewhere = watchedItems?.some(
                                (item, idx) => item.productId === p.id && idx !== index
                              );
                              const isOutOfStock = p.stock !== undefined && p.stock <= 0;
                              return (
                                <ComboboxItem
                                  key={p.id}
                                  value={p.id}
                                  label={p.name}
                                  disabled={isSelectedElsewhere || isOutOfStock}
                                  className={cn(
                                    isSelectedElsewhere && "text-muted-foreground opacity-50 bg-muted/50",
                                    isOutOfStock && "text-destructive opacity-50 bg-destructive/5"
                                  )}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>{p.name}</span>
                                    <span className={cn(
                                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                      isOutOfStock ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-700"
                                    )}>
                                      {p.stock} IN STOCK
                                    </span>
                                  </div>
                                </ComboboxItem>
                              );
                            })}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.qty')}</label>
                      {(() => {
                        const item = watchedItems?.[index];
                        const product = products.find(p => p.id === item?.productId);
                        const originalItem = isEditing ? selectedQuote?.items?.find(oi => oi.productId === item?.productId) : null;
                        const originalQty = originalItem ? Number(originalItem.quantity) : 0;
                        const logicalStock = (Number(product?.stock) || 0) + originalQty;
                        const displayStock = product?.stock !== undefined ? Number(product.stock) : 0;

                        return (
                          <>
                            {item?.productId && product?.stock !== undefined && (
                              <span className="text-[10px] text-emerald-600 font-bold mb-1.5 block leading-none">
                                Stock: {displayStock}
                              </span>
                            )}
                            <input
                              type="number"
                              {...register(`items.${index}.quantity`, {
                                valueAsNumber: true,
                                required: t('common.required', 'Required'),
                                min: { value: 1, message: t('common.min_1', 'Min 1') },
                                max: {
                                  value: item?.productId && product?.stock !== undefined ? logicalStock : 999999,
                                  message: `${t('common.insufficient_stock', 'Max stock')}: ${logicalStock}`
                                },
                                onChange: (e) => {
                                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                  const maxStock = item?.productId && product?.stock !== undefined ? logicalStock : 999999;

                                  if (typeof val === 'number') {
                                    if (val > maxStock) {
                                      e.target.value = maxStock.toString();
                                      setValue(`items.${index}.quantity`, maxStock, { shouldValidate: true });
                                    } else if (val < 1) {
                                      e.target.value = '1';
                                      setValue(`items.${index}.quantity`, 1, { shouldValidate: true });
                                    } else {
                                      setValue(`items.${index}.quantity`, val, { shouldValidate: true });
                                    }
                                  }
                                }
                              })}
                              max={item?.productId && product?.stock !== undefined ? logicalStock : undefined}
                              min={1}
                              placeholder={t('invoices.qty')}
                              className={cn(
                                "w-full rounded-lg border bg-background px-2 h-9 text-sm focus:ring-1 focus:ring-ring",
                                errors.items?.[index]?.quantity && "border-destructive focus:ring-destructive"
                              )}
                            />
                            {errors.items?.[index]?.quantity && (
                              <span className="text-[9px] text-destructive mt-0.5 block font-bold leading-tight">
                                {errors.items[index]?.quantity?.message}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.price')}</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.price`)}
                        placeholder={t('invoices.price')}
                        className="w-full rounded-lg border bg-background px-2 h-9 text-sm focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.tax')} %</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.tax`)}
                        placeholder={t('invoices.tax')}
                        className="w-full rounded-lg border bg-muted px-2 h-9 text-xs font-mono"
                        readOnly
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.discount')}</label>
                      <div className="flex h-9 shadow-sm">
                        <input
                          {...register(`items.${index}.discount`)}
                          type="number"
                          step="0.01"
                          placeholder={t('invoices.discount')}
                          className="w-full rounded-l-lg border bg-background px-2 py-2 text-sm focus:ring-1 focus:ring-ring z-10"
                        />
                        <Controller
                          name={`items.${index}.discountType`}
                          control={control}
                          render={({ field }) => (
                            <Combobox
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <ComboboxTrigger className="w-[60px] flex items-center justify-between rounded-r-lg border border-l-0 bg-muted/40 px-2 text-[10px] font-black focus:outline-none hover:bg-muted/60 transition-colors">
                                <ComboboxValue>
                                  {field.value === 'PERCENTAGE' ? '%' : 'MAD'}
                                </ComboboxValue>
                              </ComboboxTrigger>
                              <ComboboxContent align="end">
                                <ComboboxList>
                                  <ComboboxItem value="PERCENTAGE" label="%">%</ComboboxItem>
                                  <ComboboxItem value="AMOUNT" label="MAD">MAD</ComboboxItem>
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          )}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button type="button" onClick={() => remove(index)} className="rounded-md p-2 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-muted/20 p-5 space-y-2 border-2 border-dashed border-muted shadow-sm">
                <div className="flex justify-between items-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
                  <span>{t('invoices.subtotal')}</span>
                  <span className="font-mono text-sm">{(totalHT + totalDiscount).toFixed(2)} {watchedCurrency}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs text-red-600 font-bold uppercase tracking-widest">
                    <span>{t('invoices.discount')}</span>
                    <span className="font-mono text-sm">-{totalDiscount.toFixed(2)} {watchedCurrency}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
                  <span>{t('invoices.tax')} (VAT)</span>
                  <span className="font-mono text-sm">{totalTVA.toFixed(2)} {watchedCurrency}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-muted">
                  <span className="text-sm font-black uppercase tracking-tight text-primary">Total</span>
                  <span className="font-mono text-xl font-black text-primary drop-shadow-sm">{totalTTC.toFixed(2)} {watchedCurrency}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" className="flex-1 h-11 text-xs font-bold uppercase tracking-wider" onClick={handleCloseForm}>{t('invoices.cancel', 'Cancel')}</Button>
                <Button type="submit" className="flex-1 h-11 text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all" disabled={isSubmitting}>
                  {isSubmitting ? (isEditing ? t('common.saving', 'Saving...') : t('common.creating', 'Creating...')) : (isEditing ? t('common.save', 'Save') : t('quotes.create', 'Create'))}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedQuote && !showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-md p-4" onClick={() => setSelectedQuote(null)}>
          <div className="relative w-full max-w-2xl rounded-xl border bg-card shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-primary uppercase">{selectedQuote.number}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedQuote.client?.name}</p>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Quote Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.issue_date')}</p>
                  <p className="text-sm font-medium">{new Date(selectedQuote.date).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('quotes.valid_until')}</p>
                  <p className="text-sm font-medium">{new Date(selectedQuote.validUntil).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.status')}</p>
                  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", getStatusColor(selectedQuote.status))}>
                    {t(`status.${selectedQuote.status.toLowerCase()}`)}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.amount')}</p>
                  <p className="text-sm font-mono font-bold">{Number(selectedQuote.total).toFixed(2)} {selectedQuote.currency}</p>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.items')}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="text-xs font-bold pb-2 text-muted-foreground">{t('invoices.description')}</th>
                        <th className="text-xs font-bold pb-2 text-muted-foreground text-right pr-2">{t('invoices.qty')}</th>
                        <th className="text-xs font-bold pb-2 text-muted-foreground text-right pr-2">{t('invoices.price')}</th>
                        <th className="text-xs font-bold pb-2 text-muted-foreground text-right pr-2">{t('invoices.tax')}</th>
                        <th className="text-xs font-bold pb-2 text-muted-foreground text-right">{t('invoices.subtotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuote.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="py-2">{item.description}</td>
                          <td className="py-2 text-right pr-2">{item.quantity}</td>
                          <td className="py-2 text-right pr-2 font-mono">{Number(item.price).toFixed(2)}</td>
                          <td className="py-2 text-right pr-2 font-mono">{Number(item.tax).toFixed(0)}%</td>
                          <td className="py-2 text-right font-mono font-medium">
                            {((item.price * item.quantity * (1 + item.tax / 100)) - (item.discountType === 'PERCENTAGE' ? (item.price * item.quantity * item.discount / 100) : item.discount)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-xl bg-muted/20 p-4 space-y-2 border-2 border-dashed border-muted">
                <div className="flex justify-between items-center text-xs text-muted-foreground font-bold uppercase">
                  <span>{t('invoices.subtotal')}</span>
                  <span className="font-mono text-sm">{selectedQuote.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0).toFixed(2)} {selectedQuote.currency}</span>
                </div>
                {selectedQuote.items?.some((item: any) => item.discount > 0) && (
                  <div className="flex justify-between items-center text-xs text-red-600 font-bold uppercase">
                    <span>{t('invoices.discount')}</span>
                    <span className="font-mono text-sm">
                      -{selectedQuote.items?.reduce((sum: number, item: any) => {
                        if (item.discountType === 'PERCENTAGE') {
                          return sum + (item.price * item.quantity * item.discount / 100);
                        }
                        return sum + item.discount;
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-muted-foreground font-bold uppercase">
                  <span>{t('invoices.tax')} (VAT)</span>
                  <span className="font-mono text-sm">
                    {selectedQuote.items?.reduce((sum: number, item: any) => {
                      const baseAmount = item.price * item.quantity;
                      const discountAmount = item.discountType === 'PERCENTAGE' ? (baseAmount * item.discount / 100) : item.discount;
                      return sum + ((baseAmount - discountAmount) * item.tax / 100);
                    }, 0).toFixed(2)} {selectedQuote.currency}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t-2 border-muted">
                  <span className="text-sm font-black uppercase tracking-tight text-primary">Total</span>
                  <span className="font-mono text-lg font-black text-primary drop-shadow-sm">{Number(selectedQuote.total).toFixed(2)} {selectedQuote.currency}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedQuote.notes && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('common.notes', 'Notes')}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedQuote.notes}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t p-6 bg-muted/5">
              {selectedQuote.status === QUOTE_STATUS.DRAFT && canDownloadQuote() && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadQuotePDF(selectedQuote.id, selectedQuote.number)}
                  className="text-xs font-bold uppercase"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('common.download')}
                </Button>
              )}
              {(selectedQuote.status === QUOTE_STATUS.DRAFT || selectedQuote.status === QUOTE_STATUS.SENT) && canSendQuote() && (
                <Button
                  size="sm"
                  onClick={() => { handleSendEmail(selectedQuote.id); setSelectedQuote(null); }}
                  disabled={isSending === selectedQuote.id.toString()}
                  className="text-xs font-bold uppercase"
                >
                  {isSending === selectedQuote.id.toString() ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t('quotes.send_quote', 'Send Quote')}
                    </>
                  )}
                </Button>
              )}
              {(selectedQuote.status === QUOTE_STATUS.SENT || selectedQuote.status === QUOTE_STATUS.VALIDATED) && canConvertQuote() && (
                <Button
                  size="sm"
                  onClick={() => handleConvertQuote(selectedQuote.id)}
                  className="text-xs font-bold uppercase"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {t('quotes.convert_to_invoice', 'Convert to Invoice')}
                </Button>
              )}
              {selectedQuote.status === QUOTE_STATUS.SENT && canConvertQuote() && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRejectQuote(selectedQuote.id)}
                  className="text-xs font-bold uppercase"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('quotes.mark_as_rejected', 'Reject')}
                </Button>
              )}
              {selectedQuote.status === QUOTE_STATUS.DRAFT && canEditQuote() && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditQuote(selectedQuote)}
                  className="text-xs font-bold uppercase"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('quotes.edit_quote', 'Edit')}
                </Button>
              )}
              {selectedQuote.status === QUOTE_STATUS.DRAFT && canDeleteQuote() && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => { handleDeleteQuote(selectedQuote.id, selectedQuote.number); setSelectedQuote(null); }}
                  className="text-xs font-bold uppercase"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('invoices.delete', 'Delete')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.unsaved_changes', 'Unsaved Changes')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.unsaved_changes_desc', 'You have unsaved changes. Are you sure you want to exit? All progress will be lost.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={performExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.exit_anyway', 'Exit Anyway')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
