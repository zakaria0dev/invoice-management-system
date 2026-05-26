import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Trash2 } from 'lucide-react';
import POSInterface from '@/components/POSInterface';
import { calculateDocumentTotals } from '@/utils/calculations';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Combobox, ComboboxTrigger, ComboboxValue, ComboboxContent, ComboboxInput, ComboboxEmpty, ComboboxList, ComboboxItem } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

export default function CreateQuotePage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { canCreateQuote } = usePermissions();

    const {
        clients, products, settings,
        fetchClients, fetchProducts, fetchSettings,
        addQuote
    } = useAppStore();

    useEffect(() => {
        fetchClients();
        fetchProducts();
        fetchSettings();
    }, [fetchClients, fetchProducts, fetchSettings]);

    useEffect(() => {
        if (!canCreateQuote()) {
            navigate('/quotes');
        }
    }, [canCreateQuote, navigate]);

    const quoteSchema = z.object({
        clientId: z.string().min(1, t('invoices.select_client')),
        date: z.string().min(1, t('invoices.issue_date')),
        validUntil: z.string().min(1, t('quotes.valid_until')),
        currency: z.string().default('MAD'),
        items: z.array(z.object({
            productId: z.string().min(1, t('invoices.items')),
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

    const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<QuoteFormData>({
        resolver: zodResolver(quoteSchema),
        defaultValues: {
            items: [{ productId: '', description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' }],
            currency: settings?.currency || 'MAD',
            date: new Date().toISOString().split('T')[0],
            notes: ''
        },
    });

    const watchedItems = useWatch({ control, name: 'items' });
    const watchedCurrency = useWatch({ control, name: 'currency' });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });

    const { netHT: totalHT, totalDiscount, taxAmount: totalTVA, totalTTC } = calculateDocumentTotals(watchedItems || []);

    const handlePOSAddProduct = (product: any) => {
        const currentItems = watch('items') || [];
        if (currentItems.length === 1 && !currentItems[0].productId) {
            setValue(`items.0.productId`, String(product.id), { shouldValidate: true, shouldDirty: true });
            setValue(`items.0.description`, product.name, { shouldValidate: true });
            setValue(`items.0.price`, Number(product.priceHT), { shouldValidate: true });
            setValue(`items.0.tax`, Number(product.tva), { shouldValidate: true });
            setValue(`items.0.quantity`, 1, { shouldValidate: true });
            return;
        }
        const existingIndex = currentItems.findIndex((i: any) => String(i.productId) === String(product.id));
        if (existingIndex >= 0) {
            const currentQty = Number(currentItems[existingIndex].quantity);
            const logicalStock = Number(product.stock) || 0;
            if (typeof product.stock === 'number' && product.stock >= 0 && (currentQty + 1) > logicalStock) {
                toast({ title: 'Stock Limit Reached', description: `Cannot add more than ${logicalStock} units`, variant: 'destructive' });
                return;
            }
            setValue(`items.${existingIndex}.quantity`, currentQty + 1, { shouldValidate: true, shouldDirty: true });
        } else {
            append({
                productId: String(product.id),
                description: product.name,
                quantity: 1,
                price: Number(product.priceHT),
                tax: Number(product.tva),
                discount: 0,
                discountType: 'PERCENTAGE'
            });
        }
    };

    const onSubmit = async (data: QuoteFormData) => {
        try {
            const formattedItems = data.items.map(item => ({
                ...item,
                productId: parseInt(item.productId),
                discount: item.discount || 0
            }));
            await addQuote({ ...data, items: formattedItems, clientId: parseInt(data.clientId) });
            toast({ title: t('common.success'), description: t('quotes.create_success', 'Quote created successfully!') });
            navigate('/quotes');
        } catch (error: any) {
            toast({ title: t('common.error'), description: error.message || t('quotes.create_error', 'Failed to create quote.'), variant: 'destructive' });
        }
    };

    return (
        <POSInterface
            products={products}
            onAddProduct={handlePOSAddProduct}
            currency={watchedCurrency || settings?.currency || 'MAD'}
            backUrl="/quotes"
        >
            <div className="flex-1 flex flex-col h-full w-full">
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b">
                        <h2 className="text-2xl font-black tracking-tight text-primary uppercase">
                            {t('quotes.new_quote')}
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-1.5 lg:col-span-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.client')}</label>
                                <Controller
                                    name="clientId"
                                    control={control}
                                    render={({ field }) => (
                                        <Combobox value={field.value} onValueChange={(val) => field.onChange(val)}>
                                            <ComboboxTrigger className={cn("w-full flex h-10 items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring", errors.clientId && "border-destructive")}>
                                                <ComboboxValue placeholder={t('invoices.select_client')}>
                                                    {clients.find(c => String(c.id) === field.value)?.name}
                                                </ComboboxValue>
                                            </ComboboxTrigger>
                                            <ComboboxContent side="bottom" align="start">
                                                <div className="flex items-center border-b px-3">
                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                    <ComboboxInput placeholder={t('invoices.search_placeholder')} className="flex h-10 w-full bg-transparent py-3 text-sm outline-none" />
                                                </div>
                                                <ComboboxEmpty>{t('common.no_results')}</ComboboxEmpty>
                                                <ComboboxList>
                                                    {clients.map((client) => (
                                                        <ComboboxItem key={client.id} value={String(client.id)} label={client.name}>
                                                            {client.name}
                                                        </ComboboxItem>
                                                    ))}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                    )}
                                />
                                {errors.clientId && <p className="mt-1 text-[10px] text-destructive font-bold uppercase">{errors.clientId.message}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.issue_date')}</label>
                                <Controller name="date" control={control} render={({ field }) => (
                                    <DatePicker date={field.value ? new Date(field.value) : undefined} setDate={(date) => field.onChange(date?.toISOString().split('T')[0])} />
                                )} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('quotes.valid_until')}</label>
                                <Controller name="validUntil" control={control} render={({ field }) => (
                                    <DatePicker date={field.value ? new Date(field.value) : undefined} setDate={(date) => field.onChange(date?.toISOString().split('T')[0])} disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} />
                                )} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('invoices.items')}</h3>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', description: '', quantity: 1, price: 0, tax: 20, discount: 0, discountType: 'PERCENTAGE' })} className="text-xs h-8">
                                    <Plus className="mr-2 h-3.5 w-3.5" /> {t('invoices.add_item')}
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {fields.map((field, i) => (
                                    <div key={field.id} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end bg-muted/10 p-3 rounded-lg border border-transparent hover:border-border transition-all">
                                        <div className="lg:col-span-5 space-y-1.5">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">{t('invoices.product')}</label>
                                            <Controller
                                                name={`items.${i}.productId`}
                                                control={control}
                                                render={({ field }) => (
                                                    <Combobox value={field.value} onValueChange={(val) => {
                                                        field.onChange(val);
                                                        const selectedProduct = products.find(p => String(p.id) === val);
                                                        if (selectedProduct) {
                                                            setValue(`items.${i}.description`, selectedProduct.name);
                                                            setValue(`items.${i}.price`, Number(selectedProduct.priceHT));
                                                            setValue(`items.${i}.tax`, Number(selectedProduct.tva));
                                                        }
                                                    }}>
                                                        <ComboboxTrigger className={cn("w-full flex h-9 items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm shadow-sm", errors.items?.[i]?.productId && "border-destructive")}>
                                                            <ComboboxValue placeholder={t('invoices.select_product')}>{products.find(p => String(p.id) === field.value)?.name}</ComboboxValue>
                                                        </ComboboxTrigger>
                                                        <ComboboxContent side="bottom" align="start">
                                                            <div className="flex items-center border-b px-3">
                                                                <Search className="mr-2 h-4 w-4 opacity-50" />
                                                                <ComboboxInput placeholder={t('invoices.search')} className="flex h-10 w-full bg-transparent py-3 text-sm outline-none" />
                                                            </div>
                                                            <ComboboxList>
                                                                {products.map((p) => (
                                                                    <ComboboxItem key={p.id} value={String(p.id)} label={p.name}>{p.name}</ComboboxItem>
                                                                ))}
                                                            </ComboboxList>
                                                        </ComboboxContent>
                                                    </Combobox>
                                                )}
                                            />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">{t('invoices.qty')}</label>
                                            <input type="number" {...register(`items.${i}.quantity`, { valueAsNumber: true, min: 1 })} className="w-full rounded-lg border bg-background px-2 h-9 text-sm text-center" />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">{t('invoices.price')}</label>
                                            <input type="number" step="0.01" {...register(`items.${i}.price`)} className="w-full rounded-lg border bg-background px-2 h-9 text-sm text-right font-mono" />
                                        </div>
                                        <div className="lg:col-span-2">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">{t('invoices.tax')} %</label>
                                            <input type="number" {...register(`items.${i}.tax`)} className="w-full rounded-lg border bg-muted px-2 h-9 text-xs font-mono text-center" readOnly />
                                        </div>
                                        <div className="lg:col-span-1 flex justify-end">
                                            <button type="button" onClick={() => remove(i)} className="pt-2 pb-1 text-muted-foreground hover:text-destructive transition-all">
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl bg-muted/20 p-5 space-y-2 border-2 border-dashed border-muted">
                            <div className="flex justify-between items-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                <span>{t('invoices.subtotal')}</span>
                                <span className="font-mono text-sm">{(totalHT + totalDiscount).toFixed(2)} {watchedCurrency}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                <span>{t('invoices.tax')} (VAT)</span>
                                <span className="font-mono text-sm">{totalTVA.toFixed(2)} {watchedCurrency}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t-2 border-muted">
                                <span className="text-sm font-black uppercase tracking-tight text-primary">Total</span>
                                <span className="font-mono text-xl font-black text-primary drop-shadow-sm">{totalTTC.toFixed(2)} {watchedCurrency}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-background pb-4 pt-6 z-10">
                            <Button type="button" variant="outline" className="flex-1 h-12 text-xs font-bold uppercase tracking-wider" onClick={() => navigate('/quotes')}>{t('invoices.cancel')}</Button>
                            <Button type="submit" className="flex-1 h-12 text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all" disabled={isSubmitting}>
                                {isSubmitting ? t('common.saving') : t('quotes.create')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </POSInterface>
    );
}
