import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    History,
    Search,
    User as UserIcon,
    Activity,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Filter,
    Eye,
    Info,
    RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import api from '@/lib/api';
import { AuditLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const ENTITY_TYPES = [
    { value: 'all', label: 'All Entities' },
    { value: 'INVOICE', label: 'Invoices' },
    { value: 'QUOTE', label: 'Quotes' },
    { value: 'PRODUCT', label: 'Products' },
    { value: 'CLIENT', label: 'Clients' },
    { value: 'USER', label: 'Users' },
    { value: 'SYSTEM', label: 'System' }
];

const ACTIONS_MAP: Record<string, { value: string, label: string }[]> = {
    all: [
        { value: 'all', label: 'All Actions' }
    ],
    INVOICE: [
        { value: 'all', label: 'All Invoice Actions' },
        { value: 'CREATE_INVOICE', label: 'Create' },
        { value: 'UPDATE_INVOICE', label: 'Update' },
        { value: 'SENT_INVOICE', label: 'Sent' },
        { value: 'DELETE_INVOICE', label: 'Delete' },
        { value: 'REFUND_INVOICE', label: 'Refund' },
    ],
    QUOTE: [
        { value: 'all', label: 'All Quote Actions' },
        { value: 'CREATE_QUOTE', label: 'Create' },
        { value: 'UPDATE_QUOTE', label: 'Update' },
        { value: 'SENT_QUOTE', label: 'Sent' },
        { value: 'DELETE_QUOTE', label: 'Delete' },
        { value: 'CONVERT_QUOTE_TO_INVOICE', label: 'Convert' },
    ],
    PRODUCT: [
        { value: 'all', label: 'All Product Actions' },
        { value: 'CREATE_PRODUCT', label: 'Create' },
        { value: 'UPDATE_PRODUCT', label: 'Update' },
        { value: 'DELETE_PRODUCT', label: 'Delete' },
        { value: 'STOCK_ADJUST', label: 'Stock Adjust' },
    ],
    CLIENT: [
        { value: 'all', label: 'All Client Actions' },
        { value: 'CREATE_CLIENT', label: 'Create' },
        { value: 'UPDATE_CLIENT', label: 'Update' },
        { value: 'DELETE_CLIENT', label: 'Delete' },
    ],
    USER: [
        { value: 'all', label: 'All User Actions' },
        { value: 'LOGIN_SUCCESS', label: 'Login Success' },
        { value: 'LOGIN_FAILURE', label: 'Login Failure' },
    ],
    SYSTEM: [
        { value: 'all', label: 'All System Actions' }
    ]
};

export default function ActionLogsPage() {
    const { t, i18n } = useTranslation();
    const [limit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [entityFilter, setEntityFilter] = useState<string>('all');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs', limit, offset, entityFilter, actionFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
            });
            if (entityFilter !== 'all') {
                params.append('entityType', entityFilter);
            }
            if (actionFilter !== 'all') {
                params.append('action', actionFilter);
            }

            const response = await api.get(`/audit-logs?${params.toString()}`);
            return response.data;
        },
    });

    const logs: AuditLog[] = data?.data || [];
    const total = data?.pagination?.total || 0;
    const dateLocale = i18n.language === 'fr' ? fr : enUS;

    const availableActions = useMemo(() => {
        return ACTIONS_MAP[entityFilter] || ACTIONS_MAP.all;
    }, [entityFilter]);

    const handleEntityChange = (val: string) => {
        setEntityFilter(val);
        setActionFilter('all'); // Reset action filter when entity changes
        setOffset(0);
    };

    const handleResetFilters = () => {
        setEntityFilter('all');
        setActionFilter('all');
        setSearchQuery('');
        setOffset(0);
    };

    const handleNextPage = () => {
        if (offset + limit < total) {
            setOffset(prev => prev + limit);
        }
    };

    const handlePrevPage = () => {
        setOffset(prev => Math.max(0, prev - limit));
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes('CREATE')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200';
        if (action.includes('DELETE')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200';
        if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
        if (action.includes('REFUND')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200';
        if (action.includes('SENT')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200';
        if (action.includes('LOGIN_SUCCESS')) return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200';
        if (action.includes('LOGIN_FAILURE')) return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200';
    };

    const formatActionName = (action: string) => {
        return action.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    const formatUserRole = (role: any) => {
        if (!role) return 'CORE';
        if (typeof role === 'object' && role.name) return role.name;
        return role.toString();
    };

    const formatDetailsSummary = (details: any) => {
        if (!details) return '---';
        if (typeof details === 'string') return details;
        const keys = Object.keys(details);
        if (keys.length === 0) return '---';

        const interestingKeys = ['number', 'amount', 'total', 'name', 'email', 'status'];
        const displayParts = [];

        for (const key of interestingKeys) {
            if (details[key] !== undefined && details[key] !== null) {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                displayParts.push(`${label}: ${details[key]}`);
            }
        }

        if (displayParts.length > 0) return displayParts.join(' | ');
        return keys.slice(0, 2).map(k => `${k}: ${details[k]}`).join(' | ') + (keys.length > 2 ? ' ...' : '');
    };

    const getEntityDisplayLabel = (log: AuditLog) => {
        // If it has an actual document number in details, that is the most accurate source of truth
        if (log.details && typeof log.details === 'object' && log.details.number) {
            return log.details.number.toString();
        }

        // Fallback to formatting the entity ID
        if (log.entityType && log.entityId) {
            const id = typeof log.entityId === 'string' || typeof log.entityId === 'number' || typeof log.entityId === 'bigint'
                ? log.entityId.toString().padStart(4, '0')
                : '';

            switch (log.entityType.toUpperCase()) {
                case 'QUOTE': return `QT-${id}`;
                case 'INVOICE': return `INV-${id}`;
                case 'CLIENT': return `CLI-${id}`;
                case 'PRODUCT': return `PRD-${id}`;
                case 'PAYMENT': return `PAY-${id}`;
                case 'REFUND': return `RF-${id}`;
                case 'CREDIT_NOTE': return `CN-${id}`;
                default: return `${log.entityType} #${id}`;
            }
        }

        return log.entityLabel || log.entityType || 'SYSTEM';
    };

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();

        const detailsStr = log.details ? JSON.stringify(log.details) : '';

        return (
            (log.user?.name || '').toLowerCase().includes(searchLower) ||
            (log.action || '').toLowerCase().includes(searchLower) ||
            (log.entityType || '').toLowerCase().includes(searchLower) ||
            detailsStr.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl shadow-inner">
                        <History className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-foreground uppercase italic underline-offset-8 decoration-primary/30 underline decoration-4">
                            {t('common.action_logs')}
                        </h1>
                        <p className="text-muted-foreground mt-0.5 text-xs font-medium tracking-tight">
                            {t('common.action_logs_description', 'Track every move made in the system')}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9 px-3 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all rounded-lg group"
                >
                    <RotateCcw className="h-3.5 w-3.5 group-hover:rotate-[-45deg] transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-wider">Reset Filters</span>
                </Button>
            </div>

            <Card className="border-none shadow-xl shadow-primary/5 overflow-hidden ring-1 ring-border">
                <CardHeader className="pb-4 pt-4 border-b border-border bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="relative w-full">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-1 block">Quick Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                                <Input
                                    placeholder="Search everything..."
                                    className="pl-9 h-10 bg-background border-border shadow-none focus-visible:ring-primary/20 focus-visible:ring-offset-0 text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Entity Type</label>
                            <Select value={entityFilter} onValueChange={handleEntityChange}>
                                <SelectTrigger className="h-10 border-border bg-background shadow-none text-xs font-semibold focus:ring-primary/20">
                                    <SelectValue placeholder="Select Entity" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ENTITY_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value} className="text-xs font-medium py-2">
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-right mr-1">Action Filter</label>
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger className="h-10 border-border bg-background shadow-none text-xs font-semibold focus:ring-primary/20">
                                    <SelectValue placeholder="Select Action" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableActions.map(action => (
                                        <SelectItem key={action.value} value={action.value} className="text-xs font-medium py-2">
                                            {action.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/10 border-b border-border">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="w-[140px] font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80 pl-6 h-11">{t('common.date')}</TableHead>
                                <TableHead className="w-[180px] font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80 h-11">{t('common.user')}</TableHead>
                                <TableHead className="w-[180px] font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80 h-11 text-center">{t('common.action')}</TableHead>
                                <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80 h-11 text-center">{t('common.entity')}</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80 h-11">{t('common.details')}</TableHead>
                                <TableHead className="w-[80px] h-11"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <TableRow key={i} className="border-b border-border">
                                        <TableCell colSpan={6} className="p-4"><div className="h-6 w-full animate-pulse rounded bg-muted/60" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-72 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-6">
                                            <div className="p-6 bg-muted/40 rounded-3xl ring-1 ring-border shadow-inner">
                                                <Activity className="h-12 w-12 opacity-10 text-primary" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <p className="font-black text-foreground uppercase tracking-widest text-lg">Empty Logs</p>
                                                <p className="text-xs font-medium max-w-[240px] mx-auto text-muted-foreground opacity-70">Adjust your double-filter criteria to reveal system activity.</p>
                                            </div>
                                            <Button variant="link" onClick={handleResetFilters} className="text-primary font-black uppercase text-xs tracking-widest hover:no-underline">Reset All</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.map((log) => (
                                    <TableRow key={log.id} className="group border-b border-border transition-colors hover:bg-muted/10">
                                        <TableCell className="pl-6 font-bold text-[10px] tracking-tight text-muted-foreground/80 py-3.5">
                                            {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: dateLocale })}
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-center text-[11px] text-primary font-black shadow-sm ring-1 ring-primary/5">
                                                    {log.user?.name?.charAt(0).toUpperCase() || <UserIcon className="h-3.5 w-3.5" />}
                                                </div>
                                                <div className="flex flex-col -space-y-0.5">
                                                    <span className="text-xs font-black tracking-tight text-foreground/90">{log.user?.name || 'System'}</span>
                                                    <span className="text-[9px] font-bold text-muted-foreground tracking-tighter uppercase">{formatUserRole(log.user?.role)}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5 text-center">
                                            <Badge variant="outline" className={`text-[9px] py-0.5 px-2.5 font-black uppercase tracking-widest border-2 ${getActionBadgeColor(log.action)}`}>
                                                {formatActionName(log.action)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3.5 text-center">
                                            <span className="text-[10px] font-black tracking-[0.2em] text-muted-foreground italic uppercase">
                                                {getEntityDisplayLabel(log)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <div className="text-[11px] font-bold text-foreground/70 tracking-tight truncate max-w-[320px] group-hover:text-foreground transition-colors italic">
                                                {formatDetailsSummary(log.details)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6 py-3.5">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 bg-background shadow-xs hover:bg-primary hover:text-white hover:border-primary transition-all opacity-0 group-hover:opacity-100 rounded-lg scale-90 group-hover:scale-100"
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <div className="px-6 py-5 flex items-center justify-between border-t border-border bg-muted/10 tracking-tight">
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60">
                            {t('common.showing')} <span className="text-primary text-xs mx-0.5">{offset + 1}</span>
                            {t('common.to')} <span className="text-primary text-xs mx-0.5">{Math.min(offset + limit, total)}</span>
                            {t('common.of')} <span className="text-primary text-xs mx-0.5">{total}</span>
                            {t('common.entries')}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrevPage}
                                disabled={offset === 0}
                                className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all disabled:opacity-20 border-border bg-background shadow-xs rounded-lg"
                            >
                                {t('common.previous', 'Previous')}
                            </Button>

                            <div className="flex items-center gap-1.5 mx-1">
                                {Array.from({ length: Math.min(5, Math.ceil(total / limit)) }).map((_, i) => {
                                    const pageNum = i + 1;
                                    const isCurrent = Math.floor(offset / limit) + 1 === pageNum;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={isCurrent ? 'default' : 'outline'}
                                            size="icon"
                                            className={`h-8 w-8 text-[11px] font-black rounded-lg transition-all ${isCurrent
                                                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90'
                                                : 'hover:border-primary hover:text-primary border-border bg-background shadow-xs'
                                                }`}
                                            onClick={() => setOffset((pageNum - 1) * limit)}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                {Math.ceil(total / limit) > 5 && (
                                    <span className="text-muted-foreground text-[10px] font-black tracking-widest px-1">...</span>
                                )}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNextPage}
                                disabled={offset + limit >= total}
                                className="h-8 px-4 text-[10px] font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-all disabled:opacity-20 border-border bg-background shadow-xs rounded-lg"
                            >
                                {t('common.next', 'Next')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-2xl ring-1 ring-border">
                    <div className={`h-2 w-full ${selectedLog ? getActionBadgeColor(selectedLog.action) : ''}`}></div>
                    <div className="p-6">
                        <DialogHeader>
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-xl shadow-lg ${selectedLog ? getActionBadgeColor(selectedLog.action) : ''}`}>
                                    <Activity className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-xl font-black tracking-tight">{t('common.action_logs')}</DialogTitle>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <Badge variant="outline" className="text-xs font-bold rounded-full border-2 px-3">
                                            ID #{selectedLog?.id}
                                        </Badge>
                                        <Badge className={`text-xs font-bold rounded-full ${getActionBadgeColor(selectedLog?.action || '')}`}>
                                            {formatActionName(selectedLog?.action || '')}
                                        </Badge>
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            {selectedLog ? getEntityDisplayLabel(selectedLog) : 'SYSTEM'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        {selectedLog && (
                            <div className="space-y-5 mt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-4 bg-muted/40 rounded-xl border">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <UserIcon className="h-3 w-3" /> {t('common.user')}
                                        </p>
                                        <p className="text-sm font-bold text-foreground">{selectedLog.user?.name || 'System'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{selectedLog.user?.email || 'INTERNAL_SERVICE'}</p>
                                    </div>
                                    <div className="p-4 bg-muted/40 rounded-xl border">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Calendar className="h-3 w-3" /> {t('common.date')}
                                        </p>
                                        <p className="text-sm font-bold text-foreground">{format(new Date(selectedLog.createdAt), 'dd MMM yyyy', { locale: dateLocale })}</p>
                                        <p className="text-xs text-muted-foreground">{format(new Date(selectedLog.createdAt), 'HH:mm:ss')}</p>
                                    </div>
                                    <div className="p-4 bg-muted/40 rounded-xl border">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">IP Address</p>
                                        <p className="text-sm font-bold text-foreground">{selectedLog.ipAddress || 'Local'}</p>
                                        <p className="text-xs text-muted-foreground uppercase">{formatUserRole(selectedLog.user?.role)}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('common.details')}</p>
                                    <div className="rounded-xl border bg-card">
                                        {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                                            <div className="divide-y">
                                                {Object.entries(selectedLog.details).map(([key, value]) => (
                                                    <div key={key} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                                                        <div className="w-32 flex-shrink-0">
                                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                                                                {key.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            {typeof value === 'object' && value !== null ? (
                                                                <pre className="text-xs font-mono text-foreground bg-muted/50 p-2 rounded-lg overflow-auto whitespace-pre-wrap break-all">
                                                                    {JSON.stringify(value, null, 2)}
                                                                </pre>
                                                            ) : (
                                                                <span className="text-sm font-medium text-foreground break-all">
                                                                    {value?.toString() || '—'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-6 text-center text-muted-foreground">
                                                <p className="text-sm font-medium">No additional details</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button onClick={() => setSelectedLog(null)} className="w-full">
                                        {t('common.close', 'Close')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
