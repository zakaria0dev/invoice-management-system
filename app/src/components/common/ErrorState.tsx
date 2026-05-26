import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
    error: string;
    onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
    const { t } = useTranslation();

    // Map error string to translation key if it's a known error
    const getErrorMessage = (err: string) => {
        if (err.includes('Failed to load products')) return t('common.failed_to_load_products');
        return err;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center animate-fade-in">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('common.something_went_wrong')}</h2>
            <p className="text-muted-foreground mb-6 max-w-md">{getErrorMessage(error)}</p>
            <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
                <RefreshCw className="h-4 w-4" />
                {t('common.retry')}
            </button>
        </div>
    );
}
