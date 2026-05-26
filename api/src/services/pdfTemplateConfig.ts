/**
 * PDF Template Configuration
 * Centralized configuration for all PDF template styling and layout
 */

import { rgb } from 'pdf-lib';

// ============================================================================
// THEME SYSTEM
// ============================================================================

export type ThemeName = 'MODERN' | 'CLASSIC' | 'MINIMALIST' | 'BOLD' | 'ELEGANT';

export interface ThemeColors {
    primary: any;
    secondary: any;
    accent: any;
    primaryOverride?: any;
}

export const THEME_COLORS: Record<ThemeName, ThemeColors> = {
    MODERN: {
        primary: rgb(0.05, 0.4, 0.65),      // #0D66A6 - Professional blue
        secondary: rgb(0.2, 0.2, 0.2),      // #333333 - Dark gray
        accent: rgb(0.0, 0.45, 0.55)        // #00738C - Teal highlight
    },
    CLASSIC: {
        primary: rgb(0.2, 0.2, 0.2),        // #333333 - Charcoal gray
        secondary: rgb(0.3, 0.3, 0.3),      // #4D4D4D - Medium gray
        accent: rgb(0.0, 0.0, 0.0)          // #000000 - Black accent
    },
    MINIMALIST: {
        primary: rgb(0.15, 0.15, 0.15),     // #262626 - Soft black
        secondary: rgb(0.5, 0.5, 0.5),      // #808080 - Medium gray
        accent: rgb(0.7, 0.7, 0.7)          // #B2B2B2 - Light gray accent
    },
    BOLD: {
        primary: rgb(0.43, 0.22, 0.79),     // #6E38C9 - Vibrant purple
        secondary: rgb(0.2, 0.2, 0.2),      // #333333 - Dark gray
        accent: rgb(0.82, 0.21, 0.26)       // #D13438 - Red highlight
    },
    ELEGANT: {
        primary: rgb(0.0, 0.45, 0.55),      // #00738C - Teal
        secondary: rgb(0.2, 0.2, 0.2),      // #333333 - Dark gray
        accent: rgb(0.82, 0.51, 0.11)       // #D18319 - Gold accent
    }
};

// ============================================================================
// UI COLORS
// ============================================================================

export const UI_COLORS = {
    background: rgb(0.97, 0.97, 0.97),      // #F7F7F7 - Light gray background
    mediumGray: rgb(0.5, 0.5, 0.5),          // #808080 - Medium text
    border: rgb(0.9, 0.9, 0.9),              // #E6E6E6 - Border color
    lightBorder: rgb(0.95, 0.95, 0.95),      // #F2F2F2 - Subtle border
    white: rgb(1, 1, 1),                      // #FFFFFF - Pure white
    black: rgb(0, 0, 0),                      // #000000 - Pure black
    darkGray: rgb(0.2, 0.2, 0.2),            // #333333 - Dark gray text
    lightGray: rgb(0.7, 0.7, 0.7),           // #B2B2B2 - Light gray text
};

// ============================================================================
// TYPOGRAPHY CONFIGURATION
// ============================================================================

export const TYPOGRAPHY = {
    // Document title
    title: {
        size: 28,
        weight: 'bold' as const
    },
    // Section headers
    sectionHeader: {
        size: 14,
        weight: 'bold' as const
    },
    // Column headers and labels
    header: {
        size: 12,
        weight: 'bold' as const
    },
    // Body text
    body: {
        size: 11,
        weight: 'normal' as const
    },
    // Smaller body text
    bodySmall: {
        size: 10,
        weight: 'normal' as const
    },
    // Footnotes and captions
    small: {
        size: 9,
        weight: 'normal' as const
    },
    // Minimal text
    footnote: {
        size: 8,
        weight: 'normal' as const
    }
};

// ============================================================================
// LAYOUT CONFIGURATION
// ============================================================================

