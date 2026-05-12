import React, { useMemo } from 'react';
import { TrendingUp, Binary, Activity, ChevronDown, ChevronUp, Gauge, BarChart3 } from 'lucide-react';

interface SentimentData {
    advances: number;
    declines: number;
    unchanged: number;
    fii_net: number[]; // Last 5 days
    dii_net: number[]; // Last 5 days
    conviction: number; // 0-100
}

const MarketSentimentHub: React.FC = () => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [convictionView, setConvictionView] = React.useState<'chart' | 'meter'>('meter');
    
    // Mock data based on realistic NSE scenarios
    const data: SentimentData = useMemo(() => ({
        advances: 342,
        declines: 158,
        unchanged: 45,
        fii_net: [-1240, 850, -2100, 1450, 620], // in Cr
        dii_net: [1800, 1200, 2400, 950, 1580], // in Cr
        conviction: 78.4 // Bullish
    }), []);

    // SVG Gauge Calculations
    const needleRotation = -90 + (data.conviction * 1.8); // 0-100 -> -90 to 90 degrees
    
    return (
        <div className="flex flex-col gap-4 p-4 h-auto select-none bg-surface dark:bg-surface/30 backdrop-blur-sm border-t border-border-primary animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
            {/* Header / Toggle Area */}
            <div 
                className="flex items-center justify-between cursor-pointer hover:bg-white/5 -m-2 p-2 rounded-lg transition-colors group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Activity size={14} className={`${isExpanded ? 'text-indigo-400' : 'text-text-muted'} group-hover:text-indigo-400 transition-colors`} />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-text-primary">Market Pulse</h3>
                    {isExpanded ? <ChevronUp size={12} className="text-text-muted" /> : <ChevronDown size={12} className="text-text-muted" />}
                </div>
                <div className={`${isExpanded ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-surface/50 border-white/5'} px-2 py-0.5 rounded border transition-all`}>
                    <span className={`text-[9px] font-bold ${isExpanded ? 'text-emerald-500' : 'text-text-muted'} uppercase`}>
                        {isExpanded ? 'Strong Conviction' : 'Sentiment: Bullish'}
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="flex flex-col gap-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    {/* 1. Technical Conviction (Power 10 Proxy) with Toggle */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-text-muted">
                                <Binary size={12} />
                                <span className="text-[9px] font-bold uppercase tracking-tighter">Power 10 Conviction</span>
                            </div>
                            {/* Inner View Toggle */}
                            <div className="flex items-center bg-background/50 dark:bg-background/50 border border-border-primary rounded-md p-0.5 shadow-inner">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setConvictionView('chart'); }}
                                    className={`p-1 rounded transition-all ${convictionView === 'chart' ? 'bg-indigo-500 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                >
                                    <BarChart3 size={10} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setConvictionView('meter'); }}
                                    className={`p-1 rounded transition-all ${convictionView === 'meter' ? 'bg-indigo-500 text-white shadow-lg' : 'text-text-muted hover:text-text-primary'}`}
                                >
                                    <Gauge size={10} />
                                </button>
                            </div>
                        </div>

                        {convictionView === 'chart' ? (
                            <div className="flex items-end gap-1 h-10 animate-in fade-in zoom-in-95 duration-300">
                                {[40, 65, 30, 85, 95, 75, 60, 90].map((h, i) => (
                                    <div 
                                        key={i}
                                        className={`flex-1 rounded-t-xs transition-all duration-700 relative group/bar ${i === 7 ? 'bg-indigo-500 animate-pulse' : 'bg-indigo-500/30'}`}
                                        style={{ height: `${h}%` }}
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-[8px] px-1.5 py-0.5 rounded border border-border-primary opacity-0 group-hover/bar:opacity-100 transition-opacity z-10 whitespace-nowrap tabular-nums">
                                            {h}% Strength
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center pt-1 animate-in fade-in zoom-in-95 duration-500">
                                <div className="relative w-40 h-20 overflow-hidden">
                                    <svg viewBox="0 0 100 50" className="w-full h-full">
                                        <path d="M 15 45 A 35 35 0 0 1 85 45" fill="none" stroke="currentColor" strokeWidth="6" className="text-border-primary" />
                                        <path 
                                            d="M 15 45 A 35 35 0 0 1 85 45" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="6" 
                                            strokeDasharray="110"
                                            strokeDashoffset={110 - (110 * data.conviction / 100)}
                                            className="text-indigo-500 transition-all duration-1000 drop-shadow-[0_0_3px_rgba(99,102,241,0.3)] dark:drop-shadow-[0_0_5px_rgba(99,102,241,0.6)]"
                                        />
                                        <g transform={`translate(50, 45) rotate(${needleRotation})`}>
                                            <line x1="0" y1="0" x2="0" y2="-35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-text-primary drop-shadow-[0_0_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]" />
                                            <circle cx="0" cy="0" r="2" fill="currentColor" className="text-text-primary" />
                                        </g>
                                    </svg>
                                    <div className="absolute bottom-1 left-0 right-0 text-center">
                                        <span className="text-[12px] font-black text-text-primary tabular-nums tracking-tight">{data.conviction}%</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-[7px] uppercase font-bold text-text-muted tracking-tighter tabular-nums">
                            <span>LOD</span>
                            <span className="text-indigo-400 font-extrabold group/info relative flex items-center gap-1 cursor-help">
                                Intensity Factor: +2.1 SD 
                                <Activity size={8} />
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-[8px] px-2 py-0.5 rounded border border-border-primary opacity-0 group-hover/info:opacity-100 transition-opacity z-20 whitespace-nowrap">
                                    Volume-weighted strength
                                </div>
                            </span>
                            <span>HOD</span>
                        </div>
                    </div>

                    {/* 2. Institutional Trend (Last 5 Days) */}
                    <div className="pt-2 border-t border-border-primary">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-text-muted text-[9px] font-bold uppercase tracking-tighter">
                                <TrendingUp size={12} className="text-text-muted" />
                                <span>Inst. Flow (FII/DII)</span>
                            </div>
                            <span className="text-[8px] text-text-muted italic opacity-50">T-1 Delayed</span>
                        </div>
                        <div className="flex items-end gap-2 h-14 w-full">
                            {data.fii_net.map((val, i) => {
                                const max = 3000;
                                const height = Math.abs(val / max) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full group/inst relative">
                                        <div className="flex-1 w-full bg-white/5 rounded-t-sm overflow-hidden flex flex-col justify-end">
                                            <div 
                                                className={`w-full transition-all duration-1000 ${val > 0 ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`}
                                                style={{ height: `${height}%` }}
                                            />
                                        </div>
                                        {/* Tooltip on hover */}
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-[8px] px-1.5 py-0.5 rounded border border-border-primary opacity-0 group-hover/inst:opacity-100 transition-opacity z-10 whitespace-nowrap tabular-nums">
                                            {val > 0 ? '+' : ''}{val} Cr
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-1 text-[7px] uppercase font-black text-text-muted tracking-widest opacity-40">
                            <span>5D ago</span>
                            <span>Yesterday</span>
                        </div>
                    </div>

                    {/* Insight Action */}
                    <div className="bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10 mt-1">
                        <p className="text-[9px] text-indigo-200/80 leading-relaxed">
                            <span className="font-bold text-indigo-400 uppercase mr-1">Signal:</span> 
                            Institutional conviction is <span className="text-white font-bold underline underline-offset-2 decoration-indigo-500">Strong</span>. 
                            Price action suggest EOD FII inflows.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketSentimentHub;
