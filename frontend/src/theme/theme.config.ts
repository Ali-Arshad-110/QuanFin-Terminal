// Theme Configuration for QuanFin Terminal
// Bloomberg-grade professional themes

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
    // Background colors
    background: string;
    surface: string;
    surfaceLight: string;
    card: string;
    accent: string;

    // Text colors
    text: {
        primary: string;
        secondary: string;
        muted: string;
    };

    // Border colors
    border: {
        primary: string;
        secondary: string;
    };

    // Semantic colors (Color Psychology)
    semantic: {
        success: string;      // Green - Buy, Profit, Positive
        danger: string;       // Red - Sell, Loss, Negative
        warning: string;      // Yellow/Orange - Alert, Risk
        info: string;         // Blue/Grey - Neutral, Info
    };

    // Chart-specific colors
    chart: {
        background: string;
        grid: string;
        candleUp: string;
        candleDown: string;
        volumeUp: string;
        volumeDown: string;
        crosshair: string;
        text: string;
    };
}

export interface Theme {
    mode: ThemeMode;
    name: string;
    description: string;
    colors: ThemeColors;
}

// Dark Professional Theme (Default)
// Low-eye-strain, optimized for charts and order books
export const darkTheme: Theme = {
    mode: 'dark',
    name: 'Dark Professional',
    description: 'Low-eye-strain colors optimized for charts and trading',
    colors: {
        background: '#05070a',      // Deep Carbon
        surface: '#0a0f1e',         // Custom deep navy-slate
        surfaceLight: '#1e293b',    // Slate-800
        card: '#111827',            // Slate-900
        accent: '#6366f1',          // Indigo-500

        text: {
            primary: '#ffffff',       // Pure White
            secondary: '#e2e8f0',     // UHC: slate-200
            muted: '#cbd5e1',         // UHC: slate-300
        },

        border: {
            primary: '#1e293b',       // Slate-800
            secondary: '#0f172a',     // Slate-900
        },

        semantic: {
            success: '#10b981',       // Emerald-500
            danger: '#f43f5e',        // Rose-500
            warning: '#f59e0b',       // Amber-500
            info: '#0ea5e9',          // Sky-500
        },

        chart: {
            background: 'transparent',
            grid: 'rgba(255,255,255,0.12)', // Sharp Grids
            candleUp: '#10b981',
            candleDown: '#f43f5e',
            volumeUp: 'rgba(16, 185, 129, 0.5)',
            volumeDown: 'rgba(244, 63, 94, 0.5)',
            crosshair: 'rgba(255,255,255,0.5)', // Sharp Crosshair
            text: '#cbd5e1', // High Contrast Chart Text
        },
    },
};

// Light Research Theme
// High-contrast text, optimized for fundamentals and reports
export const lightTheme: Theme = {
    mode: 'light',
    name: 'Light Research',
    description: 'High-contrast mode for reading reports and fundamentals',
    colors: {
        background: '#FFFFFF',      // Pure white
        surface: '#F8FAFC',         // Slate-50
        surfaceLight: '#F1F5F9',    // Slate-100
        card: '#FFFFFF',            // Pure white
        accent: '#4f46e5',          // Indigo-600

        text: {
            primary: '#0F172A',       // Slate-900
            secondary: '#334155',     // Slate-700 (Very Dark)
            muted: '#475569',         // Slate-600 (Dark)
        },

        border: {
            primary: '#CBD5E1',       // Slate-300 (Sharper)
            secondary: '#E2E8F0',     // Slate-200 (Sharper)
        },

        semantic: {
            success: '#059669',       // Emerald-600
            danger: '#DC2626',        // Red-600
            warning: '#D97706',       // Amber-600
            info: '#4f46e5',          // Indigo-600
        },

        chart: {
            background: '#FFFFFF',
            grid: '#F1F5F9',
            candleUp: '#059669',
            candleDown: '#DC2626',
            volumeUp: '#05966980',
            volumeDown: '#DC262680',
            crosshair: '#64748B',
            text: '#475569',
        },
    },
};

// All themes collection
export const themes: Record<ThemeMode, Theme> = {
    'dark': darkTheme,
    'light': lightTheme,
};

// Default theme
export const DEFAULT_THEME: ThemeMode = 'dark';

// Apply theme to document root
export const applyTheme = (theme: Theme) => {
    const root = document.documentElement;

    // Background colors
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-surface-light', theme.colors.surfaceLight);
    root.style.setProperty('--color-card', theme.colors.card);
    root.style.setProperty('--color-accent', theme.colors.accent);

    // Text colors
    root.style.setProperty('--color-text-primary', theme.colors.text.primary);
    root.style.setProperty('--color-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--color-text-muted', theme.colors.text.muted);

    // Border colors
    root.style.setProperty('--color-border-primary', theme.colors.border.primary);
    root.style.setProperty('--color-border-secondary', theme.colors.border.secondary);

    // Semantic colors
    root.style.setProperty('--color-success', theme.colors.semantic.success);
    root.style.setProperty('--color-danger', theme.colors.semantic.danger);
    root.style.setProperty('--color-warning', theme.colors.semantic.warning);
    root.style.setProperty('--color-info', theme.colors.semantic.info);

    // Chart colors
    root.style.setProperty('--color-chart-background', theme.colors.chart.background);
    root.style.setProperty('--color-chart-grid', theme.colors.chart.grid);
    root.style.setProperty('--color-chart-candle-up', theme.colors.chart.candleUp);
    root.style.setProperty('--color-chart-candle-down', theme.colors.chart.candleDown);
    root.style.setProperty('--color-chart-volume-up', theme.colors.chart.volumeUp);
    root.style.setProperty('--color-chart-volume-down', theme.colors.chart.volumeDown);
    root.style.setProperty('--color-chart-crosshair', theme.colors.chart.crosshair);
    root.style.setProperty('--color-chart-text', theme.colors.chart.text);

    // Dark/Light class for Tailwind or standard CSS targeting
    if (theme.mode === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }
};

