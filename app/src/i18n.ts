import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            fr: { translation: fr },
        },
        fallbackLng: 'fr',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
            caches: ['localStorage'],
        },
        parseMissingKeyHandler: (key) => {
            // Convert 'common.yes_delete' to 'Yes Delete' as a fallback
            const parts = key.split('.');
            const lastPart = parts[parts.length - 1];
            return lastPart
                .replace(/_/g, ' ')
                .replace(/([A-Z])/g, ' $1') // Handle camelCase
                .trim()
                .replace(/\b\w/g, l => l.toUpperCase());
        },
    });

export default i18n;
