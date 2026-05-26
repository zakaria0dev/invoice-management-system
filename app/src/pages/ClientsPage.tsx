import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { INVOICE_STATUS } from '@/constants/statuses';
import { Client } from '@/types';
import { Search, Plus, Pencil, Trash2, X, Upload, Download, FileSpreadsheet, ChevronDown } from 'lucide-react';
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
} from '@/components/ui/combobox';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/ErrorState';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { toast as sonner } from 'sonner';
import { cn } from '@/lib/utils';

export default function ClientsPage() {
  const { clients, invoices, addClient, updateClient, deleteClient, fetchClients, fetchInvoices, exportClients, importClients, getImportTemplate, isLoading, error } = useAppStore();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canCreateClient, canEditClient, canDeleteClient, canExportClients, canImportClients } = usePermissions();
  const [search, setSearch] = useState('');
  const [filterActivity, setFilterActivity] = useState('all');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = () => {
    fetchClients();
    fetchInvoices();
  };

  useEffect(() => {
    fetchAll();

    const handleNew = () => openNew();
    const handleSave = () => { if (showForm) handleSubmit(onSubmit)(); };

    window.addEventListener('shortcuts:new-invoice' as any, handleNew);
    window.addEventListener('shortcuts:save-form' as any, handleSave);

    return () => {
      window.removeEventListener('shortcuts:new-invoice' as any, handleNew);
      window.removeEventListener('shortcuts:save-form' as any, handleSave);
    };
  }, [fetchClients, fetchInvoices, showForm]);


  const clientSchema = z.object({
    name: z.string().min(1, t('login.password_required')).max(100),
    email: z.string().email(t('login.email_required')).max(255),
    phone: z.string().optional(),
    address: z.string().optional(),
    ice: z.string().optional(),
    autoApplyCredit: z.boolean().default(true),
  });
  type ClientForm = z.infer<typeof clientSchema>;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  });

  if (error) {
    return <ErrorState error={error} onRetry={fetchAll} />;
  }

  const getOutstandingBalance = (clientId: string | number) => {
    const client = clients.find(c => c.id.toString() === clientId.toString());
    const grossOutstanding = (invoices || [])
      .filter(i => i?.clientId?.toString() === clientId?.toString())
      .reduce((sum, inv) => {
        if ([INVOICE_STATUS.DRAFT, INVOICE_STATUS.CANCELLED, INVOICE_STATUS.REFUNDED, INVOICE_STATUS.CREDITED, INVOICE_STATUS.SETTLED_WITH_RETURNS, INVOICE_STATUS.PAID].includes(inv?.status as any)) return sum;
        const totalPaid = inv?.payments?.filter((p: any) => !p.isRefund)?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
        const totalRefunded = Math.abs(inv?.payments?.filter((p: any) => p.isRefund)?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0);
        const returnedValue = Math.abs(inv?.refunds?.reduce((s: number, r: any) => s + Number(r.amount), 0) || 0);
        const effectiveTotal = Number(inv?.total) - returnedValue;
        const netPaid = totalPaid - totalRefunded;
        return sum + Math.max(0, effectiveTotal - netPaid);
      }, 0);
    return Math.max(0, grossOutstanding - Number(client?.creditBalance || 0));
  };

  const filtered = clients.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      (c?.name || '').toLowerCase().includes(term) ||
      (c?.email || '').toLowerCase().includes(term) ||
      (c?.ice || '').toLowerCase().includes(term) ||
      (c?.phone || '').toLowerCase().includes(term);

    const outstanding = getOutstandingBalance(c.id);
    const matchesFilter = filterActivity === 'unpaid' ? outstanding > 0 : true;

    return matchesSearch && matchesFilter;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        await importClients(e.target.files[0]);
        toast({
          title: "Success",
          description: t('clients.import_success'),
        });
      } catch (err) {
        toast({
          title: "Error",
          description: t('clients.import_error'),
          variant: "destructive"
        });
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openNew = () => {
    setEditingClient(null);
    reset({ name: '', email: '', phone: '', address: '', ice: '', autoApplyCredit: true });
    setShowForm(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    reset(client);
    setShowForm(true);
  };

  const handleDeleteWithUndo = (id: string | number, name: string) => {
    const timeout = setTimeout(async () => {
      try {
        await deleteClient(id);
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || `Failed to delete client ${name}`;
        sonner.error(errorMsg);
      }
    }, 5000);

    sonner(`Client ${name} will be deleted in 5s`, {
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timeout);
          sonner.info("Deletion cancelled");
        }
      }
    });
  };

  const onSubmit = async (data: ClientForm) => {
    if (editingClient) {
      await updateClient(editingClient.id, data);
    } else {
      await addClient(data as Omit<Client, 'id' | 'createdAt'>);
    }
    setShowForm(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">{t('clients.title')}</h1>
          <p className="page-description">{t('clients.total_clients', { count: clients.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!canExportClients()}
            onClick={() => exportClients('csv')}
            className={cn(
              "px-3 h-10 border-dashed text-[10px] font-black uppercase tracking-widest",
              !canExportClients() && "opacity-50 cursor-not-allowed"
            )}
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canExportClients()}
            onClick={() => exportClients('excel')}
            className={cn(
              "px-3 h-10 border-dashed text-[10px] font-black uppercase tracking-widest",
              !canExportClients() && "opacity-50 cursor-not-allowed"
            )}
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            Excel
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!canImportClients()}>
              <Button
                variant="outline"
                className={cn(
                  "gap-2 border-dashed h-10",
                  !canImportClients() && "opacity-50 cursor-not-allowed"
                )}
              >
                <Plus className="h-4 w-4" />
                {t('common.import')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportClients('csv')} disabled={!canExportClients()}>
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportClients('excel')} disabled={!canExportClients()}>
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => getImportTemplate()} disabled={!canExportClients()}>
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
          />
        </div>

        {canCreateClient() && (
          <Button
            onClick={openNew}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 shadow-lg shadow-primary/20 text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5 mr-2" /> {t('clients.new_client')}
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 max-w-2xl items-center transition-all">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('clients.search_placeholder') + ' (Name, ICE, Email...)'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
        <div className="w-full sm:w-56">
          <Combobox
            value={filterActivity}
            onValueChange={(val) => setFilterActivity(val)}
          >
            <ComboboxInput placeholder={t('clients.all_clients', 'All Clients')} className="h-10 border-muted" />
            <ComboboxContent>
              <ComboboxList>
                <ComboboxItem value="all">{t('clients.all_clients', 'All Clients')}</ComboboxItem>
                <ComboboxItem value="unpaid">{t('clients.with_unpaid', 'Has Unpaid Invoices')}</ComboboxItem>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('clients.name')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">ICE</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">{t('clients.email')}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">{t('clients.phone')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Outstanding (Total)</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('clients.credit_balance', 'Credit')}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('clients.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-4 hidden lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-muted p-3">
                        <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                      </div>
                      <p className="text-base font-medium">{t('clients.no_clients_found')}</p>
                      <p className="text-sm text-muted-foreground">{t('clients.no_results_description')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const outstanding = getOutstandingBalance(c.id);
                  return (
                    <tr key={c.id} className="table-row-hover border-b last:border-0 cursor-pointer" onClick={() => navigate(`/clients/${c.id}`)}>
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.ice || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.email}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell mono">{c.phone || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-destructive">{outstanding > 0 ? outstanding.toFixed(2) : '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">{Number(c.creditBalance || 0) > 0 ? Number(c.creditBalance).toFixed(2) : '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {canEditClient() && (
                            <button
                              onClick={() => openEdit(c)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {canDeleteClient() && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[10px] font-bold uppercase tracking-widest h-9 px-3 border border-transparent hover:border-border"
                              onClick={() => handleDeleteWithUndo(c.id, c.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {
        showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">{editingClient ? t('clients.edit_client') : t('clients.new_client')}</h2>
                <button onClick={() => setShowForm(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                {(['name', 'ice', 'email', 'phone', 'address'] as const).map((field) => (
                  <div key={field}>
                    <label className="mb-1 block text-sm font-medium">{t(`clients.${field}`, field.charAt(0).toUpperCase() + field.slice(1))}</label>
                    <input
                      {...register(field)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                      aria-label={t(`clients.${field}`, field)}
                    />
                    {errors[field] && <p className="mt-1 text-xs text-destructive">{errors[field]?.message}</p>}
                  </div>
                ))}

                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="autoApplyCredit"
                    {...register('autoApplyCredit')}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="autoApplyCredit" className="text-sm font-medium">
                    {t('clients.auto_apply_credit', 'Auto-apply credit to unpaid invoices')}
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">{t('invoices.cancel')}</button>
                  <button type="submit" className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    {editingClient ? t('invoices.update') : t('invoices.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
}
