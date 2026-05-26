import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Trash2,
  X,
  Download,
  Eye,
  Send,
  Receipt,
  FileText,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Filter,
  RefreshCw,
  CheckSquare,
  Square,
  MoreHorizontal,
  ChevronDown,
  Pencil,
  Monitor,
} from 'lucide-react';
import POSInterface from '@/components/POSInterface';
import { toast as sonner } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { calculateDocumentTotals, calculateLineNetPrice } from '@/utils/calculations';
import { INVOICE_STATUS } from '@/constants/statuses';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ErrorState } from '@/components/common/ErrorState';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useSmartButtons } from '@/hooks/useSmartButtons';
import { CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { DatePicker } from '@/components/ui/date-picker';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
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

export default function InvoicesPage() {
  const {
    invoices,
    products,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoiceEmail,
    downloadInvoicePDF,
    downloadRefundPDF,
    sendRefundEmail,
    createCreditNote,
    addPayment,
    clients,
    fetchInvoices,
    fetchClients,
    fetchProducts,
    exportInvoices,
    bulkDeleteInvoices,
    settings,
    fetchSettings,
    isLoading,
    error,
  } = useAppStore();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { canCreateInvoice, canEditInvoice, canDeleteInvoice, canDownloadInvoice, canExportInvoices, canSendInvoice, canRecordPayment, canCancelInvoice, canVoidInvoice, canRefundInvoice, canCreateCreditNote, isAdmin } = usePermissions();
  const fetchAll = () => {
    fetchInvoices();
    fetchClients();
    fetchProducts();
  };

  useEffect(() => {
    fetchAll();
    if (!settings) fetchSettings();
  }, [fetchInvoices, fetchClients, fetchProducts, fetchSettings, settings]);


  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [isPosMode, setIsPosMode] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'BANK_TRANSFER',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });





  const invoiceSchema = z.object({
    clientId: z.string().min(1, t('invoices.select_client')),
    date: z.string().min(1, t('invoices.issue_date')),
    dueDate: z.string().min(1, t('invoices.due_date')),
    currency: z.string().default('MAD'),
    items: z.array(z.object({
      productId: z.string().min(1, t('invoices.items')), // force selecting a product
      description: z.string().min(1, t('invoices.description')),
      quantity: z.coerce.number().min(1),
      price: z.coerce.number().min(0),
      tax: z.coerce.number().default(20),
      discount: z.coerce.number().min(0).optional().default(0),
      discountType: z.enum(['PERCENTAGE', 'AMOUNT']).optional().default('PERCENTAGE'),
    })).min(1, t('invoices.items')),
    legalMentions: z.string().optional(),
    remindersEnabled: z.boolean().default(true),
  });

  type InvoiceFormData = z.infer<typeof invoiceSchema>;

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      items: [{ productId: '', description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' }],
      currency: settings?.currency || 'MAD',
      date: new Date().toISOString().split('T')[0],
      remindersEnabled: true
    },
  });

  const handleNewInvoice = () => {
    reset({
      items: [{ productId: '', description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' }],
      currency: settings?.currency || 'MAD',
      date: new Date().toISOString().split('T')[0],
      remindersEnabled: true
    });
    setEditingInvoice(null);
    setShowForm(true);
  };

  useEffect(() => {
    const handleNewShortcut = () => {
      navigate('/invoices/creating');
    };

    const handleSaveForm = () => {
      if (showForm) {
        handleSubmit(onSubmit)();
      }
    };

    window.addEventListener('shortcuts:new-invoice' as any, handleNewShortcut);
    window.addEventListener('shortcuts:save-form' as any, handleSaveForm);
    return () => {
      window.removeEventListener('shortcuts:new-invoice' as any, handleNewShortcut);
      window.removeEventListener('shortcuts:save-form' as any, handleSaveForm);
    };
  }, [showForm, handleSubmit, reset, settings]);






  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch('items');
  const watchedCurrency = watch('currency');

  const { subtotalGross: totalHT_raw, totalDiscount, taxAmount: totalTVA, totalTTC } = calculateDocumentTotals(watchedItems || []);
  const totalHT = totalHT_raw - totalDiscount;

  if (error) {
    return <ErrorState error={error} onRetry={fetchAll} />;
  }

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      if (isEditing && editingInvoice) {
        await updateInvoice(editingInvoice.id, {
          ...data,
          total: totalTTC,
        } as any);
        sonner.success('Invoice updated successfully');
      } else {
        await addInvoice({
          ...data,
          total: totalTTC,
          status: INVOICE_STATUS.DRAFT
        });
      }
      setShowForm(false);
      setIsEditing(false);
      setEditingInvoice(null);
      reset();
    } catch (error: any) {
      console.error('Invoice save error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive"
      });
    }
  };

  const openEditForm = (inv: any) => {
    setEditingInvoice(inv);
    setIsEditing(true);
    reset({
      clientId: inv.clientId?.toString() || '',
      date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
      currency: inv.currency || 'MAD',
      legalMentions: inv.legalMentions || '',
      remindersEnabled: inv.remindersEnabled ?? true,
      items: (inv.items || []).map((item: any) => ({
        productId: item.productId?.toString() || '',
        description: item.description || '',
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        tax: Number(item.tax) || 0,
        discount: Number(item.discount) || 0,
        discountType: item.discountType || 'PERCENTAGE',
      })),
    });
    setIsPosMode(false);
    setShowForm(true);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    setValue(`items.${index}.productId`, productId || '');

    if (product) {
      // Lock the item to the product data
      setValue(`items.${index}.description`, product.name);
      setValue(`items.${index}.price`, Number(product.priceHT));
      setValue(`items.${index}.tax`, Number(product.tva));

      // Ensure quantity does not exceed stock
      const currentQty = Number(watchedItems?.[index]?.quantity || 1);
      if (typeof product.stock === 'number' && product.stock >= 0 && currentQty > product.stock) {
        setValue(`items.${index}.quantity`, product.stock || 0);
      }
    } else {
      // Reset fields if product cleared
      setValue(`items.${index}.description`, '');
      setValue(`items.${index}.price`, 0);
      setValue(`items.${index}.tax`, 0);
    }
  };

  const [isSendingId, setIsSendingId] = useState<string | null>(null);

  const handleSendEmail = async (id: string | number) => {
    if (!canSendInvoice()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to send invoices",
        variant: "destructive"
      });
      return;
    }
    try {
      setIsSendingId(id.toString());
      await sendInvoiceEmail(id.toString());
      if (viewing?.id.toString() === id.toString()) {
        setViewing({ ...viewing, status: INVOICE_STATUS.SENT });
      }
      fetchInvoices();
      setViewing(null);
      toast({
        title: "Success",
        description: "Invoice sent successfully! Any client credit balance has been applied.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send email: ${error.response?.data?.message || error.message} `,
        variant: "destructive"
      });
    } finally {
      setIsSendingId(null);
    }
  };

  const [isSendingRefundId, setIsSendingRefundId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleApplyRefund = async (invoiceId: string | number, amount: number) => {
    try {
      setIsSendingRefundId(invoiceId.toString());
      await sendRefundEmail(invoiceId.toString());
      toast({
        title: "Success",
        description: "Refund email sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send email: ${error.response?.data?.message || error.message} `,
        variant: "destructive"
      });
    } finally {
      setIsSendingRefundId(null);
    }
  };

  const [isCreatingCreditNote, setIsCreatingCreditNote] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<any>(null);

  const handleCreateCreditNote = async (id: string | number, data: any) => {
    if (!canCreateCreditNote()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create credit notes",
        variant: "destructive"
      });
      return;
    }
    if (isCreatingCreditNote) return;
    try {
      setIsCreatingCreditNote(true);
      await createCreditNote(id.toString(), data);
      toast({
        title: "Success",
        description: 'Credit note created successfully!',
      });
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed: ${error.response?.data?.message || error.message} `,
        variant: "destructive"
      });
    } finally {
      setIsCreatingCreditNote(false);
      setShowCreditNoteModal(false);
      setSelectedInvoice(null);
      setViewing(null);
      setCreditNoteReason('');
      setCreditNoteItems({});
      setCreditNoteAmount('');
      setCreditNoteType('FULL');
    }
  };

  const handleDeleteInvoice = async (id: string | number) => {
    if (!canDeleteInvoice()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete invoices",
        variant: "destructive"
      });
      return;
    }
    try {
      await deleteInvoice(id);
      setShowDeleteConfirm(null);
      toast({ title: t('common.success'), description: t('common.deleted') });
    } catch (err: any) {
      toast({ title: t('common.error'), description: t('common.failed_delete'), variant: "destructive" });
    }
  };

  const handleCancelInvoice = async (id: string | number) => {
    if (!canVoidInvoice()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to void/cancel invoices",
        variant: "destructive"
      });
      return;
    }
    try {
      await api.post(`/invoices/${id}/cancel`);
      setShowCancelConfirm(null);
      setViewing(null);
      fetchInvoices();
      toast({ title: "Success", description: "Invoice cancelled successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to cancel invoice", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (showCreditNoteModal && selectedInvoice) {
      setCreditNoteItems({});
      setCreditNoteType('FULL');
      setCreditNoteAmount('');
    }
  }, [showCreditNoteModal, selectedInvoice]);

  const [refundType, setRefundType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [isRefunding, setIsRefunding] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundItems, setRefundItems] = useState<Record<string, number>>({});
  const [refundToCreditBalance, setRefundToCreditBalance] = useState(false);

  const [creditNoteType, setCreditNoteType] = useState<'FULL' | 'PARTIAL' | 'ITEM'>('FULL');
  const [creditNoteAmount, setCreditNoteAmount] = useState<string>('');
  const [creditNoteReason, setCreditNoteReason] = useState('');
  const [creditNoteItems, setCreditNoteItems] = useState<Record<string, number>>({});

  const getStatusColor = (status: string) => {
    switch (status) {
      case INVOICE_STATUS.DRAFT: return 'bg-muted text-muted-foreground border-border';
      case INVOICE_STATUS.SENT: return 'bg-primary/10 text-primary border-primary/20';
      case INVOICE_STATUS.PARTIALLY_PAID: return 'bg-success/10 text-success border-success/20';
      case INVOICE_STATUS.PAID: return 'bg-success/20 text-success border-success/30';
      case INVOICE_STATUS.OVERDUE: return 'bg-destructive/10 text-destructive border-destructive/20';
      case INVOICE_STATUS.CANCELLED: return 'bg-destructive/10 text-destructive border-destructive/20';
      case INVOICE_STATUS.REFUNDED: return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case INVOICE_STATUS.PARTIALLY_REFUNDED: return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case INVOICE_STATUS.CREDITED: return 'bg-indigo-500/10 text-indigo-600 border-indigo-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handleRefund = async (id: string | number, itemsToRefund?: any[]) => {
    if (!canRefundInvoice()) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to refund invoices",
        variant: "destructive"
      });
      return;
    }
    if (isRefunding) return;
    try {
      setIsRefunding(true);
      const { refundInvoice } = useAppStore.getState();
      await refundInvoice(id.toString(), refundReason, itemsToRefund, refundToCreditBalance);
      toast({
        title: "Success",
        description: itemsToRefund ? 'Partial refund processed successfully! Stock restored.' : 'Full refund processed successfully! Stock restored.',
      });
      fetchInvoices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed: ${error.response?.data?.message || error.message} `,
        variant: "destructive"
      });
    } finally {
      setIsRefunding(false);
      setShowRefundModal(false);
      setSelectedInvoice(null);
      setViewing(null);
      setRefundReason('');
      setRefundItems({});
    }
  };

  useEffect(() => {
    if (showRefundModal && selectedInvoice) {
      setRefundItems({});
      setRefundType('FULL');
    }
  }, [showRefundModal, selectedInvoice]);

  const handleDeleteWithUndo = async (id: string) => {
    const timeout = setTimeout(async () => {
      try {
        await deleteInvoice(id);
      } catch (e: any) {
        sonner.error("Failed to delete invoice");
      }
    }, 5000);

    sonner("Invoice will be deleted in 5s", {
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timeout);
          sonner.info("Deletion cancelled");
        }
      }
    });
  };

  const handleRegisterPayment = (invoice: any) => {
    const totalReturnedValue = invoice.refunds?.reduce((sum: number, r: any) => {
      let metadata = r.metadata;
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
      }
      return sum + parseFloat(metadata?.originalRequestedValue?.toString() || '0');
    }, 0) || 0;

    const totalCredited = invoice.creditNotes?.filter((cn: any) => cn.status === 'APPLIED' || cn.status === 'REFUNDED').reduce((sum: number, cn: any) => sum + parseFloat(cn.total?.toString() || '0'), 0) || 0;

    const effectiveTotal = Math.max(0, Number(invoice.total) - totalReturnedValue - totalCredited);
    const totalNetPaid = invoice.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
    const remaining = Math.max(0, effectiveTotal - totalNetPaid);

    setSelectedInvoice(invoice);
    setPaymentData({
      ...paymentData,
      amount: remaining,
      date: new Date().toISOString().split('T')[0]
    });
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (isRegisteringPayment) return;
    const totalPaid = selectedInvoice.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
    const remaining = Number(selectedInvoice.total) - totalPaid;
    const originalStatus = selectedInvoice.status;

    if (selectedInvoice.status === INVOICE_STATUS.PARTIALLY_PAID && Number(paymentData.amount) > remaining) {
      toast({
        title: "Invalid Amount",
        description: `Maximum payment allowed is ${remaining.toFixed(2)} `,
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRegisteringPayment(true);

      // --- NEW: Optimistic Update ---
      const newStatus = Number(paymentData.amount) >= remaining ? INVOICE_STATUS.PAID : INVOICE_STATUS.PARTIALLY_PAID;
      const { optimisticUpdateInvoice } = useAppStore.getState();
      optimisticUpdateInvoice(selectedInvoice.id, { status: newStatus as any });

      sonner.success(t('payments.success_optimistic'), {
        description: `${paymentData.amount} ${selectedInvoice.currency} for ${selectedInvoice.number}`
      });

      await addPayment({
        invoiceId: selectedInvoice.id,
        amount: Number(paymentData.amount),
        method: paymentData.method,
        date: paymentData.date,
        note: paymentData.note
      });

      fetchInvoices();
      setShowPaymentModal(false);
      setViewing(null);
    } catch (error: any) {
      // Revert optimistic update on error
      const { optimisticUpdateInvoice } = useAppStore.getState();
      optimisticUpdateInvoice(selectedInvoice.id, { status: originalStatus });

      toast({
        title: "Payment Error",
        description: error.response?.data?.message || error.message,
        variant: "destructive"
      });
    } finally {
      setIsRegisteringPayment(false);
    }
  };

  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 11;

  const setQuickFilter = (type: '7days' | 'month' | 'year') => {
    const now = new Date();
    let start = new Date();
    const end = new Date();

    if (type === '7days') {
      start.setDate(now.getDate() - 7);
    } else if (type === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (type === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setCurrentPage(1);
  };



  const filtered = invoices.filter((inv) => {
    const matchSearch = (inv.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      inv.number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status.toLowerCase() === statusFilter.toLowerCase();

    // Date filter
    const invDate = new Date(inv.date).toISOString().split('T')[0];
    const matchDate = (!startDate || invDate >= startDate) && (!endDate || invDate <= endDate);

    return matchSearch && matchStatus && matchDate;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentInvoices = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statuses = ['all', INVOICE_STATUS.DRAFT, INVOICE_STATUS.SENT, INVOICE_STATUS.PARTIALLY_PAID, INVOICE_STATUS.PAID, INVOICE_STATUS.SETTLED_WITH_RETURNS, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.CANCELLED, INVOICE_STATUS.REFUNDED, INVOICE_STATUS.PARTIALLY_REFUNDED, INVOICE_STATUS.CREDITED];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            {t('invoices.title')}
          </h1>
          <p className="text-sm font-medium text-foreground/60">{t('invoices.total_invoices', { count: filtered.length })}</p>
        </div>
        <div className="flex gap-2">
          {canCreateInvoice() && (
            <Button
              variant="outline"
              onClick={() => { navigate('/invoices/creating'); }}
              className="gap-2 h-11 px-4 border-dashed bg-primary/5 hover:bg-primary/10 text-primary transition-all shadow-sm hidden md:flex"
              type="button"
            >
              <Monitor className="h-5 w-5 mr-1" /> {t('common.pos_mode')}
            </Button>
          )}

          {canExportInvoices() && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 h-11 px-4 border-dashed bg-muted/30">
                  <Download className="h-4 w-4" /> {t('common.export', 'Exporter')} <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportInvoices('csv', { startDate, endDate, status: statusFilter })}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportInvoices('excel', { startDate, endDate, status: statusFilter })}>
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canCreateInvoice() && (
            <Button
              onClick={handleNewInvoice}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 shadow-lg shadow-primary/20 text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-5 w-5 mr-2" /> {t('invoices.new_invoice')}
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
                placeholder={t('invoices.search_placeholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring transition-all h-10 shadow-sm"
              />
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
                    setDate={(date) => { setEndDate(date?.toISOString().split('T')[0] || ''); setCurrentPage(1); }}
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

                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-foreground/70">{t('invoices.invoice')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-foreground/70 hidden sm:table-cell">{t('invoices.client')}</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-foreground/70 hidden md:table-cell">{t('invoices.due_date')}</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-foreground/70">{t('invoices.amount')}</th>
                <th className="px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-foreground/70">{t('invoices.status')}</th>
                <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-foreground/70 w-16">{t('invoices.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-4"><Skeleton className="h-4 w-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : currentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {t('common.no_results')}
                  </td>
                </tr>
              ) : (
                currentInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="table-row-hover border-b last:border-0 cursor-pointer"
                    onClick={async () => {
                      try {
                        setLoadingInvoiceId(inv.id);
                        const res = await api.get(`/invoices/${inv.id}`);
                        setViewing(res.data.data.invoice);
                      } catch (e) {
                        console.error('Failed to fetch invoice details', e);
                        setViewing(inv);
                      } finally {
                        setLoadingInvoiceId(null);
                      }
                    }}
                  >

                    <td className="px-4 py-3 mono font-medium">{inv.number}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{inv.client?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right mono font-semibold">{Number(inv.total).toLocaleString()} {inv.currency}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`status-badge ${inv.status === INVOICE_STATUS.PAID ? 'status-paid' :
                        inv.status === INVOICE_STATUS.SETTLED_WITH_RETURNS ? 'status-settled-with-returns' :
                          inv.status === INVOICE_STATUS.PARTIALLY_PAID ? 'status-partially-paid' :
                            inv.status === INVOICE_STATUS.OVERDUE ? 'status-overdue' :
                              inv.status === INVOICE_STATUS.SENT ? 'status-sent' :
                                inv.status === INVOICE_STATUS.CANCELLED ? 'status-cancelled' :
                                  inv.status === INVOICE_STATUS.REFUNDED || inv.status === INVOICE_STATUS.PARTIALLY_REFUNDED ? 'bg-purple-500/10 text-purple-600 border-purple-200' :
                                    inv.status === INVOICE_STATUS.CREDITED ? 'bg-indigo-500/10 text-indigo-600 border-indigo-200' :
                                      'status-draft'
                        }`}>{t(`status.${inv.status.toLowerCase()}`)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <InvoiceRowActions
                        inv={inv}
                        downloadInvoicePDF={downloadInvoicePDF}
                        handleSendEmail={handleSendEmail}
                        handleCreateCreditNote={handleCreateCreditNote}
                        deleteInvoice={deleteInvoice}
                        isSending={isSendingId === inv.id.toString()}
                        setShowDeleteConfirm={setShowDeleteConfirm}
                        setShowCreditNoteModal={setShowCreditNoteModal}
                        setSelectedInvoice={setSelectedInvoice}
                        onEdit={openEditForm}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {
        totalPages > 1 && (
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
        )
      }

      {
        viewing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setViewing(null)}>
            <div className="w-full max-w-lg rounded-xl border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              {/* Sticky Header with Blur */}
              <div className="sticky top-0 z-10 flex items-center justify-between bg-card/80 backdrop-blur-md px-6 py-4 border-b">
                <div>
                  <h2 className="text-lg font-bold mono tracking-tight text-foreground">{viewing.number}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(viewing.status)}`}>
                      {t(`status.${viewing.status.toLowerCase()}`)}
                    </span>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">{viewing.client?.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  {canDownloadInvoice() && (
                    <button
                      onClick={() => downloadInvoicePDF(viewing.id, viewing.number)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
                      title={t('invoices.download_pdf')}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setViewing(null)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 max-h-[calc(90vh-70px)] overflow-y-auto">
                <div className="space-y-4 text-sm mt-4">
                  <div className="grid grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border border-border/50">
                    <div className="space-y-1">
                      <label className="text-foreground/60 block text-[9px] uppercase font-black tracking-widest">{t('invoices.issue_date')}</label>
                      <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary/60" />
                        {new Date(viewing.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-foreground/60 block text-[9px] uppercase font-black tracking-widest">{t('invoices.due_date')}</label>
                      <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-orange-500/60" />
                        {new Date(viewing.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <hr className="border-border" />
                  <div className="space-y-2">
                    {viewing.items?.map((item: any, i: number) => {
                      const qty = Number(item.quantity);
                      const price = Number(item.price);
                      const discount = Number(item.discount || 0);
                      const originalLineHT = qty * price;
                      let lineDiscount = 0;
                      if (item.discountType === 'AMOUNT' || item.discountType === 'MAD') {
                        lineDiscount = discount;
                      } else {
                        lineDiscount = originalLineHT * (discount / 100);
                      }
                      const lineHT = Math.max(0, originalLineHT - lineDiscount);

                      return (
                        <div key={i} className="flex justify-between items-start py-2 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors px-1 rounded-md">
                          <div className="flex-1">
                            <p className="font-bold text-foreground leading-snug">{item.description}</p>
                            {discount > 0 && (
                              <p className="text-[10px] text-red-600 font-bold uppercase mt-0.5 tracking-wider">
                                {t('invoices.discount')}: {item.discountType === 'AMOUNT' || (item.discountType as any) === 'MAD' ? `${discount.toFixed(2)} ${viewing.currency}` : `${discount}%`}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">{qty} × {price.toFixed(2)} {viewing.currency}</span>
                              {discount > 0 && (
                                <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold border border-red-100/50">
                                  {t('invoices.discount')}: {item.discountType === 'AMOUNT' ? `${discount} ${viewing.currency}` : `${discount}%`}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="mono font-bold text-foreground">{Number(lineHT).toFixed(2)}</span>
                            {discount > 0 && (
                              <p className="text-[9px] text-muted-foreground line-through opacity-60">
                                {originalLineHT.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <hr className="border-border" />
                  <div className="space-y-3 bg-muted/40 p-5 rounded-2xl border border-border/50 mt-4">
                    {(() => {
                      const { subtotalGross, totalDiscount, taxAmount: totalTVA, totalTTC: grandTotal } = calculateDocumentTotals(viewing.items || []);

                      return (
                        <>
                          <div className="flex justify-between text-muted-foreground text-xs font-medium">
                            <span>{t('invoices.subtotal')}</span>
                            <span className="tabular-nums font-semibold">{(subtotalGross).toFixed(2)} <span className="text-[10px] opacity-60 ml-1">{viewing.currency}</span></span>
                          </div>
                          {totalDiscount > 0 && (
                            <div className="flex justify-between text-red-600 text-xs font-bold uppercase tracking-tight">
                              <span>{t('invoices.discount')}</span>
                              <span className="tabular-nums">-{totalDiscount.toFixed(2)} <span className="text-[10px] opacity-60 ml-1">{viewing.currency}</span></span>
                            </div>
                          )}
                          <div className="flex justify-between text-muted-foreground text-xs font-medium">
                            <span>{t('invoices.tax')}</span>
                            <span className="tabular-nums font-semibold">{totalTVA.toFixed(2)} <span className="text-[10px] opacity-60 ml-1">{viewing.currency}</span></span>
                          </div>
                          <div className="flex justify-between items-baseline pt-4 border-t-2 border-primary/20 mt-4">
                            <span className="text-xs font-black uppercase tracking-widest text-primary">{t('invoices.total')}</span>
                            <div className="text-right">
                              <span className="text-3xl font-black tracking-tighter tabular-nums text-foreground">
                                {grandTotal.toFixed(2)}
                              </span>
                              <span className="text-xs font-black text-primary ml-2 tracking-widest">{viewing.currency}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {/* Payments Section */}
                  {viewing.payments && viewing.payments.length > 0 && (() => {
                    const positivePayments = viewing.payments.filter((p: any) => !p.isRefund);
                    const netTotalPayments = viewing.payments.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;

                    const totalRefundCash = Math.abs(viewing.payments.filter((p: any) => p.isRefund).reduce((s: number, p: any) => s + Number(p.amount), 0));

                    const totalReturnedValue = viewing.refunds?.reduce((sum: number, r: any) => {
                      let metadata = r.metadata;
                      if (typeof metadata === 'string') {
                        try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
                      }
                      return sum + parseFloat(metadata?.originalRequestedValue?.toString() || '0');
                    }, 0) || 0;

                    const totalCredited = viewing.creditNotes?.filter((cn: any) => cn.status === 'APPLIED' || cn.status === 'REFUNDED').reduce((sum: number, cn: any) => sum + parseFloat(cn.total?.toString() || '0'), 0) || 0;

                    const effectiveTotal = Math.max(0, Number(viewing.total) - totalReturnedValue - totalCredited);
                    const remaining = Math.max(0, effectiveTotal - netTotalPayments);

                    return (
                      <div className="mt-4 rounded-lg border bg-muted/20 p-4 space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-xs font-bold uppercase text-muted-foreground">{t('payments.title')}</h3>
                          <div className="flex gap-2">
                            {totalRefundCash > 0 && (
                              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                -{totalRefundCash.toFixed(2)} Refunded
                              </span>
                            )}
                          </div>
                        </div>

                        {positivePayments.map((p: any) => (
                          <div key={p.id} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{new Date(p.date).toLocaleDateString()} · {t(`payments.methods.${p.method.toLowerCase()} `)}</span>
                            <span className="font-mono font-medium">{Number(p.amount).toFixed(2)} {viewing.currency}</span>
                          </div>
                        ))}

                        <div className="border-t pt-2 space-y-2">
                          {/* Business Summary */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                              <span>Original Total</span>
                              <span className="mono">{Number(viewing.total).toFixed(2)} {viewing.currency}</span>
                            </div>
                            {totalReturnedValue > 0 && (
                              <div className="flex justify-between text-[10px] text-purple-600 uppercase font-bold tracking-tight">
                                <span>Returned Items Value</span>
                                <span className="mono">-{totalReturnedValue.toFixed(2)} {viewing.currency}</span>
                              </div>
                            )}
                            {totalCredited > 0 && (
                              <div className="flex justify-between text-[10px] text-orange-600 uppercase font-bold tracking-tight">
                                <span>Applied Credits</span>
                                <span className="mono">-{totalCredited.toFixed(2)} {viewing.currency}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs font-black border-t border-dashed pt-1">
                              <span className="text-primary uppercase tracking-tighter">Effective Business Total</span>
                              <span className="mono text-primary font-black">{effectiveTotal.toFixed(2)} {viewing.currency}</span>
                            </div>
                          </div>

                          {/* Payment Summary */}
                          <div className="space-y-1 pt-2 border-t border-muted/30">
                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                              <span>Total Collected</span>
                              <span className="mono">{positivePayments.reduce((s: number, p: any) => s + Number(p.amount), 0).toFixed(2)} {viewing.currency}</span>
                            </div>
                            {totalRefundCash > 0 && (
                              <div className="flex justify-between text-[10px] text-purple-600 uppercase font-bold tracking-tight">
                                <span>Cash Refunded</span>
                                <span className="mono">-{totalRefundCash.toFixed(2)} {viewing.currency}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-[10px] font-black italic text-muted-foreground/80 pt-0.5">
                              <span>NET PAID SO FAR</span>
                              <span className="mono">{(effectiveTotal - remaining).toFixed(2)} {viewing.currency}</span>
                            </div>
                          </div>
                        </div>

                        {remaining > 0.01 && viewing.status !== INVOICE_STATUS.REFUNDED && (
                          <div className="flex justify-between text-lg font-black border-t-2 border-primary/20 pt-3 mt-2">
                            <span className="text-foreground tracking-tighter uppercase">{t('payments.balance_due')}</span>
                            <span className="mono text-destructive drop-shadow-sm">{remaining.toFixed(2)} {viewing.currency}</span>
                          </div>
                        )}


                        <div className="text-center mt-3 pt-2 border-t border-muted-foreground/10">
                          {viewing.status === INVOICE_STATUS.REFUNDED ? (
                            <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-purple-600/20">{t('status.refunded')}</span>
                          ) : viewing.status === INVOICE_STATUS.SETTLED_WITH_RETURNS ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-emerald-600/10 border-dashed border-emerald-400">
                              <RefreshCw className="mr-1 h-3 w-3" /> {t('status.settled_with_returns')}
                            </span>
                          ) : viewing.status === INVOICE_STATUS.PARTIALLY_REFUNDED ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-purple-600/10">{t('status.partially_refunded')}</span>
                              {remaining > 0 && (
                                <p className="text-[10px] text-amber-600 font-bold">{t('payments.remaining_balance')}: {remaining.toFixed(2)} {viewing.currency}</p>
                              )}
                            </div>
                          ) : remaining > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-amber-600/20">{t('status.partially_paid')}</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-bold ring-1 ring-inset ring-emerald-600/20">{t('status.paid')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Refunds Section */}
                  {viewing.refunds && viewing.refunds.length > 0 && (
                    <div className="mt-4 rounded-lg border border-purple-100 bg-purple-50/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 text-purple-600" />
                        <h3 className="text-xs font-bold uppercase text-purple-700 tracking-tight">{t('refunds.history')}</h3>
                      </div>
                      {viewing.refunds.map((refund: any) => (
                        <div key={refund.id} className="space-y-1 pb-2 border-b border-purple-100 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center text-xs font-bold text-purple-800">
                            <span>{new Date(refund.createdAt).toLocaleDateString()}</span>
                            <div className="flex items-center gap-2">
                              <span className="mono">-{Number(refund.amount).toFixed(2)} {viewing.currency}</span>
                              <div className="flex gap-1 ml-2">
                                {canDownloadInvoice() && (
                                  <button
                                    onClick={() => downloadRefundPDF(refund.id)}
                                    className="p-1 rounded hover:bg-purple-200 text-purple-700 transition-colors"
                                    title={t('invoices.download_pdf')}
                                  >
                                    <Download className="h-3 w-3" />
                                  </button>
                                )}
                                {canSendInvoice() && (
                                  <button
                                    onClick={() => handleSendRefundEmail(refund.id)}
                                    disabled={isSendingRefundId === refund.id.toString()}
                                    className="p-1 rounded hover:bg-purple-200 text-purple-700 transition-colors disabled:opacity-50"
                                    title={t('common.send_email')}
                                  >
                                    {isSendingRefundId === refund.id.toString() ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          {refund.reason && <p className="text-[10px] italic text-purple-600/70">"{refund.reason}"</p>}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {refund.items?.map((item: any, idx: number) => (
                              <span key={idx} className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                {item.quantity}× {item.description}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="pt-2 border-t mt-4">
                    <InvoiceDetailActions
                      viewing={viewing}
                      setViewing={setViewing}
                      handleSendEmail={handleSendEmail}
                      handleCreateCreditNote={handleCreateCreditNote}
                      handleRegisterPayment={handleRegisterPayment}
                      isSendingId={isSendingId}
                      setShowCancelConfirm={setShowCancelConfirm}
                      setSelectedInvoice={setSelectedInvoice}
                      setShowCreditNoteModal={setShowCreditNoteModal}
                      setShowRefundModal={setShowRefundModal}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <Dialog open={showCreditNoteModal} onOpenChange={(open) => {
        setShowCreditNoteModal(open);
        if (!open) {
          setSelectedInvoice(null);
          setCreditNoteReason('');
          setCreditNoteItems({});
          setCreditNoteType('FULL');
          setCreditNoteAmount('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-orange-600 flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t('credit_notes.create_title', 'Create Credit Note')} {selectedInvoice?.number}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="flex p-1 bg-muted rounded-lg border">
              <button
                onClick={() => setCreditNoteType('FULL')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${creditNoteType === 'FULL' ? 'bg-background shadow-sm text-orange-600' : 'text-muted-foreground'}`}
              >
                Full
              </button>
              <button
                onClick={() => setCreditNoteType('PARTIAL')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${creditNoteType === 'PARTIAL' ? 'bg-background shadow-sm text-orange-600' : 'text-muted-foreground'}`}
              >
                Amount
              </button>
              <button
                onClick={() => setCreditNoteType('ITEM')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${creditNoteType === 'ITEM' ? 'bg-background shadow-sm text-orange-600' : 'text-muted-foreground'}`}
              >
                Items
              </button>
            </div>

            {creditNoteType === 'PARTIAL' && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Credit Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={creditNoteAmount}
                    onChange={(e) => setCreditNoteAmount(e.target.value)}
                    className="w-full rounded-lg border bg-background py-2.5 px-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{selectedInvoice?.currency}</span>
                </div>
              </div>
            )}

            {creditNoteType === 'ITEM' && selectedInvoice?.items && (
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Select items to credit</label>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item: any) => {
                    const alreadyCredited = selectedInvoice.creditNotes?.reduce((sum: number, cn: any) => {
                      if (cn.status === 'CANCELLED') return sum;
                      const cnItem = cn.items?.find((i: any) => i.productId === item.productId && i.description === item.description);
                      return sum + (cnItem?.quantity || 0);
                    }, 0) || 0;
                    const available = Math.max(0, item.quantity - alreadyCredited);

                    if (available === 0) return null;

                    return (
                      <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!creditNoteItems[item.id.toString()]}
                          onChange={(e) => {
                            const newItems = { ...creditNoteItems };
                            if (e.target.checked) {
                              newItems[item.id.toString()] = available;
                            } else {
                              delete newItems[item.id.toString()];
                            }
                            setCreditNoteItems(newItems);
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2">
                            <p className="text-xs font-bold truncate">{item.description}</p>
                            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{item.price} {selectedInvoice.currency}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <label className="text-[9px] text-muted-foreground font-bold uppercase">Qty:</label>
                            <input
                              type="number"
                              min="1"
                              max={available}
                              value={creditNoteItems[item.id.toString()] || 0}
                              disabled={!creditNoteItems[item.id.toString()]}
                              onChange={(e) => {
                                const val = Math.min(available, Math.max(0, parseInt(e.target.value) || 0));
                                setCreditNoteItems({ ...creditNoteItems, [item.id.toString()]: val });
                              }}
                              className="w-12 h-6 text-[10px] rounded border bg-white px-1 outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <span className="text-[9px] text-muted-foreground">/ {available} available</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-orange-50/50 p-4 border border-orange-100/50 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-orange-100">
                <span className="text-xs font-bold text-orange-700 uppercase tracking-tight">Credit Summary</span>
                {(() => {
                  let subtotal = 0;
                  if (creditNoteType === 'FULL') {
                    const totalCredited = selectedInvoice?.creditNotes?.reduce((sum: number, c: any) => sum + Number(c.total), 0) || 0;
                    const totalRefunded = selectedInvoice?.refunds?.reduce((sum: number, r: any) => sum + Number(r.amount), 0) || 0;
                    subtotal = Number(selectedInvoice?.total || 0) - totalCredited - totalRefunded;
                  } else if (creditNoteType === 'PARTIAL') {
                    subtotal = Number(creditNoteAmount) || 0;
                  } else if (creditNoteType === 'ITEM') {
                    const itemsToCalc = selectedInvoice?.items?.map((item: any) => ({ ...item, quantity: creditNoteItems[item.id.toString()] || 0 }));
                    subtotal = itemsToCalc?.reduce((acc: number, item: any) => {
                      return acc + (item.quantity * Number(item.price) * (1 + (Number(item.tax) / 100)));
                    }, 0) || 0;
                  }
                  return <span className="text-lg font-black text-orange-700 mono">{subtotal.toFixed(2)} {selectedInvoice?.currency}</span>
                })()}
              </div>
              <ul className="text-[10px] text-orange-600/80 space-y-1.5 px-1">
                <li className="flex items-center gap-2">
                  <Receipt className="h-3 w-3 text-orange-400" />
                  <span>A formal credit note document will be generated and associated with this invoice.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{t('credit_notes.reason', 'Internal Note / Reason')}</label>
              <textarea
                value={creditNoteReason}
                onChange={(e) => setCreditNoteReason(e.target.value)}
                placeholder="Ex: Courtesy discount, incorrect billing..."
                className="w-full rounded-lg border bg-background p-3 text-sm min-h-[80px] outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditNoteModal(false)} disabled={isCreatingCreditNote}>{t('common.cancel')}</Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={isCreatingCreditNote || (creditNoteType === 'ITEM' && Object.keys(creditNoteItems).length === 0)}
              onClick={() => {
                const data: any = { type: creditNoteType, reason: creditNoteReason };
                if (creditNoteType === 'PARTIAL') {
                  data.amount = Number(creditNoteAmount);
                } else if (creditNoteType === 'ITEM') {
                  const items = selectedInvoice?.items
                    ?.map((item: any) => ({ id: item.id.toString(), quantity: creditNoteItems[item.id.toString()] || 0 }))
                    .filter((i: any) => i.quantity > 0);
                  data.items = items;
                }
                handleCreateCreditNote(selectedInvoice.id, data);
              }}
            >
              {isCreatingCreditNote ? 'Creating...' : t('invoices.create_credit_note', 'Create Credit Note')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Confirmation for Cancel */}
      <Dialog open={!!showCancelConfirm} onOpenChange={() => setShowCancelConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {t('common.confirm_action')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground font-medium">
              {t('invoices.confirm_cancel')}
            </p>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCancelConfirm(null)}>{t('common.no')}</Button>
            <Button variant="destructive" className="flex-1" onClick={async () => {
              const id = showCancelConfirm.id || showCancelConfirm;
              await handleCancelInvoice(id);
            }}>
              {t('common.yes_cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Confirmation for Delete */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t('common.confirm_action')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground font-medium">
              {t('common.confirm_delete')}
            </p>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>{t('common.no')}</Button>
            <Button variant="destructive" className="flex-1" onClick={async () => {
              await handleDeleteInvoice(showDeleteConfirm.id);
            }}>
              {t('common.yes_delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRefundModal} onOpenChange={(open) => {
        setShowRefundModal(open);
        if (!open) {
          setSelectedInvoice(null);
          setRefundReason('');
          setRefundItems({});
          setRefundType('FULL');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              {t('invoices.refund_title', { number: selectedInvoice?.number })}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {(() => {
              const totalPaid = selectedInvoice?.payments
                ?.filter((p: any) => !p.isRefund)
                ?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
              const totalAlreadyRefunded = Math.abs(selectedInvoice?.payments
                ?.filter((p: any) => p.isRefund)
                ?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0);
              const maxRefundable = Math.max(0, totalPaid - totalAlreadyRefunded);

              return (
                <>
                  <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-100 rounded-lg mb-4 cursor-pointer hover:bg-purple-100/50 transition-colors" onClick={() => setRefundToCreditBalance(!refundToCreditBalance)}>
                    <div className={cn(
                      "h-5 w-5 rounded border flex items-center justify-center transition-all",
                      refundToCreditBalance ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-purple-200"
                    )}>
                      {refundToCreditBalance && <CheckCircle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-purple-900 leading-tight">Refund to Client Credit Balance</p>
                      <p className="text-[10px] text-purple-700/70 font-medium">Money will be added to client account instead of cash refund.</p>
                    </div>
                  </div>
                  {/* Show toggle if multi-item OR single item with qty > 1 */}
                  {selectedInvoice?.items && (selectedInvoice.items.length > 1 || selectedInvoice.items.some((i: any) => i.quantity > 1)) && (
                    <div className="flex p-1 bg-muted rounded-lg border">
                      <button
                        onClick={() => setRefundType('FULL')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${refundType === 'FULL' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                      >
                        {t('invoices.full_refund')}
                      </button>
                      <button
                        onClick={() => setRefundType('PARTIAL')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${refundType === 'PARTIAL' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground'}`}
                      >
                        {t('invoices.partial_refund')}
                      </button>
                    </div>
                  )}

                  {refundType === 'PARTIAL' && selectedInvoice?.items && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{t('invoices.refund_items_label')}</label>
                      <div className="space-y-2">
                        {selectedInvoice.items.map((item: any) => {
                          const alreadyRefunded = selectedInvoice.refunds?.reduce((sum: number, r: any) => {
                            const refundItem = r.items?.find((ri: any) => ri.productId === item.productId && ri.description === item.description);
                            return sum + (refundItem?.quantity || 0);
                          }, 0) || 0;
                          const available = Math.max(0, item.quantity - alreadyRefunded);

                          if (available === 0) return null;

                          const unitPriceWithTax = calculateLineNetPrice(item) * (1 + (Number(item.tax) / 100));

                          return (
                            <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                              <input
                                type="checkbox"
                                checked={!!refundItems[item.id.toString()]}
                                onChange={(e) => {
                                  const newItems = { ...refundItems };
                                  if (e.target.checked) {
                                    // Calculate remaining budget for this item
                                    const otherItemsValue = selectedInvoice.items
                                      .filter((i: any) => i.id.toString() !== item.id.toString())
                                      .reduce((acc: number, i: any) => {
                                        const qty = refundItems[i.id.toString()] || 0;
                                        const net = calculateLineNetPrice(i);
                                        return acc + (qty * net * (1 + (Number(i.tax) / 100)));
                                      }, 0);
                                    const remaining = maxRefundable - otherItemsValue;
                                    const maxPossibleQty = unitPriceWithTax > 0 ? Math.floor(remaining / unitPriceWithTax) : available;

                                    newItems[item.id.toString()] = Math.min(available, Math.max(0, maxPossibleQty));
                                  } else {
                                    delete newItems[item.id.toString()];
                                  }
                                  setRefundItems(newItems);
                                }}
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between gap-2 items-start">
                                  <div>
                                    <p className="text-xs font-bold truncate">{item.description}</p>
                                    {Number(item.discount || 0) > 0 && (
                                      <p className="text-[9px] text-red-600 font-bold uppercase mt-0.5 tracking-wider">
                                        {t('invoices.discount')}: {item.discountType === 'AMOUNT' || item.discountType === 'MAD' ? `${Number(item.discount).toFixed(2)} ${selectedInvoice.currency}` : `${item.discount}%`}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] font-mono text-muted-foreground line-through leading-none">{Number(item.price).toFixed(2)}</span>
                                      <span className="text-[10px] font-black text-purple-700 leading-tight">{calculateLineNetPrice(item).toFixed(2)} {selectedInvoice.currency}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <label className="text-[9px] text-muted-foreground font-bold uppercase">{t('invoices.qty_label')}</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={available}
                                    value={refundItems[item.id.toString()] || 0}
                                    disabled={!refundItems[item.id.toString()]}
                                    onChange={(e) => {
                                      const requestedQty = parseInt(e.target.value) || 0;

                                      // Calculate remaining budget for this item
                                      const otherItemsValue = selectedInvoice.items
                                        .filter((i: any) => i.id.toString() !== item.id.toString())
                                        .reduce((acc: number, i: any) => {
                                          const qty = refundItems[i.id.toString()] || 0;
                                          const net = calculateLineNetPrice(i);
                                          return acc + (qty * net * (1 + (Number(i.tax) / 100)));
                                        }, 0);
                                      const remaining = maxRefundable - otherItemsValue;
                                      const maxPossibleQty = unitPriceWithTax > 0 ? Math.floor(remaining / unitPriceWithTax) : available;

                                      const val = Math.min(available, Math.max(0, maxPossibleQty), Math.max(0, requestedQty));
                                      setRefundItems({ ...refundItems, [item.id.toString()]: val });
                                    }}
                                    className="w-12 h-6 text-[10px] rounded border bg-white px-1 outline-none focus:ring-1 focus:ring-purple-500 font-bold"
                                  />
                                  <span className="text-[9px] text-muted-foreground">/ {available} {t('invoices.available_label')} {alreadyRefunded > 0 && <span className="text-orange-600 font-bold">({alreadyRefunded} {t('invoices.already_refunded_label')})</span>}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-purple-50/50 p-4 border border-purple-100/50 space-y-3">
                    {(() => {
                      const isPartiallyPaid = selectedInvoice?.status === 'PARTIALLY_PAID' || (selectedInvoice?.status === 'PARTIALLY_REFUNDED' && totalPaid < Number(selectedInvoice?.total));

                      // Calculate gross item value
                      const itemsToCalc = refundType === 'FULL'
                        ? selectedInvoice?.items?.map((item: any) => {
                          const alreadyRefunded = selectedInvoice.refunds?.reduce((sum: number, r: any) => {
                            const refundItem = r.items?.find((ri: any) => ri.productId === item.productId && ri.description === item.description);
                            return sum + (refundItem?.quantity || 0);
                          }, 0) || 0;
                          return { ...item, quantity: Math.max(0, item.quantity - alreadyRefunded) };
                        })
                        : selectedInvoice?.items?.map((item: any) => ({ ...item, quantity: refundItems[item.id.toString()] || 0 }));

                      const grossRefund = itemsToCalc?.reduce((acc: number, item: any) => {
                        const netPrice = calculateLineNetPrice(item);
                        return acc + (item.quantity * netPrice * (1 + (Number(item.tax) / 100)));
                      }, 0) || 0;

                      // Actual cash refund is capped by paid balance
                      const actualCashRefund = Math.min(grossRefund, maxRefundable);

                      return (
                        <>
                          {isPartiallyPaid && (
                            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-[10px] text-amber-700 font-bold space-y-0.5">
                              <p className="uppercase tracking-wider">⚠ Partially Paid Invoice</p>
                              <p className="font-normal">Only the paid amount can be refunded. The remaining unpaid balance will be cancelled.</p>
                              <p className="mt-1">Paid: <strong>{totalPaid.toFixed(2)} {selectedInvoice?.currency}</strong> · Already refunded: <strong>{totalAlreadyRefunded.toFixed(2)}</strong> · Max refundable: <strong>{maxRefundable.toFixed(2)}</strong></p>
                            </div>
                          )}
                          <div className="flex justify-between items-center pb-2 border-b border-purple-100">
                            <span className="text-xs font-bold text-purple-700 uppercase tracking-tight">{t('invoices.refund_summary')}</span>
                            <div className="text-right">
                              {grossRefund > maxRefundable && (
                                <p className="text-[9px] text-muted-foreground line-through leading-none">{grossRefund.toFixed(2)} {selectedInvoice?.currency}</p>
                              )}
                              <span className="text-lg font-black text-purple-700 mono">{actualCashRefund.toFixed(2)} {selectedInvoice?.currency}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                    <ul className="text-[10px] text-purple-600/80 space-y-1.5 px-1">
                      <li className="flex items-center gap-2 font-bold text-purple-700">
                        <RefreshCw className="h-3 w-3" />
                        <span>Dest: {refundToCreditBalance ? 'CLIENT CREDIT BALANCE' : 'CASH REFUND'}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 text-purple-400" />
                        <span>{t('invoices.refund_status_will_update')} <strong>{refundType === 'FULL' || (selectedInvoice?.items?.length === 1) ? 'REFUNDED' : 'PARTIALLY_REFUNDED'}</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-purple-400" />
                        <span>{refundType === 'FULL' || (selectedInvoice?.items?.length === 1) ? t('invoices.all_items') : Object.values(refundItems).reduce((a, b) => a + Number(b), 0)} {t('invoices.refund_inventory_restore')}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-purple-400" />
                        <span>{t('invoices.refund_revenue_adj')}</span>
                      </li>
                    </ul>
                  </div>
                </>
              );
            })()}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{t('refunds.reason')}</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder={t('invoices.reason_placeholder')}
                className="w-full rounded-lg border bg-background p-3 text-sm min-h-[80px] outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundModal(false)} disabled={isRefunding}>{t('common.cancel')}</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isRefunding || (refundType === 'PARTIAL' && Object.keys(refundItems).length === 0)}
              onClick={() => {
                const itemsToRefund = selectedInvoice.items
                  .map((item: any) => {
                    const alreadyRefunded = selectedInvoice.refunds?.reduce((sum: number, r: any) => {
                      const refundItem = r.items?.find((ri: any) => ri.productId === item.productId && ri.description === item.description);
                      return sum + (refundItem?.quantity || 0);
                    }, 0) || 0;
                    const available = Math.max(0, item.quantity - alreadyRefunded);

                    const qtyToRefund = refundType === 'FULL' ? available : (refundItems[item.id.toString()] || 0);
                    return { id: item.id.toString(), quantity: qtyToRefund };
                  })
                  .filter((i: any) => i.quantity > 0);

                handleRefund(selectedInvoice.id, itemsToRefund);
              }}
            >
              {isRefunding ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {refundType === 'FULL' ? t('invoices.confirm_full_refund') : t('invoices.process_partial_refund')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl rounded-xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto dark:bg-card">
            <div className="flex items-center justify-between mb-8 pb-4 border-b">
              <h2 className="text-2xl font-black tracking-tight text-primary uppercase">
                {isEditing ? t('invoices.edit_invoice') : t('invoices.new_invoice')}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingInvoice(null); reset(); }} className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-all" type="button">
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
                    render={({ field }) => (
                      <Combobox
                        value={field.value}
                        onValueChange={(val) => field.onChange(val)}
                      >
                        <ComboboxTrigger className="w-full flex h-10 items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-muted/30">
                          <ComboboxValue placeholder={t('invoices.select_client')}>
                            {clients.find(c => c.id === field.value)?.name}
                          </ComboboxValue>
                        </ComboboxTrigger>
                        <ComboboxContent side="bottom" align="start">
                          <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <ComboboxInput
                              placeholder={t('invoices.search_placeholder')}
                              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <ComboboxEmpty>{t('common.no_results')}</ComboboxEmpty>
                          <ComboboxList>
                            {clients.map((client) => (
                              <ComboboxItem key={client.id} value={client.id} label={client.name}>
                                {client.name}
                              </ComboboxItem>
                            ))}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                    )}
                  />
                  {errors.clientId && (
                    <p className="mt-1 text-[10px] text-destructive font-bold uppercase">{errors.clientId.message}</p>
                  )}
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
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.due_date')}</label>
                  <Controller
                    name="dueDate"
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
                  {errors.dueDate && <p className="mt-1 text-[10px] text-destructive font-bold uppercase">{errors.dueDate.message}</p>}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.items')}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: '', description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' })}
                    className="text-xs h-8"
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" /> {t('invoices.add_item')}
                  </Button>
                </div>

                <div className="hidden md:grid grid-cols-12 gap-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  <div className="col-span-5">{t('invoices.product')}</div>
                  <div className="col-span-1 text-center">{t('invoices.qty')}</div>
                  <div className="col-span-2">{t('invoices.price')}</div>
                  <div className="col-span-1">{t('invoices.tax')} %</div>
                  <div className="col-span-3">{t('invoices.discount')}</div>
                </div>

                <div className="space-y-4">
                  {fields.map((field, i) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end group bg-muted/10 p-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/20 transition-all">
                      <div className="md:col-span-5 space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.product')}</label>
                        <Controller
                          name={`items.${i}.productId`}
                          control={control}
                          render={({ field }) => (
                            <Combobox
                              value={field.value}
                              onValueChange={(val) => {
                                field.onChange(val);
                                const selectedProduct = products.find(p => p.id === val);
                                if (selectedProduct) {
                                  setValue(`items.${i}.description`, selectedProduct.name);
                                  setValue(`items.${i}.price`, Number(selectedProduct.priceHT));
                                  setValue(`items.${i}.tax`, Number(selectedProduct.tva));
                                }
                              }}
                            >
                              <ComboboxTrigger className={cn(
                                "w-full flex h-9 items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-muted/30",
                                errors.items?.[i]?.productId && "border-destructive focus:ring-destructive"
                              )}>
                                <ComboboxValue placeholder={t('invoices.select_product')}>
                                  {products.find(p => p.id === field.value)?.name}
                                </ComboboxValue>
                              </ComboboxTrigger>
                              <ComboboxContent side="bottom" align="start">
                                <div className="flex items-center border-b px-3">
                                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                  <ComboboxInput
                                    placeholder={t('invoices.search_placeholder')}
                                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                </div>
                                <ComboboxEmpty>{t('common.no_results')}</ComboboxEmpty>
                                <ComboboxList>
                                  {products.map((product) => (
                                    <ComboboxItem key={product.id} value={product.id} label={product.name}>
                                      {product.name}
                                    </ComboboxItem>
                                  ))}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          )}
                        />
                        {errors.items?.[i]?.productId && (
                          <p className="mt-1 text-[10px] text-destructive font-bold uppercase">{errors.items[i]?.productId?.message}</p>
                        )}
                      </div>
                      <div className="md:col-span-1 text-center">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.qty')}</label>
                        {(() => {
                          const prodId = watchedItems?.[i]?.productId;
                          const prod = products.find(p => p.id === prodId);
                          if (prod?.stock !== undefined && prod.stock !== null) {
                            return (
                              <span className={cn(
                                "text-[10px] font-bold mb-1.5 block leading-none",
                                prod.stock > 0 ? "text-emerald-600" : "text-destructive"
                              )}>
                                Stock: {prod.stock}
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <input
                          type="number"
                          {...register(`items.${i}.quantity`, {
                            valueAsNumber: true,
                            required: true,
                            validate: (val) => {
                              const prodId = watchedItems?.[i]?.productId;
                              const prod = products.find(p => p.id === prodId);
                              if (prod && prod.stock !== null && prod.stock !== undefined && val > prod.stock) {
                                return `Max ${prod.stock}`;
                              }
                              return true;
                            },
                            onChange: (e) => {
                              const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                              const prodId = watchedItems?.[i]?.productId;
                              const prod = products.find(p => p.id === prodId);
                              const maxStock = prod?.stock !== undefined && prod.stock !== null ? Number(prod.stock) : 999999;

                              if (typeof val === 'number') {
                                if (val > maxStock) {
                                  e.target.value = maxStock.toString();
                                  setValue(`items.${i}.quantity`, maxStock, { shouldValidate: true });
                                } else if (val < 1) {
                                  e.target.value = '1';
                                  setValue(`items.${i}.quantity`, 1, { shouldValidate: true });
                                } else {
                                  setValue(`items.${i}.quantity`, val, { shouldValidate: true });
                                }
                              }
                            }
                          })}
                          min={1}
                          placeholder={t('invoices.qty')}
                          className={cn(
                            "w-full rounded-lg border bg-background px-2 h-9 text-sm focus:ring-1 focus:ring-ring text-center",
                            errors.items?.[i]?.quantity && "border-destructive focus:ring-destructive"
                          )}
                        />
                        {errors.items?.[i]?.quantity && (
                          <span className="text-[9px] text-destructive mt-0.5 block font-bold leading-tight">
                            {errors.items[i]?.quantity?.message}
                          </span>
                        )}
                      </div>
                      <div className="md:col-span-2 space-y-1.5">

                        <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.price')}</label>
                        <input
                          {...register(`items.${i}.price`)}
                          type="number"
                          step="0.01"
                          className="w-full rounded-lg border bg-background px-2 h-9 text-sm focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.tax')} %</label>
                        <input
                          {...register(`items.${i}.tax`)}
                          type="number"
                          className="w-full rounded-lg border bg-muted px-2 h-9 text-xs font-mono"
                          readOnly
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block md:hidden">{t('invoices.discount')}</label>
                        <div className="flex h-9 shadow-sm">
                          <input
                            {...register(`items.${i}.discount`)}
                            type="number"
                            step="0.01"
                            className="w-full rounded-l-lg border bg-background px-2 py-2 text-sm focus:ring-1 focus:ring-ring z-10"
                          />
                          <Controller
                            name={`items.${i}.discountType`}
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
                        <button
                          type="button"
                          onClick={() => remove(i)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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

              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg text-xs text-primary/80 font-semibold shadow-inner">
                <input type="checkbox" {...register('remindersEnabled')} id="reminders" className="h-4 w-4 rounded border-primary/20 text-primary transition-all cursor-pointer" />
                <label htmlFor="reminders" className="cursor-pointer select-none">{t('invoices.enable_reminders', t('invoices.reminders_label'))}</label>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" className="flex-1 h-11 text-xs font-bold uppercase tracking-wider" onClick={() => { setShowForm(false); setIsEditing(false); setEditingInvoice(null); reset(); }} disabled={isSubmitting}>{t('invoices.cancel')}</Button>
                <Button type="submit" className="flex-1 h-11 text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all" disabled={isSubmitting}>
                  {isSubmitting ? (isEditing ? t('common.saving', 'Saving...') : t('common.creating', 'Creating...')) : (isEditing ? t('common.save', 'Save') : t('invoices.create_invoice'))}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => { setShowPaymentModal(open); if (!open) setSelectedInvoice(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('payments.register_title', { number: selectedInvoice?.number })}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            {(() => {
              const totalReturnedValue = selectedInvoice?.refunds?.reduce((sum: number, r: any) => {
                let metadata = r.metadata;
                if (typeof metadata === 'string') {
                  try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
                }
                return sum + parseFloat(metadata?.originalRequestedValue?.toString() || '0');
              }, 0) || 0;
              const totalCredited = selectedInvoice?.creditNotes?.filter((cn: any) => cn.status === 'APPLIED' || cn.status === 'REFUNDED').reduce((sum: number, cn: any) => sum + parseFloat(cn.total?.toString() || '0'), 0) || 0;
              const effectiveTotal = Math.max(0, Number(selectedInvoice?.total) - totalReturnedValue - totalCredited);
              const totalNetPaid = selectedInvoice?.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
              const remaining = Math.max(0, effectiveTotal - totalNetPaid);

              if (remaining <= 0.01) return null;

              return (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg mb-2">
                  <p className="text-amber-800 font-bold uppercase text-[10px] mb-1">{t('payments.balance_due')}</p>
                  <p className="text-lg font-black text-amber-900 mono">{remaining.toFixed(2)} {selectedInvoice?.currency}</p>
                </div>
              );
            })()}
            <div>
              <label className="mb-1 block font-medium">{t('payments.amount')}</label>
              {(function () {
                const totalReturnedValue = selectedInvoice?.refunds?.reduce((sum: number, r: any) => {
                  let metadata = r.metadata;
                  if (typeof metadata === 'string') {
                    try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
                  }
                  return sum + parseFloat(metadata?.originalRequestedValue?.toString() || '0');
                }, 0) || 0;
                const totalCredited = selectedInvoice?.creditNotes?.filter((cn: any) => cn.status === 'APPLIED' || cn.status === 'REFUNDED').reduce((sum: number, cn: any) => sum + parseFloat(cn.total?.toString() || '0'), 0) || 0;
                const effectiveTotal = Math.max(0, Number(selectedInvoice?.total) - totalReturnedValue - totalCredited);
                const totalNetPaid = selectedInvoice?.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
                const maxVal = Math.max(0, effectiveTotal - totalNetPaid);

                return (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={maxVal > 0 ? maxVal : undefined}
                      value={paymentData.amount || ''}
                      onChange={e => {
                        let val = Number(e.target.value);
                        if (val > maxVal) val = maxVal;
                        setPaymentData({ ...paymentData, amount: val });
                      }}
                      className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
                    />
                    {Number(paymentData.amount) >= maxVal - 0.01 && maxVal > 0 && (
                      <p className="text-emerald-600 text-[10px] mt-1">{t('payments.max_reached', { amount: maxVal.toFixed(2) })}</p>
                    )}
                  </>
                );
              })()}
            </div>
            <div>
              <label className="mb-1 block font-medium">{t('payments.method')}</label>
              <Combobox
                value={paymentData.method}
                onValueChange={(val) => setPaymentData({ ...paymentData, method: val })}
              >
                <ComboboxTrigger className="w-full flex h-10 items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <ComboboxValue placeholder={t('payments.method')}>
                    {paymentData.method === 'BANK_TRANSFER' ? t('payments.methods.bank_transfer') :
                      paymentData.method === 'CASH' ? t('payments.methods.cash') :
                        paymentData.method === 'CHEQUE' ? t('payments.methods.cheque') :
                          paymentData.method === 'OTHER' ? t('payments.methods.other') : ''}
                  </ComboboxValue>
                </ComboboxTrigger>
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxItem value="BANK_TRANSFER">{t('payments.methods.bank_transfer')}</ComboboxItem>
                    <ComboboxItem value="CASH">{t('payments.methods.cash')}</ComboboxItem>
                    <ComboboxItem value="CHEQUE">{t('payments.methods.cheque')}</ComboboxItem>
                    <ComboboxItem value="OTHER">{t('payments.methods.other')}</ComboboxItem>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
            <div>
              <label className="mb-1 block font-medium">{t('payments.date')}</label>
              <DatePicker
                date={paymentData.date ? new Date(paymentData.date) : undefined}
                setDate={(date) => setPaymentData({ ...paymentData, date: date?.toISOString().split('T')[0] || '' })}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">{t('payments.note')}</label>
              <textarea value={paymentData.note} onChange={e => setPaymentData({ ...paymentData, note: e.target.value })} rows={2} className="w-full rounded-lg border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)} disabled={isRegisteringPayment}>{t('common.cancel')}</Button>
            <Button onClick={submitPayment} disabled={isRegisteringPayment || !canRecordPayment()}>
              {isRegisteringPayment ? t('common.processing') : t('payments.register_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}

function InvoiceRowActions({ inv, downloadInvoicePDF, handleSendEmail, handleCreateCreditNote, deleteInvoice, isSending, setShowDeleteConfirm, setShowCreditNoteModal, setSelectedInvoice, onEdit }: any) {
  const { buttons } = useSmartButtons(inv);
  const {
    canConvertQuote,
    canDownloadInvoice,
    canDownloadQuote,
    canExportInvoices,
    canSendInvoice,
    canSendQuote,
    canEditInvoice,
    canDeleteInvoice
  } = usePermissions();
  const { t } = useTranslation();
  const isDraft = inv.status === 'DRAFT';

  return (
    <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
      {isDraft && canEditInvoice() && (
        <button
          onClick={() => onEdit(inv)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          title={t('invoices.edit_invoice', 'Edit Invoice')}
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {buttons.sendReminder && canSendInvoice() && (
        <button
          onClick={() => handleSendEmail(inv.id)}
          disabled={isSending}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 transition-colors disabled:opacity-50"
          title="Send Email"
        >
          {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      )}
      {buttons.pdf && canDownloadInvoice() && (
        <button
          onClick={() => downloadInvoicePDF(inv.id.toString(), inv.number)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          title={t('invoices.download_pdf')}
        >
          <Download className="h-4 w-4" />
        </button>
      )}
      {isDraft && canDeleteInvoice() && (
        <button
          onClick={() => setShowDeleteConfirm(inv)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function InvoiceDetailActions({ viewing, setViewing, handleSendEmail, handleCreateCreditNote, handleRegisterPayment, isSendingId, setShowCancelConfirm, setSelectedInvoice, setShowCreditNoteModal, setShowRefundModal }: any) {
  const { buttons, handleAction } = useSmartButtons(viewing);
  const { canSendInvoice, canCreateCreditNote, canRecordPayment, canCancelInvoice, canVoidInvoice, canRefundInvoice } = usePermissions();
  const { t } = useTranslation();
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');

  return (
    <div className="grid grid-cols-2 gap-3">
      {buttons.cancel && canVoidInvoice() && (
        <button
          onClick={() => setShowCancelConfirm(viewing)}
          className="rounded-lg bg-destructive/10 px-2 py-2.5 text-[10px] font-bold text-destructive hover:bg-destructive/20 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <AlertCircle className="h-4 w-4" /> {t('invoices.mark_as_cancelled')}
        </button>
      )}
      {buttons.sendReminder && canSendInvoice() && (
        <button
          onClick={() => handleSendEmail(viewing.id.toString())}
          disabled={isSendingId === viewing.id.toString()}
          className={cn(
            "rounded-lg border px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-[38px]",
            viewing.status === 'PARTIALLY_PAID' && "col-span-2"
          )}
        >
          {isSendingId === viewing.id.toString() ? <><RefreshCw className="h-4 w-4 animate-spin" /> {t('common.sending')}</> : (
            <><Send className="h-4 w-4" /> {viewing.status === 'DRAFT' ? t('common.send_email') : t('common.resend_email')}</>
          )}
        </button>
      )}
      {buttons.addPayment && canRecordPayment() && (
        <button
          onClick={() => handleRegisterPayment(viewing)}
          className="rounded-lg bg-primary px-2 py-2.5 text-[10px] font-bold text-primary-foreground hover:bg-primary/90 transition-all uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm col-span-2"
        >
          <CheckCircle className="h-4 w-4" /> {t('payments.register_button')}
        </button>
      )}
      {buttons.creditNote && viewing.status === 'PAID' && canCreateCreditNote() && (
        <button
          onClick={() => { setSelectedInvoice(viewing); setShowCreditNoteModal(true); }}
          className="rounded-lg border px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-muted transition-colors flex items-center justify-center gap-2 text-orange-600 border-orange-200 h-[38px]"
        >
          <Receipt className="h-4 w-4" /> {t('invoices.create_credit_note')}
        </button>
      )}
      {buttons.refund && canRefundInvoice() && (
        <button
          onClick={() => { setSelectedInvoice(viewing); setShowRefundModal(true); }}
          className="rounded-lg border px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-muted transition-all flex items-center justify-center gap-2 text-purple-600 border-purple-200 h-[38px] col-span-2"
        >
          <RefreshCw className="h-4 w-4" /> Refund Invoice
        </button>
      )}
    </div>
  );
}
