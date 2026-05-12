import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, X, RefreshCw, ArrowUpRight, ArrowDownRight, LayoutGrid } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../theme/ThemeProvider';

interface IndexData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    change_percent: number;
}

interface Constituent {
    symbol: string;
    name: string;
    sector: string;
    ltp: number;
    change: number;
    changePercent: number;
    marketCap: number;
    volume: number;
    avgVolume?: number;
    value?: number;
}

interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface PanelProps {
    indexDef: { symbol: string; name: string };
    data: IndexData;
    anchorRect: DOMRect;
    onClose: () => void;
    onNavigateToChart?: (symbol: string) => void;
}

/* ─── Interactive SVG Area Chart ─────────────────────────────────────────── */
const AreaChart: React.FC<{ candles: Candle[]; isUp: boolean }> = ({ candles, isUp }) => {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    if (candles.length < 2) return (
        <div className="w-full h-full flex items-center justify-center text-text-muted text-xs bg-surface/20 rounded-xl">
            <RefreshCw size={16} className="animate-spin mr-2" /> Loading chart…
        </div>
    );

    const W = 1000, H = 200;
    const padding = { top: 20, bottom: 20, left: 0, right: 0 };
    const chartH = H - padding.top - padding.bottom;

    const prices = candles.map(c => c.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const step = W / (prices.length - 1);

    const toY = (v: number) => H - padding.bottom - ((v - min) / range) * chartH;
    const pts = prices.map((p, i) => `${(i * step).toFixed(1)},${toY(p).toFixed(1)}`).join(' ');
    const pathD = prices.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${toY(p).toFixed(1)}`).join(' ');
    const { currentTheme } = useTheme();
    const color = isUp ? currentTheme.colors.chart.candleUp : currentTheme.colors.chart.candleDown;
    const fillId = `fill-full-${isUp ? 'up' : 'dn'}`;

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * W;
        const idx = Math.round(x / step);
        if (idx >= 0 && idx < candles.length) {
            setHoverIdx(idx);
        }
    };

    const activeCandle = hoverIdx !== null ? candles[hoverIdx] : candles[candles.length - 1];
    const hoverX = hoverIdx !== null ? hoverIdx * step : (candles.length - 1) * step;
    const hoverY = toY(activeCandle.close);

    const formatTime = (t: number) => {
        const d = new Date(t * 1000);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (t: number) => {
        const d = new Date(t * 1000);
        return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
    };

    return (
        <div className="relative w-full h-full" onMouseLeave={() => setHoverIdx(null)}>
            <svg
                ref={svgRef}
                width="100%" height="100%"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                className="overflow-visible cursor-crosshair"
                onMouseMove={handleMouseMove}
            >
                <defs>
                    <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                    </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                    const y = padding.top + pct * chartH;
                    return <line key={i} x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
                })}

                <path d={`${pathD} L${W},${H} L0,${H} Z`} fill={`url(#${fillId})`} />
                <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />

                {/* Crosshair */}
                {hoverIdx !== null && (
                    <>
                        <line x1={hoverX} y1="0" x2={hoverX} y2={H} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4,4" />
                        <line x1="0" y1={hoverY} x2={W} y2={hoverY} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4,4" />
                        <circle cx={hoverX} cy={hoverY} r="6" fill={color} stroke="#0f172a" strokeWidth="2" />
                    </>
                )}

                {/* Last price dot when not hovering */}
                {hoverIdx === null && (
                    <circle cx={(candles.length - 1) * step} cy={toY(candles[candles.length - 1].close)} r="4" fill={color} stroke="#0f172a" strokeWidth="2" />
                )}
            </svg>

            {/* Tooltip Overlay */}
            {hoverIdx !== null && (
                <div
                    className="absolute pointer-events-none bg-card/95 border border-border-primary px-2.5 py-1.5 rounded-lg shadow-2xl z-20 flex flex-col gap-0.5 backdrop-blur-sm"
                    style={{
                        left: Math.min(hoverX / W * 100, 85) + '%',
                        top: Math.max(hoverY - 60, 10),
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className="text-[10px] text-text-muted font-bold uppercase tracking-tighter">
                        {formatDate(activeCandle.time)} {formatTime(activeCandle.time)}
                    </div>
                    <div className="text-sm font-black text-text-primary font-mono">
                        {activeCandle.close.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            )}
        </div>
    );
};

const RangeBar: React.FC<{ low: number; high: number; current: number; label: string }> = ({ low, high, current, label }) => {
    const pct = high === low ? 50 : Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
    return (
        <div className="space-y-1.5 flex-1 min-w-[200px]">
            <div className="flex justify-between items-center">
                <span className="text-[10px] text-text-muted uppercase font-extrabold tracking-wider">{label}</span>
                <span className="text-[10px] text-text-secondary font-mono font-bold bg-card border border-border-primary px-1.5 py-0.5 rounded">
                    {current.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-[10px] text-text-muted font-mono text-right shrink-0">
                    {low.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="flex-1 h-2 rounded-full relative bg-card shadow-inner border border-border-secondary">
                    <div className="absolute inset-0 rounded-full opacity-40 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500" />
                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-4 border-border-primary shadow-lg transition-all duration-300"
                        style={{ left: `calc(${pct}% - 8px)` }} />
                </div>
                <div className="text-[10px] text-text-muted font-mono shrink-0">
                    {high.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
            </div>
        </div>
    );
};

const ReturnTile: React.FC<{ label: string; value: number | null }> = ({ label, value }) => {
    if (value === null) return (
        <div className="rounded-xl border border-border-secondary p-3 text-center bg-surface/30">
            <div className="text-[10px] text-text-muted uppercase font-bold">{label}</div>
            <div className="h-5 w-12 mx-auto mt-1.5 bg-card animate-pulse rounded" />
        </div>
    );
    const isUp = value >= 0;
    return (
        <div className={`rounded-xl border p-3 text-center transition-all hover:scale-[1.05] shadow-sm
            ${isUp ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10'}`}>
            <div className="text-[10px] text-text-muted uppercase font-extrabold">{label}</div>
            <div className={`text-sm font-black font-mono mt-1 ${isUp ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                {isUp ? '+' : ''}{value.toFixed(2)}%
            </div>
        </div>
    );
};

/* ─── Main IndexDetailPanel ─────────────────────────────────────────────── */

const IndexDetailPanel: React.FC<PanelProps> = ({ indexDef, data, onClose, onNavigateToChart }) => {
    const [dailyCandles, setDailyCandles] = useState<Candle[]>([]);
    const [chartCandles, setChartCandles] = useState<Candle[]>([]);
    const [constituents, setConstituents] = useState<Constituent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');
    const [timeframe, setTimeframe] = useState<'1D' | '5D' | '1M' | '1Y'>('1D');

    const isUp = data.change >= 0;
    const tcolor = isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

    // Fetch initial daily data and constituents once
    useEffect(() => {
        let dc = false;
        const sym = encodeURIComponent(indexDef.symbol);

        axios.get(`http://127.0.0.1:8000/api/v1/analyze/${sym}?interval=1d`)
            .then(res => !dc && setDailyCandles((res.data?.data ?? []).map((c: any) => ({
                time: c.time ?? c.timestamp ?? 0,
                open: c.open ?? c.Open ?? 0,
                high: c.high ?? c.High ?? 0,
                low: c.low ?? c.Low ?? 0,
                close: c.close ?? c.Close ?? 0,
            }))));

        axios.get(`http://127.0.0.1:8000/api/v1/network-map/constituents/${sym}`)
            .then(res => !dc && setConstituents(res.data?.constituents ?? []));

        return () => { dc = true; };
    }, [indexDef.symbol]);

    // Fetch chart data when timeframe changes
    useEffect(() => {
        let dc = false;
        const sym = encodeURIComponent(indexDef.symbol);
        setLoading(true);

        const params = {
            '1D': { interval: '5m' },
            '5D': { interval: '15m' },
            '1M': { interval: '1h' },
            '1Y': { interval: '1d' }
        };

        axios.get(`http://127.0.0.1:8000/api/v1/analyze/${sym}?interval=${params[timeframe].interval}`)
            .then(res => {
                if (dc) return;
                const mapped = (res.data?.data ?? []).map((c: any) => ({
                    time: c.time ?? c.timestamp ?? 0,
                    open: c.open ?? c.Open ?? 0,
                    high: c.high ?? c.High ?? 0,
                    low: c.low ?? c.Low ?? 0,
                    close: c.close ?? c.Close ?? 0,
                }));
                setChartCandles(mapped);
                setLoading(false);
            })
            .catch(() => !dc && setLoading(false));

        return () => { dc = true; };
    }, [indexDef.symbol, timeframe]);

    // Derived stats
    const last252Count = Math.min(dailyCandles.length, 252);
    const last252Arr = dailyCandles.slice(-last252Count);
    const w52High = last252Arr.length ? Math.max(...last252Arr.map(c => c.high)) : 0;
    const w52Low = last252Arr.length ? Math.min(...last252Arr.map(c => c.low)) : 0;

    // Intraday range from chart data if 1D
    const intradayCandles = timeframe === '1D' ? chartCandles : chartCandles.slice(-75); // approx 1 day of 5m
    const todayHigh = intradayCandles.length ? Math.max(...intradayCandles.map(c => c.high)) : 0;
    const todayLow = intradayCandles.length ? Math.min(...intradayCandles.map(c => c.low)) : 0;
    const todayOpen = intradayCandles[0]?.open ?? 0;
    const prevClose = data.price - data.change;

    // Movers (Top 10)
    const sortedMovers = useMemo(() => [...constituents].sort((a, b) => b.changePercent - a.changePercent), [constituents]);
    const gainers = sortedMovers.slice(0, 10);
    const losers = [...sortedMovers].reverse().slice(0, 10);
    const activeMoves = activeTab === 'gainers' ? gainers : losers;

    // Heatmap (Sorted Bullish First)
    const sortedConstituents = useMemo(() => [...constituents].sort((a, b) => b.changePercent - a.changePercent), [constituents]);

    const returnFor = (days: number) => {
        if (dailyCandles.length < days + 1) return null;
        const past = dailyCandles[dailyCandles.length - 1 - days]?.close;
        if (!past) return null;
        return ((data.price - past) / past) * 100;
    };

    const advanceCount = constituents.filter(c => c.changePercent > 0).length;
    const declineCount = constituents.filter(c => c.changePercent < 0).length;
    const unchangedCount = constituents.length - advanceCount - declineCount;

    return createPortal(
        <div className="fixed inset-x-0 bottom-0 top-14 z-[100] bg-background flex flex-col overflow-hidden animate-slide-up transition-colors duration-300">

            {/* ── Header Area ── */}
            <div className="flex-none bg-surface border-b border-border-secondary px-6 py-5 flex items-start justify-between">
                <div className="flex items-center gap-10">
                    <div>
                        <h1 className="text-sm font-black text-text-muted uppercase tracking-[0.2em] mb-1">{indexDef.name} Overview</h1>
                        <div className={`text-4xl font-black font-mono tracking-tighter ${tcolor}`}>
                            {data.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                            {isUp ? <TrendingUp size={18} className="text-emerald-600 dark:text-emerald-500" /> : <TrendingDown size={18} className="text-rose-600 dark:text-rose-500" />}
                            <span className={`text-lg font-bold font-mono ${tcolor}`}>
                                {isUp ? '+' : ''}{data.change.toFixed(2)}
                            </span>
                            <span className={`text-xs font-black px-2.5 py-1 rounded-full ${isUp ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500' : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-500'}`}>
                                {isUp ? '+' : ''}{data.change_percent.toFixed(2)}%
                            </span>
                        </div>
                        {onNavigateToChart && (
                            <button
                                onClick={() => onNavigateToChart(indexDef.name)}
                                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-black tracking-widest uppercase transition-colors shadow-lg active:scale-95"
                            >
                                <LayoutGrid size={14} /> Open in Chart View
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-4 gap-x-10 gap-y-3">
                        {[
                            { label: 'Prev. Close', value: prevClose.toLocaleString('en-IN', { maximumFractionDigits: 1 }) },
                            { label: 'Open', value: todayOpen > 0 ? todayOpen.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : '—' },
                            { label: 'Advance', value: advanceCount, color: 'text-emerald-600 dark:text-emerald-500' },
                            { label: 'Decline', value: declineCount, color: 'text-rose-600 dark:text-rose-500' },
                            { label: 'VIX Proxy', value: (Math.abs(data.change_percent) * 10).toFixed(2) }, // Simplified
                            { label: 'Unchanged', value: unchangedCount, color: 'text-text-muted' },
                        ].map((stat, i) => (
                            <div key={i}>
                                <div className="text-[10px] text-text-muted uppercase font-black tracking-wider">{stat.label}</div>
                                <div className={`text-sm font-bold font-mono mt-0.5 ${stat.color || 'text-text-primary'}`}>{stat.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={onClose} className="p-2 hover:bg-card rounded-full transition-colors text-text-muted hover:text-text-primary">
                    <X size={24} strokeWidth={3} />
                </button>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* TOP: Chart & Stats */}
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* CHART */}
                        <div className="flex-[2] bg-surface/40 rounded-2xl border border-border-secondary/60 p-5 h-[340px] flex flex-col relative group">
                            <div className="flex justify-between items-center mb-4 z-10">
                                <span className="text-xs font-black text-text-muted uppercase tracking-widest">
                                    Interactive Chart ({timeframe})
                                </span>
                                <div className="flex gap-1.5 bg-background border border-border-primary p-1 rounded-lg">
                                    {(['1D', '5D', '1M', '1Y'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeframe(t)}
                                            className={`text-[10px] font-black px-3 py-1 rounded transition-all ${timeframe === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-text-muted hover:text-text-primary'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 min-h-0">
                                <AreaChart candles={chartCandles} isUp={isUp} />
                            </div>
                            {loading && (
                                <div className="absolute inset-x-0 bottom-4 flex justify-center translate-y-2">
                                    <div className="bg-card px-3 py-1 rounded-full text-[10px] font-bold text-text-muted animate-pulse border border-border-primary">Updating Chart...</div>
                                </div>
                            )}
                        </div>

                        {/* RANGES & RETURNS */}
                        <div className="flex-1 flex flex-col gap-6">
                            <div className="bg-surface/40 rounded-2xl border border-border-secondary/60 p-5 space-y-6">
                                <RangeBar label="52-Week High/Low" low={w52Low} high={w52High} current={data.price} />
                                <RangeBar label="Day's Range" low={todayLow} high={todayHigh} current={data.price} />
                            </div>

                            <div className="bg-surface/40 rounded-2xl border border-border-secondary/60 p-5">
                                <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-4">Historical Returns</div>
                                <div className="grid grid-cols-3 gap-3">
                                    <ReturnTile label="1W" value={returnFor(5)} />
                                    <ReturnTile label="1M" value={returnFor(21)} />
                                    <ReturnTile label="3M" value={returnFor(63)} />
                                    <ReturnTile label="6M" value={returnFor(126)} />
                                    <ReturnTile label="YTD" value={returnFor(60)} />
                                    <ReturnTile label="1Y" value={returnFor(252)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM: Movers & Heatmap */}
                    <div className="grid lg:grid-cols-5 gap-8">

                        {/* MOVERS TABLE (Top 10) */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h2 className="text-sm font-black text-text-primary uppercase tracking-widest">Market Movers (Top 10)</h2>
                                <div className="bg-background rounded-lg p-1 flex border border-border-primary shadow-xl">
                                    <button onClick={() => setActiveTab('gainers')}
                                        className={`px-3 py-1 text-[10px] font-black rounded transition-all ${activeTab === 'gainers' ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'text-text-muted hover:text-text-primary'}`}>GAINERS</button>
                                    <button onClick={() => setActiveTab('losers')}
                                        className={`px-3 py-1 text-[10px] font-black rounded transition-all ${activeTab === 'losers' ? 'bg-rose-600 dark:bg-rose-500 text-white shadow-lg shadow-rose-900/40' : 'text-text-muted hover:text-text-primary'}`}>LOSERS</button>
                                </div>
                            </div>

                            <div className="bg-surface/40 rounded-2xl border border-border-secondary/60 overflow-hidden shadow-2xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-surface/80 border-b border-border-secondary">
                                        <tr>
                                            <th className="px-5 py-3 text-text-muted font-bold uppercase tracking-widest text-[9px]">Asset</th>
                                            <th className="px-5 py-3 text-text-muted font-bold uppercase tracking-widest text-[9px] text-right">LTP (₹)</th>
                                            <th className="px-5 py-3 text-text-muted font-bold uppercase tracking-widest text-[9px] text-right">Momentum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-secondary/30">
                                        {activeMoves.map(stock => (
                                            <tr key={stock.symbol} className="hover:bg-surface/50 transition-colors cursor-pointer group">
                                                <td className="px-5 py-3">
                                                    <div className="font-bold text-text-secondary group-hover:text-text-primary transition-colors uppercase tracking-tight">{stock.name}</div>
                                                    <div className="text-[10px] text-text-muted font-bold font-mono group-hover:text-text-secondary">{stock.symbol}</div>
                                                </td>
                                                <td className="px-5 py-3 text-right font-mono font-bold text-text-secondary">
                                                    {stock.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </td>
                                                <td className={`px-5 py-3 text-right font-black font-mono text-sm ${stock.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                                                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* CONSTITUENTS HEATMAP GRID (Bullish First) */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <h2 className="text-sm font-black text-text-primary uppercase tracking-widest">Bullish Sentiment Heatmap</h2>
                                <div className="text-[10px] text-text-muted font-bold uppercase flex items-center gap-2 tracking-widest">
                                    <LayoutGrid size={12} className="text-indigo-500" /> Sorted by Change%
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {sortedConstituents.map(stock => {
                                    const cUp = stock.changePercent >= 0;
                                    const intensity = Math.min(Math.abs(stock.changePercent) / 3, 1);
                                    const bg = cUp
                                        ? `rgba(16, 185, 129, ${0.1 + intensity * 0.45})`
                                        : `rgba(244, 63, 94, ${0.1 + intensity * 0.45})`;
                                    const border = cUp ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';

                                    return (
                                        <div key={stock.symbol}
                                            style={{ backgroundColor: bg, borderColor: border }}
                                            className="p-3.5 rounded-2xl border flex flex-col justify-between transition-all hover:scale-[1.03] hover:shadow-2xl hover:z-10 cursor-pointer group relative overflow-hidden h-20 shadow-lg">
                                            <div className="flex justify-between items-start z-10">
                                                <span className="text-[10px] font-black text-slate-900 dark:text-white truncate mr-2 uppercase tracking-tighter">{stock.name}</span>
                                                <div className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 ${cUp ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-emerald-900/50' : 'bg-rose-600 dark:bg-rose-500 text-white shadow-rose-900/50'} shadow-lg transform group-hover:scale-110 transition-transform`}>
                                                    {cUp ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowDownRight size={10} strokeWidth={3} />}
                                                    <span className="text-[10px] font-black">{Math.abs(stock.changePercent).toFixed(2)}%</span>
                                                </div>
                                            </div>
                                            <div className="flex items-end justify-between z-10">
                                                <div className="text-xs font-black font-mono text-slate-900 dark:text-white/90">₹{stock.ltp.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
                                                <div className="text-[8px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">{stock.sector}</div>
                                            </div>

                                            {/* Bottom progress-like bar */}
                                            <div className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${cUp ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400'}`}
                                                style={{ width: `${Math.min(100, (Math.abs(stock.changePercent) / 3) * 100)}%` }} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                </div>
            </div>

            {/* Global Loading Overlay (Initial only) */}
            {loading && chartCandles.length === 0 && (
                <div className="absolute inset-0 bg-background/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                        <RefreshCw className="animate-spin text-indigo-500" size={48} strokeWidth={3} />
                        <div className="absolute inset-0 animate-ping rounded-full border-4 border-indigo-500/20" />
                    </div>
                    <div className="text-sm font-black text-text-muted uppercase tracking-[0.3em] animate-pulse">Initializing Terminal…</div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default IndexDetailPanel;
