import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

const ThemeToggle: React.FC = () => {
    const { themeMode, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-1.5 bg-surface hover:bg-card text-text-muted hover:text-text-primary rounded border border-border-primary transition-all flex items-center justify-center shadow-sm"
            title={themeMode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
            {themeMode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
    );
};

export default ThemeToggle;
