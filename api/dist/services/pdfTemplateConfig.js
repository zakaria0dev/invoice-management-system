"use strict";
/**
 * PDF Template Configuration
 * Centralized configuration for all PDF template styling and layout
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = exports.truncateText = exports.formatPercentage = exports.formatCurrency = exports.getTableColumnPositions = exports.getThemeConfig = exports.getThemeColor = exports.LAYOUT = exports.TYPOGRAPHY = exports.UI_COLORS = exports.THEME_COLORS = void 0;
const pdf_lib_1 = require("pdf-lib");
exports.THEME_COLORS = {
    MODERN: {
        primary: (0, pdf_lib_1.rgb)(0.05, 0.4, 0.65), // #0D66A6 - Professional blue
        secondary: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2), // #333333 - Dark gray
        accent: (0, pdf_lib_1.rgb)(0.0, 0.45, 0.55) // #00738C - Teal highlight
    },
    CLASSIC: {
        primary: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2), // #333333 - Charcoal gray
        secondary: (0, pdf_lib_1.rgb)(0.3, 0.3, 0.3), // #4D4D4D - Medium gray
        accent: (0, pdf_lib_1.rgb)(0.0, 0.0, 0.0) // #000000 - Black accent
    },
    MINIMALIST: {
        primary: (0, pdf_lib_1.rgb)(0.15, 0.15, 0.15), // #262626 - Soft black
        secondary: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5), // #808080 - Medium gray
        accent: (0, pdf_lib_1.rgb)(0.7, 0.7, 0.7) // #B2B2B2 - Light gray accent
    },
    BOLD: {
        primary: (0, pdf_lib_1.rgb)(0.43, 0.22, 0.79), // #6E38C9 - Vibrant purple
        secondary: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2), // #333333 - Dark gray
        accent: (0, pdf_lib_1.rgb)(0.82, 0.21, 0.26) // #D13438 - Red highlight
    },
    ELEGANT: {
        primary: (0, pdf_lib_1.rgb)(0.0, 0.45, 0.55), // #00738C - Teal
        secondary: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2), // #333333 - Dark gray
        accent: (0, pdf_lib_1.rgb)(0.82, 0.51, 0.11) // #D18319 - Gold accent
    }
};
// ============================================================================
// UI COLORS
// ============================================================================
exports.UI_COLORS = {
    background: (0, pdf_lib_1.rgb)(0.97, 0.97, 0.97), // #F7F7F7 - Light gray background
    mediumGray: (0, pdf_lib_1.rgb)(0.5, 0.5, 0.5), // #808080 - Medium text
    border: (0, pdf_lib_1.rgb)(0.9, 0.9, 0.9), // #E6E6E6 - Border color
    lightBorder: (0, pdf_lib_1.rgb)(0.95, 0.95, 0.95), // #F2F2F2 - Subtle border
    white: (0, pdf_lib_1.rgb)(1, 1, 1), // #FFFFFF - Pure white
    black: (0, pdf_lib_1.rgb)(0, 0, 0), // #000000 - Pure black
    darkGray: (0, pdf_lib_1.rgb)(0.2, 0.2, 0.2), // #333333 - Dark gray text
    lightGray: (0, pdf_lib_1.rgb)(0.7, 0.7, 0.7), // #B2B2B2 - Light gray text
};
// ============================================================================
// TYPOGRAPHY CONFIGURATION
// ============================================================================
exports.TYPOGRAPHY = {
    // Document title
    title: {
        size: 28,
        weight: 'bold'
    },
    // Section headers
    sectionHeader: {
        size: 14,
        weight: 'bold'
    },
    // Column headers and labels
    header: {
        size: 12,
        weight: 'bold'
    },
    // Body text
    body: {
        size: 11,
        weight: 'normal'
    },
    // Smaller body text
    bodySmall: {
        size: 10,
        weight: 'normal'
    },
    // Footnotes and captions
    small: {
        size: 9,
        weight: 'normal'
    },
    // Minimal text
    footnote: {
        size: 8,
        weight: 'normal'
    }
};
// ============================================================================
// LAYOUT CONFIGURATION
// ============================================================================
exports.LAYOUT = {
    // Page dimensions (Letter size: 8.5" x 11")
    pageWidth: 612, // pixels
    pageHeight: 792, // pixels
    // Margins (in pixels)
    margins: {
        top: 50, // 0.694"
        bottom: 50, // 0.694"
        left: 45, // 0.625"
        right: 45, // 0.625"
    },
    // Content area
    contentWidth: 522, // 612 - 45 - 45
    contentHeight: 692, // 792 - 50 - 50
    // Spacing between elements
    spacing: {
        section: 25, // Between major sections
        element: 15, // Between elements within sections
        line: 12, // Line height
        compact: 8, // Compact spacing
    },
    // Logo sizing
    logo: {
        width: 80,
        height: 80,
        bgWidth: 90, // Background box width
        bgHeight: 90, // Background box height
        margin: 10, // Margin from text
    },
    // Header section
    header: {
        height: 120, // Total header height
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
            description: 0.35, // 35%
            quantity: 0.10, // 10%
            unitPrice: 0.15, // 15%
            tax: 0.15, // 15%
            total: 0.20, // 20%
        }
    },
    // Section dimensions
    sections: {
        documentMetadata: 60,
        clientInfo: 80,
        items: 'dynamic', // Height depends on items count
        totals: 120,
        payments: 80,
        legalMentions: 'dynamic',
    }
};
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Get theme color for specific theme
 */
const getThemeColor = (themeName = 'MODERN', override) => {
    if (override)
        return override;
    return exports.THEME_COLORS[themeName]?.primary || exports.THEME_COLORS.MODERN.primary;
};
exports.getThemeColor = getThemeColor;
/**
 * Get full theme configuration
 */
const getThemeConfig = (themeName = 'MODERN', primaryOverride) => {
    const config = { ...(exports.THEME_COLORS[themeName] || exports.THEME_COLORS.MODERN) };
    if (primaryOverride) {
        config.primary = primaryOverride;
    }
    return config;
};
exports.getThemeConfig = getThemeConfig;
/**
 * Calculate table column X positions
 */
const getTableColumnPositions = (startX = 50) => {
    const cols = exports.LAYOUT.table.columns;
    const tableWidth = exports.LAYOUT.table.width;
    return {
        description: startX,
        quantity: startX + (tableWidth * cols.description),
        unitPrice: startX + (tableWidth * (cols.description + cols.quantity)),
        tax: startX + (tableWidth * (cols.description + cols.quantity + cols.unitPrice)),
        total: startX + (tableWidth * (cols.description + cols.quantity + cols.unitPrice + cols.tax)),
    };
};
exports.getTableColumnPositions = getTableColumnPositions;
/**
 * Format currency value
 */
const formatCurrency = (value, currency = 'MAD') => {
    return `${value.toFixed(2)} ${currency}`;
};
exports.formatCurrency = formatCurrency;
/**
 * Format percentage
 */
const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`;
};
exports.formatPercentage = formatPercentage;
/**
 * Truncate text with ellipsis
 */
const truncateText = (text, maxLength = 40) => {
    if (text.length > maxLength) {
        return text.substring(0, maxLength - 3) + '...';
    }
    return text;
};
exports.truncateText = truncateText;
/**
 * Format date string
 */
const formatDate = (date, format = 'DD/MM/YYYY') => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());
    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year);
};
exports.formatDate = formatDate;
