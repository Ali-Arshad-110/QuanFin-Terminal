import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    createChart, ColorType, CrosshairMode,
    PriceScaleMode,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { BarChart2, TrendingUp, Activity, ChevronDown, ChevronUp, Loader2, ArrowLeftRight, Maximize2, Minimize2 } from 'lucide-react';
import axios from 'axios';
import StockLogo from './StockLogo';
import { API_BASE } from '../config/api';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type ChartType = 'line' | 'area' | 'candle';

interface Slot {
    symbol: string;
    candles: any[];
    loading: boolean;
    error?: string;
}

interface ComparisonChartProps {
    /** Initial symbol → candles mapping handed in by the parent */
    dataMap: Record<string, any[]>;
    colors?: string[];
}

/* ─── Constants ─────────────────────────────────────────────────────────── */
const COLORS = {
    A: '#10b981', // emerald
    B: '#3b82f6', // blue
};

const CHART_HEIGHTS = [300, 440, 580];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function resolveCandles(raw: any[], type: ChartType) {
    return raw
        .map((c: any) => {
            let t = c.time ?? c.timestamp;
            if (!t && c.date) t = Math.floor(new Date(c.date).getTime() / 1000);
            if (!t && c.Date) t = Math.floor(new Date(c.Date).getTime() / 1000);
            if (!t) return null;

            const cl = c.close ?? c.Close ?? 0;
            const o = c.open ?? c.Open ?? cl;
            const h = c.high ?? c.High ?? Math.max(o, cl);
            const l = c.low ?? c.Low ?? Math.min(o, cl);

            // Defensive check for NaN/Invalid numbers
            if (isNaN(t) || isNaN(cl)) return null;

            if (type === 'candle') {
                if (isNaN(o) || isNaN(h) || isNaN(l)) {
                    return { time: t, open: cl, high: cl, low: cl, close: cl };
                }
                return { time: t, open: o, high: h, low: l, close: cl };
            }

            return { time: t, value: cl };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.time - b.time);
}

async function fetchCandles(symbol: string): Promise<any[]> {
    const res = await axios.get(
        `${API_BASE}/api/v1/analyze/${encodeURIComponent(symbol)}?interval=1d`
    );
    return res.data?.data ?? [];
}

/* ─── Mini ticker-search inside the chart header ─────────────────────────── */
interface InlineSearchProps {
    value: string;
    color: string;
    onSelect: (sym: string) => void;
    loading: boolean;
}
const InlineSearch: React.FC<InlineSearchProps> = ({ value, color, onSelect, loading }) => {
    const [q, setQ] = useState(value);
    const [open, setOpen] = useState(false);
    const [sug, setSug] = useState<{ symbol: string; name: string }[]>([]);
    const [fetching, setFetching] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    // Sync when external value changes
    useEffect(() => { setQ(value); }, [value]);

    useEffect(() => {
        const id = setTimeout(async () => {
            if (q.trim().length < 2 || q === value) { setSug([]); return; }
            setFetching(true);
            try {
                const res = await axios.get(
                    `${API_BASE}/api/v1/search?q=${encodeURIComponent(q)}&limit=6`
                );
                if (res.data?.status === 'success') {
                    setSug(res.data.data);
                    if (res.data.data.length > 0) setOpen(true);
                }
            } catch { /* silent */ }
            finally { setFetching(false); }
        }, 300);
        return () => clearTimeout(id);
    }, [q]);

    // Close on outside click
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const pick = (sym: string) => {
        setQ(sym); setOpen(false); setSug([]);
        onSelect(sym);
    };

    return (
        <div ref={wrapRef} className="relative">
            <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all duration-200 shadow-sm"
                style={{ borderColor: color + '40', backgroundColor: color + '08' }}
            >
                {/* colored dot */}
                <div className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentcolor]" style={{ backgroundColor: color }} />
                <input
                    value={q}
                    onChange={e => { setQ(e.target.value.toUpperCase()); if (e.target.value.length >= 1) setOpen(true); }}
                    onFocus={() => { if (sug.length > 0) setOpen(true); }}
                    className="w-28 bg-transparent text-xs font-black outline-none tracking-tight placeholder:text-text-muted/40"
                    style={{ color }}
                    placeholder="Symbol..."
                    spellCheck={false}
                />
                {(fetching || loading) && (
                    <Loader2 size={12} className="animate-spin opacity-60" style={{ color }} />
                )}
            </div>

            {open && sug.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border-primary rounded-2xl shadow-2xl z-[80] overflow-hidden animate-in slide-in-from-top-1 duration-200 backdrop-blur-xl">
                    <div className="p-2 border-b border-white/5 bg-white/5">
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-widest px-2">Market Suggestions</span>
                    </div>
                    {sug.map(s => (
                        <button
                            key={s.symbol}
                            onClick={() => pick(s.symbol)}
                            className="w-full text-left px-4 py-3 hover:bg-indigo-500/10 transition-colors border-b border-white/5 last:border-0 group"
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-text-primary group-hover:text-indigo-400 transition-colors">{s.symbol}</span>
                                <span className="text-[9px] font-black text-text-muted bg-surface px-1.5 py-0.5 rounded border border-white/5">EQUITY</span>
                            </div>
                            <div className="text-[10px] text-text-muted font-bold truncate opacity-60 mt-0.5">{s.name}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const ComparisonChart: React.FC<ComparisonChartProps> = ({ dataMap, colors: _colors }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesA = useRef<ISeriesApi<any> | null>(null);
    const seriesB = useRef<ISeriesApi<any> | null>(null);

    const symbols = Object.keys(dataMap);

    const [slotA, setSlotA] = useState<Slot>({
        symbol: symbols[0] ?? '',
        candles: dataMap[symbols[0]] ?? [],
        loading: false,
    });
    const [slotB, setSlotB] = useState<Slot>({
        symbol: symbols[1] ?? (symbols[0] ?? ''),
        candles: dataMap[symbols[1]] ?? dataMap[symbols[0]] ?? [],
        loading: false,
    });
    const [chartType, setChartType] = useState<ChartType>('area');
    const [heightIdx, setHeightIdx] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isDark, setIsDark] = useState(!document.documentElement.classList.contains('light'));
    const chartHeight = isFullScreen ? window.innerHeight : CHART_HEIGHTS[heightIdx];

    // Listen for theme changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(!document.documentElement.classList.contains('light'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Sync slots when parent dataMap changes (stock added/removed from compare list)
    useEffect(() => {
        const syms = Object.keys(dataMap);
        setSlotA(p => ({
            ...p,
            symbol: syms[0] ?? p.symbol,
            candles: dataMap[syms[0]] ?? p.candles,
        }));
        setSlotB(p => ({
            ...p,
            symbol: syms[1] ?? syms[0] ?? p.symbol,
            candles: dataMap[syms[1]] ?? dataMap[syms[0]] ?? p.candles,
        }));
    }, [Object.keys(dataMap).join(',')]);

    /* Add or rebuild a series on the chart */
    const buildSeries = useCallback((
        chart: IChartApi,
        type: ChartType,
        color: string,
        priceScaleId: string,
        title: string,
    ): ISeriesApi<any> => {
        if (type === 'line') {
            return chart.addLineSeries({
                color,
                lineWidth: 2,
                title,
                priceScaleId,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
        }
        if (type === 'area') {
            return chart.addAreaSeries({
                lineColor: color,
                topColor: color + '45',
                bottomColor: color + '08',
                lineWidth: 2,
                title,
                priceScaleId,
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
            });
        }
        // candle — always on right scale (ignored param for candle but kept consistent)
        return chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderUpColor: '#10b981',
            borderDownColor: '#ef4444',
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
            priceScaleId,
        });
    }, []);

    /* ── Build / Rebuild chart ─────────────────────────────────────────── */
    useEffect(() => {
        if (!containerRef.current) return;

        // Destroy previous chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
            seriesA.current = null;
            seriesB.current = null;
        }

        const chart = createChart(containerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: isDark ? '#94a3b8' : '#475569',
            },
            grid: {
                vertLines: { color: isDark ? '#1e293b' : '#e2e8f0' },
                horzLines: { color: isDark ? '#1e293b' : '#e2e8f0' },
            },
            crosshair: { mode: CrosshairMode.Normal },
            width: containerRef.current.clientWidth,
            height: chartHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: isDark ? '#1e293b' : '#e2e8f0',
                borderVisible: !isFullScreen,
            },
            // left scale for series A
            leftPriceScale: {
                visible: true,
                borderColor: COLORS.A + '80',
                scaleMargins: isFullScreen ? { top: 0, bottom: 0 } : { top: 0.12, bottom: 0.08 },
                mode: PriceScaleMode.Normal,
                borderVisible: !isFullScreen,
            },
            // right scale for series B
            rightPriceScale: {
                visible: true,
                borderColor: COLORS.B + '80',
                scaleMargins: isFullScreen ? { top: 0, bottom: 0 } : { top: 0.12, bottom: 0.08 },
                mode: PriceScaleMode.Normal,
                borderVisible: !isFullScreen,
            },
        });

        chartRef.current = chart;

        // Series A — left scale
        if (slotA.candles.length > 0) {
            const sA = buildSeries(chart, chartType, COLORS.A, 'left', slotA.symbol);
            sA.setData(resolveCandles(slotA.candles, chartType) as any);
            seriesA.current = sA;
        }

        // Series B — right scale
        if (slotB.candles.length > 0) {
            const sB = buildSeries(chart, chartType, COLORS.B, 'right', slotB.symbol);
            sB.setData(resolveCandles(slotB.candles, chartType) as any);
            seriesB.current = sB;
        }

        chart.timeScale().fitContent();

        const handleResize = () => {
            if (containerRef.current)
                chart.applyOptions({ width: containerRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
            chartRef.current = null;
            seriesA.current = null;
            seriesB.current = null;
        };
    }, [slotA.candles, slotB.candles, chartType, chartHeight, buildSeries, isDark]);

    /* ── Ticker change handlers ─────────────────────────────────────────── */
    const changeSlot = useCallback(async (
        which: 'A' | 'B',
        sym: string,
    ) => {
        // Check if parent already has data
        if (dataMap[sym]) {
            if (which === 'A') setSlotA({ symbol: sym, candles: dataMap[sym], loading: false });
            else setSlotB({ symbol: sym, candles: dataMap[sym], loading: false });
            return;
        }

        // Fetch from backend
        const setter = which === 'A' ? setSlotA : setSlotB;
        setter(p => ({ ...p, symbol: sym, loading: true, error: undefined }));
        try {
            const candles = await fetchCandles(sym);
            setter({ symbol: sym, candles, loading: false });
        } catch {
            setter(p => ({ ...p, loading: false, error: `Failed to load ${sym}` }));
        }
    }, [dataMap]);

    /* ── Swap slots ─────────────────────────────────────────────────────── */
    const swapSlots = () => {
        const tmpA = { ...slotA };
        const tmpB = { ...slotB };
        setSlotA(tmpB);
        setSlotB(tmpA);
    };

    const chartTypes: { type: ChartType; label: string; Icon: React.ElementType }[] = [
        { type: 'line', label: 'Line', Icon: TrendingUp },
        { type: 'area', label: 'Area', Icon: Activity },
        { type: 'candle', label: 'Candle', Icon: BarChart2 },
    ];

    const noData = slotA.candles.length === 0 && slotB.candles.length === 0;

    /* ══════════════════════════════════════════════════════════════════════
       FULLSCREEN BRANCH — pure chart, zero chrome
    ══════════════════════════════════════════════════════════════════════ */
    if (isFullScreen) {
        return (
            <div className="fixed inset-0 z-[9000] bg-background">
                {/* ─ Top-Left Overlay ─ */}
                <div className="absolute top-5 left-5 z-10 flex items-center gap-2 select-none">
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border shadow-2xl ${isDark ? 'bg-[#0f1419]/90 border-[#2a2e39]' : 'bg-white/90 border-slate-200'} backdrop-blur-xl`}>
                        <StockLogo symbol={slotA.symbol} size={6} className="ring-2 ring-background shadow-lg" />
                        <StockLogo symbol={slotB.symbol} size={5} className="ring-2 ring-background shadow-lg -ml-2" />
                        <div className="h-5 w-px bg-border-primary/50 mx-1" />
                        <div>
                            <p className="text-xs font-black text-text-primary uppercase tracking-widest">
                                {slotA.symbol} <span className="text-indigo-400/70 mx-1">vs</span> {slotB.symbol}
                            </p>
                            <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest opacity-60">Comparative Engine</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-0.5 p-1 rounded-xl border ${isDark ? 'bg-[#0f1419]/80 border-[#2a2e39]' : 'bg-white/80 border-slate-200'} backdrop-blur-md`}>
                        {chartTypes.map(({ type, Icon }) => (
                            <button
                                key={type}
                                onClick={() => setChartType(type)}
                                className={`p-1.5 rounded-lg transition-all duration-200 ${chartType === type ? 'bg-indigo-600 text-white shadow-md' : 'text-text-muted hover:text-text-primary hover:bg-surface'}`}
                            >
                                <Icon size={14} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─ Bottom-Centre Minimize ─ */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                    <button
                        onClick={() => setIsFullScreen(false)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1e222d]/80 backdrop-blur-2xl border border-white/10 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)] group relative overflow-hidden"
                        title="Exit Fullscreen"
                    >
                        <Minimize2 size={16} className="text-indigo-400 transition-transform duration-300 group-hover:scale-110" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 opacity-80 group-hover:opacity-100">MIN</span>
                        <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 bg-indigo-500/5 blur-md" />
                    </button>
                </div>

                {/* ─ Pure Chart Canvas ─ */}
                {noData ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-text-muted text-sm gap-4 animate-pulse">
                        <Loader2 size={32} className="animate-spin text-indigo-500/50" />
                        <span className="font-black uppercase tracking-widest text-[10px]">Synchronizing Market Feeds…</span>
                    </div>
                ) : (
                    <div ref={containerRef} className="w-full h-full" />
                )}
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════════════
       NORMAL EMBEDDED BRANCH
    ══════════════════════════════════════════════════════════════════════ */
    return (
        <div className="w-full rounded-2xl border border-border-primary/50 bg-surface/30 overflow-visible shadow-2xl backdrop-blur-sm">

            {/* ── Toolbar ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border-primary/40 bg-surface/50 flex-wrap rounded-t-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                    <InlineSearch value={slotA.symbol} color={COLORS.A} onSelect={sym => changeSlot('A', sym)} loading={slotA.loading} />
                    <button onClick={swapSlots} title="Swap A ↔ B" className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                        <ArrowLeftRight size={13} />
                    </button>
                    <InlineSearch value={slotB.symbol} color={COLORS.B} onSelect={sym => changeSlot('B', sym)} loading={slotB.loading} />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-surface rounded-xl p-1 border border-border-primary/50 shadow-inner">
                        {chartTypes.map(({ type, label, Icon }) => (
                            <button
                                key={type}
                                onClick={() => setChartType(type)}
                                title={label}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${chartType === type ? 'bg-indigo-500 text-white shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)]' : 'text-text-muted hover:text-text-primary hover:bg-white/5'}`}
                            >
                                <Icon size={12} />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setHeightIdx(i => (i + 1) % CHART_HEIGHTS.length)}
                        className="p-2 rounded-xl bg-surface hover:bg-white/5 text-text-muted hover:text-text-primary transition-all border border-border-primary/50 shadow-sm"
                    >
                        {heightIdx < CHART_HEIGHTS.length - 1 ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                </div>
            </div>

            {/* ── Price-scale labels ─────────────────────────────────────── */}
            <div className="flex justify-between items-center px-4 py-1.5 bg-surface/30 text-[9px] font-black uppercase tracking-widest border-b border-border-primary/20">
                <div className="flex items-center gap-2" style={{ color: COLORS.A }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.A }} />
                    {slotA.symbol || '—'} <span className="opacity-60">(L-SCALE)</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: COLORS.B }}>
                    <span className="opacity-60">(R-SCALE)</span> {slotB.symbol || '—'}
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.B }} />
                </div>
            </div>

            {/* ── Chart canvas ───────────────────────────────────────────── */}
            <div className="relative w-full" style={{ height: chartHeight }}>

                {/* ─ Floating MAX Button ─ */}
                <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-[10] flex items-center">
                    <button
                        onClick={() => setIsFullScreen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#1e222d]/80 backdrop-blur-2xl border border-white/10 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300 ease-out shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-indigo-500/30 text-text-primary group relative overflow-hidden"
                        title="Enter Fullscreen"
                    >
                        <span className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                            <Maximize2 size={16} className="text-indigo-400" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 opacity-80 group-hover:opacity-100 transition-opacity">MAX</span>
                        <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-500/5 blur-md"></span>
                    </button>
                </div>

                {noData ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm gap-4 animate-pulse">
                        <Loader2 size={32} className="animate-spin text-indigo-500/50" />
                        <span className="font-black uppercase tracking-widest text-[10px]">Synchronizing Market Feeds…</span>
                    </div>
                ) : (
                    <div ref={containerRef} className="w-full h-full" />
                )}
            </div>

            {/* ── Error banners ─────────────────────────────────────────── */}
            {(slotA.error || slotB.error) && (
                <div className="px-4 py-2 bg-danger/5 border-t border-danger/10 text-[10px] text-danger font-black uppercase tracking-widest flex gap-6">
                    {slotA.error && <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-danger" /> Slot A: {slotA.error}</span>}
                    {slotB.error && <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-danger" /> Slot B: {slotB.error}</span>}
                </div>
            )}
        </div>
    );
};

export default ComparisonChart;

