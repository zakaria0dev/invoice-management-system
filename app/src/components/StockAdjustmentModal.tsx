import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Product } from '@/types';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface StockAdjustmentModalProps {
    product: Product;
    onClose: () => void;
    onSubmit: (quantity: number, type: 'MANUAL' | 'INVOICE', note: string) => Promise<void>;
}

export default function StockAdjustmentModal({ product, onClose, onSubmit }: StockAdjustmentModalProps) {
    const { t } = useTranslation();
    const [quantity, setQuantity] = useState<string>('');
    const [operation, setOperation] = useState<'add' | 'remove'>('add');
    const [note, setNote] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const qty = Number(quantity);
        if (!qty || qty <= 0) return;

        if (operation === 'remove' && qty > (product.stock || 0)) {
            toast.error(`Cannot remove more than the current stock (${product.stock || 0})`);
            return;
        }

        try {
            setIsSubmitting(true);
            const finalQuantity = operation === 'add' ? qty : -qty;
            await onSubmit(finalQuantity, 'MANUAL', note);
        } catch (error: any) {
            console.error('Failed to adjust stock:', error);
            toast.error(`Failed: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold">{t('products.stock_adjustment')}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-sm">
                        <strong>{product.name}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('products.current_stock', 'Current Stock')}: <span className="font-mono font-medium">{product.stock || 0}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            type="button"
                            variant={operation === 'add' ? 'default' : 'outline'}
                            onClick={() => setOperation('add')}
                            className="flex-1"
                        >
                            {t('products.add_stock_btn')}
                        </Button>
                        <Button
                            type="button"
                            variant={operation === 'remove' ? 'default' : 'outline'}
                            onClick={() => setOperation('remove')}
                            className="flex-1"
                        >
                            {t('products.remove_stock_btn')}
                        </Button>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">{t('products.quantity')}</label>
                        <input
                            type="number"
                            min="1"
                            required
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">{t('products.note')} {t('invoices.optional')}</label>
                        <input
                            type="text"
                            placeholder="e.g. Received 50 units"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                        >
                            {t('products.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !quantity}
                            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {t('products.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
