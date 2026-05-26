import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Product } from '@/types';
import { getImageUrl } from '@/lib/api';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
} from '@/components/ui/combobox';
import { Controller } from 'react-hook-form';

interface ProductFormModalProps {
    product: Product | null;
    existingCategories: string[];
    existingUnits: string[];
    onClose: () => void;
    onSubmit: (data: any, imageFile?: File | null) => Promise<void>;
}

export default function ProductFormModal({ product, existingCategories, existingUnits, onClose, onSubmit }: ProductFormModalProps) {
    const { t } = useTranslation();
    const isEditing = !!product;
    const [categorySearch, setCategorySearch] = useState('');
    const [unitSearch, setUnitSearch] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(getImageUrl(product?.imageUrl));

    const schema = z.object({
        name: z.string().min(1, t('login.email_required')), // Reuse required or add specific translation
        description: z.string().optional(),
        category: z.string().min(1, 'Category is required'),

        priceHT: z.coerce.number().min(0, 'Must be positive'),
        tva: z.coerce.number().min(0, 'Must be positive'),
        unit: z.string().optional(),
        stock: z.coerce.number().int().optional().default(0),
        minStock: z.coerce.number().int().optional().default(0),
    });

    type FormData = z.infer<typeof schema>;

    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: product?.name || '',
            description: product?.description || '',
            category: product?.category || '',
            priceHT: product?.priceHT ? Number(product.priceHT) : 0,
            tva: product?.tva ? Number(product.tva) : 20,
            unit: product?.unit || '',
            stock: product?.stock || 0,
            minStock: product?.minStock || 0,
        },
    });

    const handleFormSubmit = async (data: FormData) => {
        try {
            await onSubmit(data, imageFile);
        } catch (error) {
            console.error('Failed to submit product:', error);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/10 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-xl rounded-xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold">
                        {isEditing ? t('products.edit_product') : t('products.new_product')}
                    </h2>
                    <button
                        onClick={() => {
                            setCategorySearch('');
                            setUnitSearch('');
                            onClose();
                        }}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                        aria-label={t('common.close_sidebar')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium">{t('products.name')}</label>
                            <input
                                {...register('name')}
                                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium">{t('products.description')} {t('invoices.optional')}</label>
                            <textarea
                                {...register('description')}
                                rows={2}
                                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-sm font-medium">{t('Picture')} {t('invoices.optional')}</label>
                            <div className="flex items-center gap-4">
                                {previewUrl && (
                                    <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
                                        <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => { setImageFile(null); setPreviewUrl(null); }}
                                            className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl bg-black/50 text-white"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setImageFile(file);
                                                setPreviewUrl(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">{t('products.category')}</label>
                            <Controller
                                name="category"
                                control={control}
                                render={({ field }) => (
                                    <Combobox
                                        value={field.value}
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            setCategorySearch('');
                                        }}
                                    >
                                        <ComboboxInput
                                            placeholder="e.g., Services, Hardware"
                                            className="w-full"
                                            onChange={(e) => setCategorySearch(e.currentTarget.value)}
                                        />
                                        <ComboboxContent>
                                            <ComboboxEmpty>
                                                {categorySearch ? (
                                                    <ComboboxItem value={categorySearch} className="text-primary font-bold">
                                                        <Plus className="h-3 w-3 mr-2" /> Add "{categorySearch}"
                                                    </ComboboxItem>
                                                ) : (
                                                    <span className="p-2 text-xs text-muted-foreground">{t('common.no_results')}</span>
                                                )}
                                            </ComboboxEmpty>
                                            <ComboboxList>
                                                {categorySearch && !existingCategories.includes(categorySearch) && (
                                                    <ComboboxItem value={categorySearch} className="text-primary font-bold border-b mb-1 pb-2">
                                                        <Plus className="h-3 w-3 mr-2 font-bold" /> Add "{categorySearch}"
                                                    </ComboboxItem>
                                                )}
                                                {existingCategories.map((cat) => (
                                                    <ComboboxItem key={cat} value={cat}>
                                                        {cat}
                                                    </ComboboxItem>
                                                ))}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                )}
                            />
                            {errors.category && <p className="mt-1 text-xs text-destructive">{errors.category.message}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">{t('products.unit')} {t('invoices.optional')}</label>
                            <Controller
                                name="unit"
                                control={control}
                                render={({ field }) => (
                                    <Combobox
                                        value={field.value}
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            setUnitSearch('');
                                        }}
                                    >
                                        <ComboboxInput
                                            placeholder="e.g., hour, day, piece"
                                            className="w-full"
                                            onChange={(e) => setUnitSearch(e.currentTarget.value)}
                                        />
                                        <ComboboxContent>
                                            <ComboboxEmpty>
                                                {unitSearch ? (
                                                    <ComboboxItem value={unitSearch} className="text-primary font-bold">
                                                        <Plus className="h-3 w-3 mr-2" /> Add "{unitSearch}"
                                                    </ComboboxItem>
                                                ) : (
                                                    <span className="p-2 text-xs text-muted-foreground">{t('common.no_results')}</span>
                                                )}
                                            </ComboboxEmpty>
                                            <ComboboxList>
                                                {unitSearch && !existingUnits.includes(unitSearch) && (
                                                    <ComboboxItem value={unitSearch} className="text-primary font-bold border-b mb-1 pb-2">
                                                        <Plus className="h-3 w-3 mr-2 font-bold" /> Add "{unitSearch}"
                                                    </ComboboxItem>
                                                )}
                                                {existingUnits.map((u) => (
                                                    <ComboboxItem key={u} value={u}>
                                                        {u}
                                                    </ComboboxItem>
                                                ))}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                )}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">{t('products.price_ht')}</label>
                            <input
                                type="number" step="0.01"
                                {...register('priceHT')}
                                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                            {errors.priceHT && <p className="mt-1 text-xs text-destructive">{errors.priceHT.message}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium">{t('products.tva')} (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('tva')}
                                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                            {errors.tva && <p className="mt-1 text-xs text-destructive">{errors.tva.message}</p>}
                        </div>

                        {!isEditing && (
                            <>
                                <div className="pt-2 border-t sm:col-span-2">
                                    <h3 className="text-sm font-semibold mb-3">{t('products.initial_stock')}</h3>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">{t('products.stock')}</label>
                                    <input
                                        type="number"
                                        {...register('stock')}
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    {errors.stock && <p className="mt-1 text-xs text-destructive">{errors.stock.message}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">{t('products.min_stock')}</label>
                                    <input
                                        type="number"
                                        {...register('minStock')}
                                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    {errors.minStock && <p className="mt-1 text-xs text-destructive">{errors.minStock.message}</p>}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => {
                                setCategorySearch('');
                                setUnitSearch('');
                                onClose();
                            }}
                            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                        >
                            {t('products.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
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
