import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from 'react-i18next';
import { Product } from '@/types';
import { getImageUrl } from '@/lib/api';
import { Search, Plus, Trash2, Edit2, Package as PackageIcon, ArrowUpDown, History, X, RefreshCw } from 'lucide-react';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
} from '@/components/ui/combobox';
import ProductFormModal from '@/components/ProductFormModal';
import StockAdjustmentModal from '@/components/StockAdjustmentModal';
import ProductDetailsModal from '@/components/ProductDetailsModal';
import { usePermissions } from '@/hooks/usePermissions';
import api from '@/lib/api';
import { ErrorState } from '@/components/common/ErrorState';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast as sonner } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function ProductsPage() {
    const {
        products,
        fetchProducts,
        deleteProduct,
        addProduct,
        updateProduct,
        uploadProductImage,
        adjustProductStock,
        settings,
        fetchSettings,
        isLoading,
        error
    } = useAppStore();
    const { t } = useTranslation();

    const [search, setSearch] = useState('');
    const [stockFilter, setStockFilter] = useState<string>('all'); // all, in_stock, low_stock, out_of_stock
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
    const [adjustingStock, setAdjustingStock] = useState<Product | null>(null);
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    const [productHistory, setProductHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const { canCreateProduct, canEditProduct, canDeleteProduct, canAdjustStock } = usePermissions();

    const { getProductHistory } = useAppStore();

    useEffect(() => {
        fetchProducts();
        if (!settings) fetchSettings();

        const handleNew = () => { setEditingProduct(null); setShowModal(true); };
        // ProductsPage uses ProductFormModal which doesn't expose handleSubmit easily here
        // We might need to handle save inside the modal or pass an event

        window.addEventListener('shortcuts:new-invoice' as any, handleNew);
        return () => {
            window.removeEventListener('shortcuts:new-invoice' as any, handleNew);
        };
    }, [fetchProducts, fetchSettings, settings]);

    if (error) {
        return <ErrorState error={error} onRetry={fetchProducts} />;
    }

    const openFullHistory = async (prod: Product) => {
        setHistoryProduct(prod);
        setHistoryLoading(true);
        try {
            const history = await getProductHistory(prod.id);
            setProductHistory(history);
        } catch (e) {
            setProductHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleDeleteWithUndo = (id: string | number, name: string) => {
        const timeout = setTimeout(async () => {
            try {
                await deleteProduct(id);
            } catch (err: any) {
                const errorMsg = err.response?.data?.message || `Failed to delete product ${name}`;
                sonner.error(errorMsg);
            }
        }, 5000);

        sonner(`Product ${name} will be deleted in 5s`, {
            action: {
                label: "Undo",
                onClick: () => {
                    clearTimeout(timeout);
                    sonner.info("Deletion cancelled");
                }
            }
        });
    };

    const filtered = products.filter((prod) => {
        const matchSearch = prod.name.toLowerCase().includes(search.toLowerCase()) ||
            (prod.category && prod.category.toLowerCase().includes(search.toLowerCase()));

        let matchStock = true;
        const stock = prod.stock || 0;
        const minStock = prod.minStock || 0;

        if (stockFilter === 'out_of_stock') {
            matchStock = stock <= 0;
        } else if (stockFilter === 'low_stock') {
            matchStock = stock > 0 && stock <= minStock;
        } else if (stockFilter === 'in_stock') {
            matchStock = stock > minStock;
        }

        const matchCategory = categoryFilter === 'all' || prod.category === categoryFilter;

        return matchSearch && matchStock && matchCategory;
    });

    // Compute unique categories and units
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
    const units = Array.from(new Set(products.map(p => p.unit).filter(Boolean))) as string[];

    const getStockBadge = (stock: number = 0, minStock: number = 0) => {
        if (stock <= 0) {
            return <span className="status-badge bg-destructive/10 text-destructive border-destructive/20">{t('products.stock_status.out_of_stock')}</span>;
        }
        if (stock <= minStock) {
            return <span className="status-badge bg-warning/10 text-warning border-warning/20">{t('products.stock_status.low_stock')} ({stock})</span>;
        }
        return <span className="status-badge bg-success/10 text-success border-success/20">{t('products.stock_status.in_stock')} ({stock})</span>;
    };

    const statuses = ['all', 'in_stock', 'low_stock', 'out_of_stock'];

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="page-header mb-0">
                    <h1 className="page-title">{t('products.title')}</h1>
                    <p className="page-description">{t('products.total_products', { count: products.length })}</p>
                </div>
                {canCreateProduct() && (
                    <Button
                        onClick={() => { setEditingProduct(null); setShowModal(true); }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 shadow-lg shadow-primary/20 text-sm font-bold uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4 mr-2" /> {t('products.new_product')}
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t('products.search_placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    <div className="w-48">
                        <Combobox
                            value={categoryFilter}
                            onValueChange={(val) => setCategoryFilter(val)}
                        >
                            <ComboboxInput placeholder={t('status.all') + " Categories"} className="h-10" />
                            <ComboboxContent>
                                <ComboboxList>
                                    <ComboboxItem value="all">{t('status.all')} Categories</ComboboxItem>
                                    {categories.map((c) => (
                                        <ComboboxItem key={c} value={c}>{c}</ComboboxItem>
                                    ))}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                        {statuses.map((s) => (
                            <button key={s} onClick={() => setStockFilter(s)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${stockFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            >
                                {s === 'all' ? t('status.all') : t(`products.stock_status.${s}`)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('products.name')}</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">{t('products.category')}</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('products.price_ht')}</th>
                                <th className="px-4 py-3 text-center font-medium text-muted-foreground">{t('products.stock')}</th>
                                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('products.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="px-4 py-4"><Skeleton className="h-4 w-32" /></td>
                                        <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                                        <td className="px-4 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                                        <td className="px-4 py-4 text-center"><Skeleton className="h-6 w-20 mx-auto rounded-full" /></td>
                                        <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-lg" /></td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="rounded-full bg-muted p-3">
                                                <Search className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                                            </div>
                                            <p className="text-base font-medium">{t('products.no_products_found')}</p>
                                            <p className="text-sm text-muted-foreground">{t('products.no_results_adjust_filters')}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((prod) => (
                                    <tr
                                        key={prod.id}
                                        className="table-row-hover border-b last:border-0 cursor-pointer"
                                        onClick={() => setViewingProduct(prod)}
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-3">
                                                {prod.imageUrl ? (
                                                    <img src={getImageUrl(prod.imageUrl)} alt={prod.name} className="h-8 w-8 rounded-md object-cover border" />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                                        <PackageIcon className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <span>{prod.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{prod.category || '-'}</td>
                                        <td className="px-4 py-3 text-right mono font-semibold">
                                            {Number(prod.priceHT).toLocaleString()} {settings?.currency || 'MAD'} <span className="text-xs text-muted-foreground font-normal">({prod.unit || 'unit'})</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStockBadge(prod.stock, prod.minStock)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="inline-flex gap-1 justify-end w-full">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openFullHistory(prod); }}
                                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                                    title={t('products.history')}
                                                >
                                                    <History className="h-4 w-4" />
                                                </button>
                                                {canAdjustStock() && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setAdjustingStock(prod); }}
                                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                        title={t('products.adjust_stock')}
                                                    >
                                                        <ArrowUpDown className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {canEditProduct() && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingProduct(prod); setShowModal(true); }}
                                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                        title={t('products.edit_product')}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {canDeleteProduct() && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteWithUndo(prod.id, prod.name); }}
                                                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                        title={t('products.delete_product')}
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

            {viewingProduct && (
                <ProductDetailsModal
                    product={viewingProduct}
                    onClose={() => setViewingProduct(null)}
                    currency={settings?.currency || 'MAD'}
                />
            )}

            {showModal && (
                <ProductFormModal
                    product={editingProduct}
                    existingCategories={categories}
                    existingUnits={units}
                    onClose={() => { setShowModal(false); setEditingProduct(null); }}
                    onSubmit={async (data, file) => {
                        let productId = editingProduct?.id;
                        if (editingProduct) {
                            await updateProduct(editingProduct.id, data);
                        } else {
                            productId = await addProduct(data);
                        }

                        if (file && productId) {
                            await uploadProductImage(productId, file);
                        }

                        setShowModal(false);
                    }}
                />
            )}

            {adjustingStock && (
                <StockAdjustmentModal
                    product={adjustingStock}
                    onClose={() => setAdjustingStock(null)}
                    onSubmit={async (quantity, type, note) => {
                        await adjustProductStock(adjustingStock.id, quantity, type, note);
                        setAdjustingStock(null);
                    }}
                />
            )}


            {/* Product History Modal */}
            {historyProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/50 backdrop-blur-sm">
                    <div className="h-full w-full max-w-xl bg-background p-0 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-6 border-b flex items-center justify-between bg-card/50">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <History className="h-5 w-5 text-primary" />
                                    {t('products.change_history')}
                                </h2>
                                <p className="text-sm text-muted-foreground">{historyProduct.name}</p>
                            </div>
                            <button onClick={() => setHistoryProduct(null)} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
                                    <p className="text-sm font-medium">Fetching change logs...</p>
                                </div>
                            ) : productHistory.length === 0 ? (
                                <div className="text-center py-20 bg-card rounded-2xl border border-dashed">
                                    <History className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-sm font-medium text-muted-foreground">{t('products.no_history')}</p>
                                </div>
                            ) : (
                                <div className="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted">
                                    {productHistory.map((item) => (
                                        <div key={item.id} className="relative pl-8">
                                            {/* Timeline dot */}
                                            <div className={`absolute left-0 top-1.5 h-6 w-6 rounded-full border-4 border-background flex items-center justify-center z-10 ${item.action === 'CREATE' ? 'bg-green-500' :
                                                item.action === 'UPDATE' ? 'bg-blue-500' :
                                                    item.action === 'DELETE' ? 'bg-red-500' :
                                                        'bg-amber-500'
                                                }`}>
                                            </div>

                                            <div className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                        {t(`common.action_${item.action.toLowerCase()}`)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {format(new Date(item.createdAt), 'dd MMM yyyy, HH:mm')}
                                                    </span>
                                                </div>

                                                {item.action === 'UPDATE' && item.changes && (
                                                    <div className="space-y-2 mt-3">
                                                        {Object.entries(item.changes).map(([key, diff]: any) => (
                                                            <div key={key} className="text-xs bg-muted/30 p-2 rounded flex flex-col gap-1">
                                                                <span className="font-semibold text-primary/80 uppercase tracking-tighter text-[10px]">
                                                                    {key === 'priceHT' ? 'price HT' : key}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-red-500/80 line-through decoration-1">{String(diff.from)}</span>
                                                                    <span className="text-muted-foreground">→</span>
                                                                    <span className="text-green-600 font-medium">{String(diff.to)}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {item.action === 'STOCK_ADJUST' && item.changes && (
                                                    <div className="mt-2 text-sm flex items-center gap-2">
                                                        <span className={`font-bold ${item.changes.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {item.changes.quantity > 0 ? '+' : ''}{item.changes.quantity}
                                                        </span>
                                                        <span className="text-muted-foreground">({item.changes.type})</span>
                                                        {item.changes.note && <p className="text-xs italic text-muted-foreground mt-1 border-t pt-1">"{item.changes.note}"</p>}
                                                    </div>
                                                )}

                                                {item.action === 'CREATE' && (
                                                    <p className="text-sm text-muted-foreground mt-2 italic">{t('products.initialized')}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
