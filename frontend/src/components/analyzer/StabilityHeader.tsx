
import React, { useState } from 'react';
import { Shield, Info } from 'lucide-react';

interface StabilityHeaderProps {
    symbol: string;
    name: string;
    sector: string;
    beta: number;
    volatility: number;
    marketCap: number;
    score: number;
    regime: string;
    onInfo?: () => void;
}

const StabilityHeader: React.FC<StabilityHeaderProps> = ({
    symbol,
    name,
    sector,
    beta,
    volatility,
    marketCap,
    score,
    regime,
    onInfo
}) => {
    const [logoError, setLogoError] = useState(false);
    const domain = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const logoUrl = `https://logo.clearbit.com/${domain}.com`;

    const getRegimeColor = (r: string) => {
        switch (r) {
            case 'Stable': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'Volatile': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'Distressed': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
            default: return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
        }
    };

    const formatMarketCap = (val: number) => {
        if (val >= 1e12) return `${(val / 1e12).toFixed(2)}T`;
        if (val >= 1e7) return `${(val / 1e7).toFixed(2)}Cr`;
        return val.toLocaleString();
    };

    return (
        <div className="relative overflow-hidden bg-white/90 dark:bg-[#04070d]/40 backdrop-blur-2xl border-b border-slate-200 dark:border-white/[0.08] px-8 py-5 select-none shadow-2xl">
            {/* Ambient background glow */}
            <div className={`absolute top-0 right-0 w-[500px] h-full blur-[120px] opacity-[0.35] pointer-events-none transition-colors duration-1000 ${score > 70 ? 'bg-emerald-500/40' : score > 40 ? 'bg-amber-500/30' : 'bg-rose-500/40'
                }`}></div>

            <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <div className="relative group">
                        <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-white/[0.15] border border-slate-200 dark:border-white/[0.12] flex items-center justify-center shadow-xl dark:shadow-2xl transition-all duration-500 overflow-hidden group-hover:scale-105 ${score > 70 ? 'border-emerald-500/30 dark:border-emerald-500/50' : score > 40 ? 'border-amber-500/30 dark:border-amber-500/50' : 'border-rose-500/30 dark:border-rose-500/50'
                            }`}>
                            {!logoError ? (
                                <img
                                    src={logoUrl}
                                    alt={symbol}
                                    className="w-full h-full object-contain p-1.5"
                                    onError={() => setLogoError(true)}
                                />
                            ) : (
                                <Shield className={`w-7 h-7 transition-colors duration-500 ${score > 70 ? 'text-emerald-500 dark:text-emerald-400' : score > 40 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`} />
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-4">
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter terminal-text">{symbol}</h1>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-[0.25em] ${getRegimeColor(regime)}`}>
                                {regime}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">{name}</span>
                            {onInfo && (
                                <button
                                    onClick={onInfo}
                                    className="p-1 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-sky-500 dark:hover:bg-sky-500 text-slate-500 dark:text-slate-300 hover:text-white dark:hover:text-white transition-colors"
                                    title="Detailed Analysis"
                                >
                                    <Info size={12} />
                                </button>
                            )}
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-500 ml-1"></span>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest">{sector}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-10">
                    <Metric
                        label="Risk Beta"
                        value={beta.toFixed(2)}
                        subValue={beta < 1 ? 'Defensive' : 'Aggressive'}
                        color={beta < 1 ? 'text-emerald-400' : 'text-amber-400'}
                    />
                    <Metric
                        label="Volatility"
                        value={`${volatility.toFixed(1)}%`}
                        subValue="Ann. Realized"
                        color="text-slate-900 dark:text-white"
                    />
                    <Metric
                        label="Market Cap"
                        value={formatMarketCap(marketCap)}
                        subValue="Total Value"
                        color="text-slate-900 dark:text-white"
                    />

                    <div className="h-10 w-px bg-slate-200 dark:bg-white/[0.15] mx-2"></div>

                    <div className="flex flex-col items-end min-w-[120px]">
                        <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-200 tracking-[0.25em] mb-1 flex items-center gap-1.5 ">
                            Stability Index <Info size={11} className="text-slate-400 dark:text-slate-300 hover:text-sky-500 dark:hover:text-sky-400 transition-colors cursor-help" />
                        </span>
                        <div className={`text-5xl font-black tabular-nums tracking-tighter terminal-text transition-colors duration-500 ${score > 70 ? 'text-emerald-400' : score > 40 ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                            {score}<span className="text-xl opacity-50 ml-0.5 font-bold">%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Metric = ({ label, value, subValue, color }: { label: string, value: string, subValue: string, color: string }) => (
    <div className="flex flex-col border-l border-slate-200 dark:border-white/[0.12] pl-8 first:border-0 first:pl-0">
        <span className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-200 tracking-[0.25em] mb-1">{label}</span>
        <span className={`text-2xl font-black terminal-text tabular-nums ${color}`}>{value}</span>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 mt-0.5 uppercase tracking-widest">{subValue}</span>
    </div>
);

export default StabilityHeader;
