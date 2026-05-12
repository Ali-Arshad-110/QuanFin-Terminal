import React, { useState, useMemo } from 'react';
import { stockDomains } from '../data/stockDomains';

// Helper: Guess domain from name for logo
const guessDomain = (name: string) => {
    if (!name) return '';
    const clean = name.toLowerCase()
        .replace(/ limited| ltd| india| industries| technologies| bank| finance| services| corporation| corp/g, '')
        .replace(/[.,]/g, '')
        .trim()
        .replace(/ /g, '');
    return `${clean}.com`;
};

interface StockLogoProps {
    symbol: string;
    name?: string;
    size?: number;
    className?: string;
}

const StockLogo: React.FC<StockLogoProps> = ({ symbol, name = '', size = 5, className = '' }) => {
    // Provider chain: 0=Clearbit, 1=logo.dev, 2=Google Favicon, 3+=fallback badge
    const [providerIndex, setProviderIndex] = useState(0);

    const cleanSymbol = useMemo(() => symbol.split('.')[0].toUpperCase(), [symbol]);

    // Deterministic color for fallback badge
    const seed = cleanSymbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    const colorClass = colors[seed % colors.length];

    const domain = useMemo(() => {
        if (stockDomains && stockDomains[cleanSymbol]) return stockDomains[cleanSymbol];
        return guessDomain(name || cleanSymbol);
    }, [cleanSymbol, name]);

    // 3-tier provider chain for maximum logo coverage
    const logoUrls = [
        `https://logo.clearbit.com/${domain}`,
        `https://img.logo.dev/${domain}?token=pk_X6kd_IB2QvmcSJ4Z5PlMKA`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    ];

    const handleError = () => setProviderIndex(prev => prev + 1);

    // All providers exhausted — show colored initial badge
    if (providerIndex >= logoUrls.length || !domain) {
        return (
            <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-none ${colorClass} ${className}`}>
                {cleanSymbol[0]}
            </div>
        );
    }

    return (
        <img
            src={logoUrls[providerIndex]}
            alt={cleanSymbol}
            className={`w-${size} h-${size} rounded-[4px] object-contain flex-none bg-white p-0.5 border border-white/10 ${className}`}
            onError={handleError}
        />
    );
};

export default StockLogo;
