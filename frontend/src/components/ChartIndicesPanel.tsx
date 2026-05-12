import React from 'react';
import { useTheme } from '../theme/ThemeProvider';

interface IndexEntry {
    label: string;
    symbol: string;
    exchange: 'NSE' | 'BSE';
}

const NSE_INDICES: IndexEntry[] = [
    { label: 'NIFTY 50', symbol: 'NIFTY 50', exchange: 'NSE' },
    { label: 'NIFTY BANK', symbol: 'NIFTY BANK', exchange: 'NSE' },
    { label: 'NIFTY IT', symbol: 'NIFTY IT', exchange: 'NSE' },
    { label: 'NIFTY AUTO', symbol: 'NIFTY AUTO', exchange: 'NSE' },
    { label: 'NIFTY FMCG', symbol: 'NIFTY FMCG', exchange: 'NSE' },
    { label: 'NIFTY PHARMA', symbol: 'NIFTY PHARMA', exchange: 'NSE' },
    { label: 'NIFTY METAL', symbol: 'NIFTY METAL', exchange: 'NSE' },
    { label: 'NIFTY REALTY', symbol: 'NIFTY REALTY', exchange: 'NSE' },
    { label: 'NIFTY MIDCAP', symbol: 'NIFTY MIDCAP 50', exchange: 'NSE' },
    { label: 'INDIA VIX', symbol: 'INDIA VIX', exchange: 'NSE' },
];

const BSE_INDICES: IndexEntry[] = [
    { label: 'SENSEX', symbol: 'SENSEX', exchange: 'BSE' },
    { label: 'BSE Mid Cap', symbol: 'BSE MIDCAP', exchange: 'BSE' },
    { label: 'BSE Sm Cap', symbol: 'BSE SMALLCAP', exchange: 'BSE' },
    { label: 'BSE 100', symbol: 'BSE 100', exchange: 'BSE' },
    { label: 'BSE 200', symbol: 'BSE 200', exchange: 'BSE' },
];

interface Props {
    onIndexClick: (symbol: string) => void;
    activeSymbol?: string;
}

// price cache shared across renders
const priceCache: Record<string, { price: number; change: number; pct: number }> = {};

const IndexRow: React.FC<{
    entry: IndexEntry;
    isActive: boolean;
    onClick: () => void;
    isDark: boolean;
}> = ({ entry, isActive, onClick, isDark }) => {
    const cached = priceCache[entry.symbol];
    const isUp = (cached?.pct ?? 0) >= 0;

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all ${isActive
                ? (isDark ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-blue-50 border border-blue-200')
                : (isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-100')
                }`}
        >
            <span className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'} ${isActive ? (isDark ? '!text-blue-400' : '!text-blue-600') : ''}`}>
                {entry.label}
            </span>
            {cached ? (
                <div className="flex flex-col items-end shrink-0 ml-1">
                    <span className={`text-[10px] font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {cached.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[9px] ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isUp ? '+' : ''}{cached.pct.toFixed(2)}%
                    </span>
                </div>
            ) : (
                <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>—</span>
            )}
        </button>
    );
};

const SectionHeader: React.FC<{ label: string; isDark: boolean }> = ({ label, isDark }) => (
    <div className={`flex items-center gap-1.5 px-2 py-1 mt-2`}>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
        <div className={`flex-1 h-px ${isDark ? 'bg-slate-700/60' : 'bg-slate-200'}`}></div>
    </div>
);

const ChartIndicesPanel: React.FC<Props> = ({ onIndexClick, activeSymbol }) => {
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');

    return (
        <div className={`w-[140px] flex-shrink-0 flex flex-col h-full border-l ${isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-slate-200 bg-white/60'} overflow-y-auto`}>
            <div className={`sticky top-0 px-2 py-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400 bg-slate-900/80' : 'text-slate-500 bg-white/80'} backdrop-blur-sm border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'} z-10`}>
                Indices
            </div>

            <div className="flex flex-col gap-0.5 p-1.5">
                <SectionHeader label="NSE" isDark={isDark} />
                {NSE_INDICES.map(idx => (
                    <IndexRow key={idx.symbol} entry={idx} isActive={activeSymbol === idx.symbol} onClick={() => onIndexClick(idx.symbol)} isDark={isDark} />
                ))}

                <SectionHeader label="BSE" isDark={isDark} />
                {BSE_INDICES.map(idx => (
                    <IndexRow key={idx.symbol} entry={idx} isActive={activeSymbol === idx.symbol} onClick={() => onIndexClick(idx.symbol)} isDark={isDark} />
                ))}
            </div>
        </div>
    );
};

export default ChartIndicesPanel;
