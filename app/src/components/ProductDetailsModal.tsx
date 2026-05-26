import { useTranslation } from 'react-i18next';
import { Product } from '@/types';
import { getImageUrl } from '@/lib/api';
import { X, Package as PackageIcon } from 'lucide-react';
import { format } from 'date-fns';

interface ProductDetailsModalProps {
    product: Product;
    onClose: () => void;
    currency: string;
}

export default function ProductDetailsModal({ product, onClose, currency }: ProductDetailsModalProps) {
    const { t } = useTranslation();

    const getStockBadge = (stock: number = 0, minStock: number = 0) => {
        if (stock <= 0) {
            return <span className="status-badge bg-destructive/10 text-destructive border-destructive/20">{t('products.stock_status.out_of_stock')}</span>;
        }
        if (stock <= minStock) {
            return <span className="status-badge bg-warning/10 text-warning border-warning/20">{t('products.stock_status.low_stock')} ({stock})</span>;
        }
        return <span className="status-badge bg-success/10 text-success border-success/20">{t('products.stock_status.in_stock')} ({stock})</span>;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/10 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {t('products.title')} Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label={t('common.close')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Image Section */}
                    <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-muted/20">
                        {product.imageUrl ? (
                            <img
                                src={getImageUrl(product.imageUrl)}
                                alt={product.name}
                                className="w-full max-w-[200px] h-auto object-contain rounded-lg shadow-sm"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full h-32 text-muted-foreground">
                                <PackageIcon className="h-12 w-12 mb-2 opacity-50" />
                                <span className="text-sm font-medium">{t('products.no_image') || 'No image available'}</span>
                            </div>
                        )}
                    </div>

                    {/* Details Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('products.name')}</h3>
                            <p className="text-lg font-medium">{product.name}</p>
                        </div>

                        <div className="col-span-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('products.description')}</h3>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{product.description || '-'}</p>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('products.category')}</h3>
                            <p className="text-sm font-medium">{product.category || '-'}</p>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('products.stock')}</h3>
                            <div className="mt-1">
                                {getStockBadge(product.stock, product.minStock)}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('products.price_ht')}</h3>
                            <p className="text-lg font-bold font-mono">
                                {Number(product.priceHT).toLocaleString()} <span className="text-sm">{currency}</span>
                            </p>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('products.tva')}</h3>
                            <p className="text-sm font-medium">{Number(product.tva)}%</p>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('products.unit')}</h3>
                            <p className="text-sm font-medium capitalize">{product.unit || '-'}</p>
                        </div>

                        {product.createdAt && (
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Created At</h3>
                                <p className="text-sm font-medium">{format(new Date(product.createdAt), 'dd MMM yyyy')}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
