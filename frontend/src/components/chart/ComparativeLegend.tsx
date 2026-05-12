import React from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { ComparisonSymbol } from '../../hooks/useComparativeEngine';

interface ComparativeLegendProps {
    symbols: ComparisonSymbol[];
    mainSymbol: string;
    onToggle: (symbol: string) => void;
    onRemove: (symbol: string) => void;
    onToggleScale?: (symbol: string) => void;
    onTogglePane?: (symbol: string) => void;
    isLoading: string | null;
}

const ComparativeLegend: React.FC<ComparativeLegendProps> = ({
    symbols,
    onToggle,
    onRemove,
    onToggleScale,
    onTogglePane,
    isLoading
}) => {
    if (symbols.length === 0) return null;

    return (
        <div className="absolute top-12 left-4 z-20 flex flex-col gap-1.5 pointer-events-auto">
            {symbols.map((s) => (
                <div
                    key={s.symbol}
                    className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border backdrop-blur-md transition-all ${s.visible ? 'bg-[#14181F]/80 border-slate-700/50 hover:border-slate-600' : 'bg-slate-900/40 border-transparent opacity-60'
                        }`}
                >
                    {/* Color Indicator */}
                    <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: s.color }} />

                    <div className="flex flex-col min-w-[70px]">
                        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-tight">{s.symbol}</span>
                        <div className="flex items-center gap-2 mt-[-2px]">
                            <span className="text-[10px] font-mono text-slate-400">₹{s.lastPrice.toFixed(1)}</span>
                            <span className={`text-[9px] font-bold ${s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onToggleScale && (
                            <button
                                onClick={() => onToggleScale(s.symbol)}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${s.scale === 'left' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                                title="Toggle Left/Right Axis"
                            >
                                {s.scale === 'left' ? 'LEFT' : 'RIGHT'}
                            </button>
                        )}
                        {onTogglePane && (
                            <button
                                onClick={() => onTogglePane(s.symbol)}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-colors ${s.pane === 'new' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                                title="Toggle Main/New Pane"
                            >
                                {s.pane === 'new' ? 'PANE' : 'MAIN'}
                            </button>
                        )}
                        <button
                            onClick={() => onToggle(s.symbol)}
                            className="p-1 hover:text-blue-400 text-slate-500 transition-colors"
                        >
                            {s.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button
                            onClick={() => onRemove(s.symbol)}
                            className="p-1 hover:text-red-400 text-slate-500 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>

                    {isLoading === s.symbol && (
                        <Loader2 size={12} className="animate-spin text-blue-500 ml-1" />
                    )}
                </div>
            ))}
        </div>
    );
};

export default ComparativeLegend;
