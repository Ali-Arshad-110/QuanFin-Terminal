import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode, Theme } from './theme.config';
import { themes, DEFAULT_THEME, applyTheme } from './theme.config';

interface ThemeContextType {
    currentTheme: Theme;
    themeMode: ThemeMode;
    setTheme: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'quanfin-theme';

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Load theme from localStorage or use default
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        // Ensure saved value is valid with new modes
        if (saved === 'dark' || saved === 'light') return saved;
        return DEFAULT_THEME;
    });

    const currentTheme = themes[themeMode];

    // Apply theme whenever it changes
    useEffect(() => {
        applyTheme(currentTheme);

        // Add smooth transition class
        document.documentElement.classList.add('theme-transitioning');

        // Remove transition class after animation completes
        const timer = setTimeout(() => {
            document.documentElement.classList.remove('theme-transitioning');
        }, 150);

        return () => clearTimeout(timer);
    }, [currentTheme]);

    // Save theme to localStorage
    useEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    }, [themeMode]);

    const setTheme = (mode: ThemeMode) => {
        setThemeMode(mode);
    };

    const toggleTheme = () => {
        setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ currentTheme, themeMode, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom hook to use theme
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