export const LAYOUT = {
    // Page dimensions (Letter size: 8.5" x 11")
    pageWidth: 612,              // pixels
    pageHeight: 792,             // pixels

    // Margins (in pixels)
    margins: {
        top: 50,                  // 0.694"
        bottom: 50,               // 0.694"
        left: 45,                 // 0.625"
        right: 45,                // 0.625"
    },

    // Content area
    contentWidth: 522,            // 612 - 45 - 45
    contentHeight: 692,           // 792 - 50 - 50

    // Spacing between elements
    spacing: {
        section: 25,              // Between major sections
        element: 15,              // Between elements within sections
        line: 12,                 // Line height
        compact: 8,               // Compact spacing
    },

    // Logo sizing
    logo: {
        width: 80,
        height: 80,
        bgWidth: 90,              // Background box width
        bgHeight: 90,             // Background box height
        margin: 10,               // Margin from text
    },

    // Header section
    header: {
        height: 120,              // Total header height
        logoStartX: 45,
        textStartX: 150,
    },

    // Table configuration
    table: {
        width: 522,
        headerHeight: 30,
        rowHeight: 20,
        borderWidth: 1,
        // Column widths (percentages of table width)
        columns: {
            description: 0.35,    // 35%
            quantity: 0.10,       // 10%
            unitPrice: 0.15,      // 15%
            tax: 0.15,            // 15%
            total: 0.20,          // 20%
        }
    },

    // Section dimensions
    sections: {
        documentMetadata: 60,
        clientInfo: 80,
        items: 'dynamic',         // Height depends on items count
        totals: 120,
        payments: 80,
        legalMentions: 'dynamic',
    }
};

// ============================================================================
// DOCUMENT TEMPLATE CONFIGURATION
// ============================================================================

export interface DocumentMetadata {
    type: 'INVOICE' | 'QUOTE' | 'CREDIT_NOTE' | 'REFUND';
    title: string;
    number: string;
    date: string;
    dueDate?: string;
    validUntil?: string;
}

export interface ClientInfo {
    name: string;
    email: string;
    address: string;
    taxId?: string;
    vatNumber?: string;
}

export interface CompanyInfo {
    name: string;
    address: string;
    email: string;
    phone: string;
    taxId?: string;
    vatNumber?: string;
    iban?: string;
    swift?: string;
    logo?: string;              // Base64 encoded image
    logoUrl?: string;            // File path/URL
}

export interface LineItem {
    description: string;
    quantity: number;
    price: number;
    tax: number;                // Tax percentage (0-100)
    discount?: number;
    discountType?: 'PERCENTAGE' | 'AMOUNT';
}

export interface PaymentInfo {
    amount: number;
    date: string;
    method: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get theme color for specific theme
 */
export const getThemeColor = (themeName: ThemeName = 'MODERN', override?: any): any => {
    if (override) return override;
    return THEME_COLORS[themeName]?.primary || THEME_COLORS.MODERN.primary;
};

/**
 * Get full theme configuration
 */
export const getThemeConfig = (themeName: ThemeName = 'MODERN', primaryOverride?: any): ThemeColors => {
    const config = { ...(THEME_COLORS[themeName] || THEME_COLORS.MODERN) };
    if (primaryOverride) {
        config.primary = primaryOverride;
    }
    return config;
};

/**
 * Calculate table column X positions
 */
export const getTableColumnPositions = (startX: number = 50) => {
    const cols = LAYOUT.table.columns;
    const tableWidth = LAYOUT.table.width;

    return {
        description: startX,
        quantity: startX + (tableWidth * cols.description),
        unitPrice: startX + (tableWidth * (cols.description + cols.quantity)),
        tax: startX + (tableWidth * (cols.description + cols.quantity + cols.unitPrice)),
        total: startX + (tableWidth * (cols.description + cols.quantity + cols.unitPrice + cols.tax)),
    };
};

/**
 * Format currency value
 */
export const formatCurrency = (value: number, currency: string = 'MAD'): string => {
    return `${value.toFixed(2)} ${currency}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 40): string => {
    if (text.length > maxLength) {
        return text.substring(0, maxLength - 3) + '...';
    }
    return text;
};

/**
 * Format date string
 */
export const formatDate = (date: Date | string, format: string = 'DD/MM/YYYY'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());

    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
};
