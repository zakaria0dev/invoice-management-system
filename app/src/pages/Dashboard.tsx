import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { INVOICE_STATUS } from '@/constants/statuses';
import {
  FileText,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  RefreshCw,
  Trophy,
  PackageCheck,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 backdrop-blur-sm border border-border p-3 rounded-lg shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
        <p className="text-sm font-extrabold text-foreground flex items-center gap-2">
          {Number(payload[0].value).toLocaleString()} <span className="text-[10px] text-muted-foreground font-medium uppercase">{currency}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const {
    invoices,
    clients,
    payments,
    dashboardStats,
    settings,
    fetchInvoices,
    fetchClients,
    fetchDashboardData,
    fetchPayments,
    fetchSettings,
    isLoading,
    error,
  } = useAppStore();
  const { t } = useTranslation();
  const { isAdmin, canViewInvoices, canViewClients, canViewReports, canViewPayments, canAccessSettings } = usePermissions();

  const fetchAll = useCallback(() => {
    if (canViewInvoices()) fetchInvoices();
    if (canViewClients()) fetchClients();
    if (canViewReports()) fetchDashboardData();
    if (canViewPayments()) fetchPayments();
  }, [canViewInvoices, fetchInvoices, canViewClients, fetchClients, canViewReports, fetchDashboardData, canViewPayments, fetchPayments]);

  useEffect(() => {
    fetchAll();
    if (!settings && canAccessSettings()) fetchSettings();
  }, [fetchAll, settings, canAccessSettings, fetchSettings]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center animate-fade-in">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">{t('common.something_went_wrong')}</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Revenue Calculations
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const currency = settings?.currency || 'MAD';

  const revenueChange = dashboardStats?.revenueGrowth || '0';

  // Invoices Calculations
  const pendingInvoices = invoices.filter((i) =>
    i.status === INVOICE_STATUS.SENT ||
    i.status === INVOICE_STATUS.OVERDUE ||
    i.status === INVOICE_STATUS.PARTIALLY_PAID
  );
  const pendingAmount = pendingInvoices.reduce((sum, inv) => {
    const totalPaid = inv.payments?.filter((p: any) => !p.isRefund)?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
    const totalRefunded = Math.abs(inv.payments?.filter((p: any) => p.isRefund)?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0);
    const returnedValue = Math.abs(inv.refunds?.reduce((s: number, r: any) => s + Number(r.amount), 0) || 0);
    const effectiveTotal = Number(inv.total) - returnedValue;
    const netPaid = totalPaid - totalRefunded;
    return sum + Math.max(0, effectiveTotal - netPaid);
  }, 0);

  const invoicesThisMonth = invoices.filter(i => new Date(i.date) >= startOfThisMonth).length;
  const overdueCount = invoices.filter((i) => i.status === INVOICE_STATUS.OVERDUE).length;

  // Clients Calculations
  const newClientsThisMonth = clients.filter(c => c.createdAt && new Date(c.createdAt) >= startOfThisMonth).length;

  const metrics = [
    {
      label: t('dashboard.total_revenue'),
      value: `${(dashboardStats?.totalRevenue || 0).toLocaleString()} ${currency}`,
      change: `${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}%`,
      up: Number(revenueChange) >= 0,
      icon: DollarSign,
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      label: t('dashboard.pending_amount'),
      value: `${(dashboardStats?.pendingAmount || 0).toLocaleString()} ${currency}`,
      change: `${pendingInvoices.length} ${t('common.invoices').toLowerCase()}`,
      up: pendingInvoices.length === 0,
      icon: Clock,
      iconBg: 'bg-warning/10 text-warning',
    },
    {
      label: t('dashboard.total_invoices'),
      value: dashboardStats?.totalInvoices || 0,
      change: `+${invoicesThisMonth} ${t('dashboard.this_month')}`,
      up: true,
      icon: FileText,
      iconBg: 'bg-indigo-500/10 text-indigo-500',
    },
    {
      label: t('dashboard.active_clients'),
      value: dashboardStats?.totalClients || 0,
      change: `+${newClientsThisMonth} ${t('dashboard.new')}`,
      up: true,
      icon: Users,
      iconBg: 'bg-primary/10 text-primary',
    },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      {/* Header with Glassmorphism Effect */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t('common.dashboard')}</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">{t('dashboard.overview_description')}</p>
        </div>

        {isAdmin() && (
          <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2 rounded-xl border border-border/40 backdrop-blur-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
              {t('dashboard.export_shortcuts')}
            </span>
            <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block"></div>
            <button
              onClick={() => useAppStore.getState().exportInvoices('excel')}
              className="inline-flex items-center gap-2 rounded-lg bg-card border border-border/50 px-4 py-2 text-sm font-semibold hover:bg-muted hover:border-primary/20 transition-all duration-200 shadow-sm active:scale-95"
            >
              <FileText className="h-4 w-4 text-primary" />
              <span>{t('common.invoices')}</span>
            </button>
            <button
              onClick={() => useAppStore.getState().exportClients('excel')}
              className="inline-flex items-center gap-2 rounded-lg bg-card border border-border/50 px-4 py-2 text-sm font-semibold hover:bg-muted hover:border-primary/20 transition-all duration-200 shadow-sm active:scale-95"
            >
              <Users className="h-4 w-4 text-primary" />
              <span>{t('common.clients')}</span>
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="metric-card space-y-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="metric-card lg:col-span-2 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-80 w-full rounded-xl" />
            </div>
            <div className="metric-card space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="group metric-card !p-0 overflow-hidden relative border-border/50 hover:border-primary/30">
                {/* Decorative background element */}
                <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-[0.03] group-hover:scale-125 transition-transform duration-500 ${m.iconBg}`}></div>

                <div className="p-6 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`rounded-xl p-3 shadow-sm ${m.iconBg}`}>
                      <m.icon className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${m.up ? 'bg-success/5 text-success border-success/20' : 'bg-warning/5 text-warning border-warning/20'
                        }`}>
                        {m.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {m.change}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground tracking-tight">{m.label}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <p className="text-3xl font-extrabold tracking-tight text-foreground">{m.value}</p>
                    </div>
                  </div>
                </div>

                {/* Accent bar at bottom */}
                <div className={`absolute bottom-0 left-0 h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${m.iconBg.split(' ')[0]}`}></div>
              </div>
            ))}
          </div>

          {/* Chart + Recent */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="metric-card lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <ArrowUpRight className="h-5 w-5 text-[#10d771]" />
                    <ArrowDownRight className="h-5 w-5 text-[#054b4d]" />
                  </div>
                  <h2 className="text-base font-semibold">{t('dashboard.cash_flow')}</h2>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#10d771] font-bold">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>{Number(revenueChange) >= 0 ? '+' : ''}{revenueChange}% {t('dashboard.vs_last_period')}</span>
                </div>
              </div>
              <div className="h-80 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardStats?.cashFlow || []} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={true} horizontal={true} opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      width={65}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k ${currency}` : `${v} ${currency}`}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
                    <Bar dataKey="income" stackId="a" fill="#054b4d" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="expense" stackId="a" fill="#10d771" radius={[4, 4, 4, 4]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 pt-4 border-t border-border/40 flex justify-between items-center text-[10px]">
                <p className="text-muted-foreground italic">{t('dashboard.source')}</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#054b4d] shadow-[0_0_8px_hsl(var(--primary)/0.4)]"></div>
                    <span className="font-medium">{t('dashboard.income')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#10d771]"></div>
                    <span className="text-muted-foreground">{t('dashboard.expense')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="metric-card">
              <h2 className="mb-4 text-base font-semibold">{t('dashboard.recent_invoices')}</h2>
              <div className="space-y-3">
                {invoices.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">{t('invoices.no_invoices_found')}</div>
                ) : (
                  invoices.slice(0, 5).map((inv, index) => (
                    <div key={inv.id || `invoice-${index}`} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.client?.name || 'Unknown'}</p>
                        <p className="mono text-xs text-muted-foreground">{inv.number}</p>
                      </div>
                      <div className="text-right">
                        <p className="mono text-sm font-semibold">{inv.total.toLocaleString()} {currency}</p>
                        <span className={`status-badge status-${inv.status.toLowerCase().replace(/_/g, '-')}`}>{t(`status.${inv.status.toLowerCase()}`)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Overdue Alert */}
          {overdueCount > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">
                ⚠️ {t('dashboard.overdue_alert', { count: overdueCount })}
              </p>
            </div>
          )}

          {/* Top Insights */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Clients */}
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Trophy className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold">{t('dashboard.top_clients')}</h2>
              </div>
              <div className="space-y-4">
                {dashboardStats?.topClients?.map((client: any, i: number) => (
                  <div key={client.clientId || `client-${i}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                      <p className="text-sm font-medium">{client.name}</p>
                    </div>
                    <p className="mono text-sm font-semibold">{client._sum.total.toLocaleString()} {currency}</p>
                  </div>
                ))}
                {(!dashboardStats?.topClients || dashboardStats.topClients.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.no_data')}</p>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="metric-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold">{t('dashboard.top_products')}</h2>
              </div>
              <div className="space-y-4">
                {dashboardStats?.topProducts?.map((product: any, i: number) => (
                  <div key={product.productId || `product-${i}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                      <p className="text-sm font-medium">{product.name}</p>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">{product._count._all} {t('dashboard.sales_count')}</p>
                  </div>
                ))}
                {(!dashboardStats?.topProducts || dashboardStats.topProducts.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('dashboard.no_data')}</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
