/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Theme-aware colors using CSS variables
                background: 'var(--color-background)',
                surface: 'var(--color-surface)',
                'surface-light': 'var(--color-surface-light)',
                card: 'var(--color-card)',
                accent: 'var(--color-accent)',

                text: {
                    primary: 'var(--color-text-primary)',
                    secondary: 'var(--color-text-secondary)',
                    muted: 'var(--color-text-muted)',
                },

                border: {
                    primary: 'var(--color-border-primary)',
                    secondary: 'var(--color-border-secondary)',
                },

                success: 'var(--color-success)',
                danger: 'var(--color-danger)',
                warning: 'var(--color-warning)',
                info: 'var(--color-info)',

                // Legacy colors for backward compatibility
                quanfin: {
                    blue: '#0F172A',
                    green: '#10B981',
                    dark: '#020617',
                    card: '#1E293B',
                }
            }
        },
    },
    plugins: [],
}
