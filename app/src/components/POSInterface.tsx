import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Product } from '@/types';
import { getImageUrl } from '@/lib/api';
import { Search, Monitor, Package as PackageIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface POSInterfaceProps {
    products: Product[];
    onAddProduct: (product: Product) => void;
    currency: string;
    children: React.ReactNode;
    backUrl?: string;
}

export default function POSInterface({ products, onAddProduct, currency, children, backUrl = '/' }: POSInterfaceProps) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 z-[100] flex h-screen w-screen overflow-hidden bg-background text-foreground animate-fade-in">
            {/* Left Column - Product Gallery */}
            <div className="flex w-1/2 flex-col border-r bg-muted/10 lg:w-3/5">
                <div className="flex items-center justify-between border-b bg-card p-4 shadow-sm z-10">
                    <div className="relative w-64 md:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t('products.search_placeholder', 'Search products...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 w-full rounded-full border bg-background pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-ring shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2 text-primary">
                            <Monitor className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight uppercase hidden md:block">{t('common.pos_mode')}</h2>
                        </div>
                        <button
                            onClick={() => navigate(backUrl)}
                            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition-colors active:scale-95 ml-2"
                            title="Back to List"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-6 pb-20">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-xl h-48 bg-card/50 mt-10 mx-auto max-w-md">
                            <PackageIcon className="h-10 w-10 mb-2 opacity-50" />
                            <span className="text-sm font-medium">{t('common.no_results', 'No items found')}</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-4">
                            {filtered.map(product => {
                                const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => !isOutOfStock && onAddProduct(product)}
                                        disabled={isOutOfStock}
                                        className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${isOutOfStock ? 'opacity-60 cursor-not-allowed grayscale' : 'hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-[0.98]'}`}
                                    >
                                        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-b bg-muted/20">
                                            {product.imageUrl ? (
                                                <img
                                                    src={getImageUrl(product.imageUrl)}
                                                    alt={product.name}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <PackageIcon className="h-12 w-12 text-muted-foreground/30 transition-colors group-hover:text-primary/40" />
                                            )}
                                            {isOutOfStock && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
                                                    <span className="rounded-md bg-destructive px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-destructive-foreground shadow-lg shadow-destructive/20">Out of Stock</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-1 flex-col p-3">
                                            <h3 className="mb-1 line-clamp-2 text-sm font-semibold">{product.name}</h3>
                                            <span className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SKU: PRD-{product.id}</span>

                                            <div className="mt-auto flex items-end justify-between pt-2">
                                                <div className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                                                    {Number(product.priceHT).toLocaleString()} <span className="font-sans text-[10px] uppercase text-muted-foreground">{currency}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column - Document Details / Form */}
            <div className="flex w-1/2 flex-col bg-background shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] lg:w-2/5 z-20">
                {children}
            </div>
        </div>
    );
}

