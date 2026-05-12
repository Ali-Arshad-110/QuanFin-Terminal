import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import StockLogo from '../../StockLogo';

interface TerminalHeaderProps {
    symbol: string;
    compareSymbol?: string;
    name?: string;
    sector?: string;
    price: number | string;
    change: number | string;
    changePercent: number | string;
    volume: string;
    prevClose: number | string;
    open: number | string;
    high: number | string;
    low: number | string;
    marketCap: string;
    pe: number | string;
    eps: number | string;
    div: number | string;
    stabilityScore?: number;
    onSettingsChange?: (key: string, value: boolean) => void;
    onBack?: () => void;
    panelVisibility?: { watchlist: boolean, indices: boolean, fundamentals: boolean, sunburst: boolean };
}

const TerminalHeader: React.FC<TerminalHeaderProps> = (props) => {
    const {
        symbol, compareSymbol, sector, price, change, changePercent,
        prevClose, high, low,
        stabilityScore
    } = props;

    const isPositive = Number(change) >= 0;
    const isPos = isPositive;


    return (
        <div className="relative flex flex-col w-full bg-surface border-b border-border-primary select-none shrink-0" style={{ zIndex: 9999 }}>
            {/* Top Bar: Ticker, Core Metrics, and Actions */}
            <div className="relative flex justify-between items-center px-4 py-1 border-b border-border-primary bg-card/50" style={{ zIndex: 10000 }}>
                <div className="flex items-center gap-6">
                    {/* Redundant Home block removed per request */}

                    {/* Quick Metric summary */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <StockLogo symbol={symbol} size={6} className="shadow-sm" />
                                <span className="text-[14px] font-bold text-text-primary tracking-wide">{symbol}</span>
                                {compareSymbol && compareSymbol !== 'NONE' && compareSymbol !== 'CUSTOM' && (
                                    <>
                                        <span className="text-[14px] font-bold text-blue-500 mx-1">⇄</span>
                                        <span className="text-[14px] font-bold text-text-primary tracking-wide">{compareSymbol}</span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                {sector && <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1 rounded">{sector}</span>}
                            </div>
                        </div>
                        <div className="h-6 w-[1px] bg-border-primary mx-1"></div>
                        <div className="flex items-center gap-2 text-text-secondary">
                            <span className="text-lg font-mono font-bold text-text-primary tracking-tight">₹{price}</span>
                            <div className={`flex items-center gap-1 text-[11px] font-black ${isPos ? 'text-success' : 'text-danger'} drop-shadow-sm`}>
                                {isPos ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
                                {change} ({changePercent}%)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Centered: stat chips */}
                {!props.panelVisibility || props.panelVisibility.fundamentals !== false ? (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3" style={{ zIndex: 10001 }}>

                        {/* Stability Score Chip */}
                        {stabilityScore !== undefined && (
                            <div
                                className="flex flex-col items-center px-3 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shadow-sm cursor-pointer hover:bg-indigo-500/20 transition-all group"
                                onClick={() => document.getElementById('dashboard-heatmap-view')?.scrollIntoView({ behavior: 'smooth' })}
                                title="Jump to Analytics"
                            >
                                <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider group-hover:text-indigo-300">Stability Index</span>
                                <span className={`text-[12px] font-black ${stabilityScore > 70 ? 'text-emerald-400' : stabilityScore > 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                                    {stabilityScore.toFixed(1)}%
                                </span>
                            </div>
                        )}

                        {/* Inline stat chips: Prev Close | Day High | Day Low */}
                        <div className="flex items-center gap-1 text-[10px] font-mono">
                            <div className="flex flex-col items-center px-2 py-0.5 rounded bg-slate-800/70 border border-slate-700/50">
                                <span className="text-[8px] text-slate-500 font-bold uppercase">Prev</span>
                                <span className="text-slate-200">₹{prevClose}</span>
                            </div>
                            <div className="flex flex-col items-center px-2 py-0.5 rounded bg-emerald-900/30 border border-emerald-700/30">
                                <span className="text-[8px] text-emerald-500 font-bold uppercase">High</span>
                                <span className="text-emerald-300">₹{high}</span>
                            </div>
                            <div className="flex flex-col items-center px-2 py-0.5 rounded bg-red-900/30 border border-red-700/30">
                                <span className="text-[8px] text-red-500 font-bold uppercase">Low</span>
                                <span className="text-red-300">₹{low}</span>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Settings controls are consolidated into the global settings (top header). */}
            </div>

        </div>
    );
};

export default TerminalHeader;
