import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, TrendingUp, TrendingDown, Filter, Activity, ArrowLeft } from 'lucide-react';
import { createChart } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import StockLogo from '../../StockLogo';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stock {
    ticker: string;
    name: string;
    price: number;
    change: number;
    changePct: number;
    sector: string;
    volume: string;
    dayHigh?: number;
    dayLow?: number;
    open?: number;
    prevClose?: number;
}

interface BreadthStockListModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'advances' | 'declines' | 'all';
}

// ─── Mini Hover Chart ─────────────────────────────────────────────────────────
const MiniChart: React.FC<{ symbol: string; isDark: boolean }> = ({ symbol, isDark }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!containerRef.current) return;

        const bg = isDark ? '#0f1117' : '#ffffff';
        const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
        const textColor = isDark ? '#888ea0' : '#666';

        chartRef.current = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 120,
            layout: { background: { color: bg }, textColor },
            grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
            rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
            timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
            crosshair: { mode: 1 },
            handleScroll: false,
            handleScale: false,
        });

        const color = '#6366f1';
        seriesRef.current = chartRef.current.addLineSeries({
            color,
            lineWidth: 2,
            crosshairMarkerVisible: true,
            lastValueVisible: false,
            priceLineVisible: false,
        } as any);

        // Fetch 1D 5min chart data
        const API_URL = import.meta.env.VITE_API_URL || '';
        fetch(`${API_URL}/api/v1/analyze/${encodeURIComponent(symbol)}?interval=5m&period=1d`)
            .then(r => r.json())
            .then(res => {
                const rawData: any[] = Array.isArray(res) ? res : (res.data || []);
                const points: { time: any; value: number }[] = rawData
                    .filter((d: any) => d.close != null)
                    .map((d: any) => ({
                        time: (new Date(d.date || d.Date || d.datetime).getTime() / 1000) as any,
                        value: d.close,
                    }));

                if (points.length > 0 && seriesRef.current) {
                    seriesRef.current.setData(points);
                    chartRef.current?.timeScale().fitContent();

                    // Color line green/red based on direction
                    const first = points[0].value as number;
                    const last = points[points.length - 1].value as number;
                    seriesRef.current.applyOptions({ color: last >= first ? '#10b981' : '#f43f5e' });
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));

        return () => {
            chartRef.current?.remove();
            chartRef.current = null;
        };
    }, [symbol, isDark]);

    return (
        <div className="relative w-full rounded-xl overflow-hidden bg-background border border-border-primary/40">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <Activity size={16} className="animate-pulse text-indigo-400" />
                </div>
            )}
            <div ref={containerRef} className="w-full" />
        </div>
    );
};

// ─── 1D Range Bar ─────────────────────────────────────────────────────────────
const RangeBar: React.FC<{ low: number; high: number; current: number; open: number }> = ({ low, high, current, open }) => {
    const range = high - low;
    if (!range || !low || !high) return null;
    const pct = Math.min(100, Math.max(0, ((current - low) / range) * 100));
    const isUp = current >= open;

    return (
        <div className="flex items-center gap-1.5 mt-1" title={`Low: ₹${low.toFixed(1)} | High: ₹${high.toFixed(1)}`}>
            <span className="text-[9px] font-mono text-rose-400/70">₹{low.toFixed(0)}</span>
            <div className="flex-1 h-1 bg-border-primary/40 rounded-full relative overflow-hidden">
                <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${pct}%` }}
                />
                {/* Current price marker */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white border border-gray-400 shadow-sm"
                    style={{ left: `calc(${pct}% - 3px)` }}
                />
            </div>
            <span className="text-[9px] font-mono text-emerald-400/70">₹{high.toFixed(0)}</span>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const BreadthStockListModal: React.FC<BreadthStockListModalProps> = ({ isOpen, onClose, type }) => {
    const [search, setSearch] = useState('');
    const [sectorFilter, setSectorFilter] = useState('Nifty IT');
    const [sortKey, setSortKey] = useState<'changePct' | 'ticker' | 'price'>('changePct');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);
    const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

    // Track theme changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const formatVolume = (vol: number) => {
        if (vol >= 10000000) return (vol / 10000000).toFixed(2) + ' Cr';
        if (vol >= 100000) return (vol / 100000).toFixed(2) + ' L';
        if (vol >= 1000) return (vol / 1000).toFixed(2) + ' K';
        return vol.toString();
    };

    useEffect(() => {
        if (!isOpen) return;
        const fetchBreadthData = async () => {
            const API_URL = import.meta.env.VITE_API_URL || '';
            setIsLoading(true);
            try {
                const response = await fetch(`${API_URL}/api/v1/market/breadth/${encodeURIComponent(sectorFilter)}`);
                const result = await response.json();
                const actualData = Array.isArray(result) ? result : (result.data || []);

                if (Array.isArray(actualData)) {
                    const mapped: Stock[] = actualData.map((s: any) => ({
                        ticker: s.symbol,
                        name: s.name,
                        price: s.ltp || 0,
                        change: s.change || 0,
                        changePct: s.changePercent || 0,
                        sector: s.sector || '',
                        volume: formatVolume(s.volume || 0),
                        dayHigh: s.high || 0,
                        dayLow: s.low || 0,
                        open: s.open || 0,
                        prevClose: s.prevClose || 0,
                    }));

                    const filtered = type === 'all' ? mapped : mapped.filter(s =>
                        type === 'advances' ? s.changePct > 0 : s.changePct < 0
                    );
                    setStocks(filtered);
                }
            } catch (error) {
                console.error('Failed to fetch breadth data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchBreadthData();
    }, [isOpen, sectorFilter, type]);

    const filterGroups = {
        'Broad Market': ['Nifty 50', 'Nifty 100', 'Nifty 200', 'Nifty 500', 'Nifty Midcap 50', 'Nifty Midcap 100', 'All Markets'],
        'Sectoral': ['Nifty Bank', 'Nifty IT', 'Nifty PSU Bank', 'Nifty FMCG', 'Nifty Private Bank', 'Nifty Metal', 'Nifty Financial Services', 'Nifty Pharma', 'Nifty Auto', 'Nifty Realty', 'Nifty Energy', 'Nifty Infrastructure'],
        'Thematic': ['Nifty CPSE', 'Nifty Commodities', 'Nifty100 Equal Weight', 'Nifty50 Value 20', 'Nifty100 Quality 30', 'Nifty Low Volatility 50', 'Nifty Alpha 50'],
    };

    const filteredStocks = useMemo(() => {
        return stocks
            .filter(s =>
                s.ticker?.toLowerCase().includes(search.toLowerCase()) ||
                s.name?.toLowerCase().includes(search.toLowerCase())
            )
            .sort((a, b) => {
                const modifier = sortOrder === 'asc' ? 1 : -1;
                const valA = a[sortKey];
                const valB = b[sortKey];
                if (typeof valA === 'string') return valA.localeCompare(valB as string) * modifier;
                return ((valA as number) - (valB as number)) * modifier;
            });
    }, [stocks, search, sortKey, sortOrder]);

    if (!isOpen) return null;

    const handleSort = (key: 'changePct' | 'ticker' | 'price') => {
        if (sortKey === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortOrder('desc'); }
    };

    return createPortal(
        <div className="fixed inset-0 z-[5000] bg-background flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-border-primary bg-surface/50 backdrop-blur-3xl">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-text-primary transition-all group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Back to Terminal</span>
                </button>

                <div className="h-6 w-px bg-border-primary" />

                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shadow-lg ${type === 'advances' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        {type === 'advances' ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tighter text-text-primary uppercase leading-none">Market Breadth Analysis</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${type === 'advances' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                {type === 'advances' ? 'Advances' : 'Declines'}
                            </span>
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                • {filteredStocks.length} Constituents
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-full">
                    <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isLoading ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {isLoading ? 'Fetching Data...' : 'Live Market Feed'}
                    </span>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex flex-wrap items-center gap-4 px-6 py-4 bg-surface/30 backdrop-blur-md border-b border-border-primary">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Search by ticker or company name..."
                        className="w-full bg-background/50 border border-border-primary rounded-xl py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder:text-text-muted/50 text-text-primary"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 bg-background/50 border border-border-primary rounded-xl px-4 py-2 hover:border-indigo-500/50 transition-colors group">
                    <Filter size={14} className="text-text-muted group-hover:text-indigo-500 transition-colors" />
                    <select
                        className="bg-transparent text-xs font-black text-text-primary outline-none cursor-pointer uppercase tracking-widest"
                        value={sectorFilter}
                        onChange={(e) => setSectorFilter(e.target.value)}
                    >
                        {Object.entries(filterGroups).map(([group, subSectors]) => (
                            <optgroup key={group} label={group}>
                                {subSectors.map(s => <option key={s} value={s}>{s}</option>)}
                            </optgroup>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-hidden flex flex-col bg-background">
                {/* Column Header */}
                <div className="grid grid-cols-12 px-8 py-3 bg-surface/50 border-b border-border-primary text-[10px] font-black uppercase tracking-[0.2em] text-text-muted select-none">
                    <div className="col-span-5 flex items-center gap-1 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('ticker')}>
                        Stock / Instrument {sortKey === 'ticker' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('price')}>
                        LTP {sortKey === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-text-primary transition-colors" onClick={() => handleSort('changePct')}>
                        Chg% {sortKey === 'changePct' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div className="col-span-2 text-right">Volume</div>
                    <div className="col-span-1 text-right">Sector</div>
                </div>

                {/* Rows */}
                <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-60 py-20">
                            <Activity size={32} className="animate-pulse text-indigo-400" />
                            <p className="text-xs font-black uppercase tracking-widest text-text-muted">Fetching Constituents…</p>
                        </div>
                    ) : filteredStocks.length > 0 ? (
                        <div className="space-y-0.5">
                            {filteredStocks.map((stock) => {
                                const isHovered = hoveredTicker === stock.ticker;

                                return (
                                    <div
                                        key={stock.ticker}
                                        className="relative rounded-xl border border-transparent hover:border-border-primary/60 hover:bg-surface/30 transition-all cursor-pointer group"
                                        onMouseEnter={() => setHoveredTicker(stock.ticker)}
                                        onMouseLeave={() => setHoveredTicker(null)}
                                    >
                                        {/* Main Row */}
                                        <div className="grid grid-cols-12 px-4 py-3 items-center">
                                            {/* Stock Identity: Logo + Name + Range Bar */}
                                            <div className="col-span-5 flex items-center gap-3">
                                                <StockLogo
                                                    symbol={stock.ticker}
                                                    name={stock.name}
                                                    size={9}
                                                    className="rounded-lg shadow-sm border border-border-primary/20 shrink-0"
                                                />
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-text-primary tracking-tight group-hover:text-indigo-500 transition-colors">{stock.ticker.replace('.NS', '')}</span>
                                                        {stock.open && stock.open > 0 && stock.price > 0 && (
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${stock.price >= stock.open ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                                {stock.price >= stock.open ? '▲ Above Open' : '▼ Below Open'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-text-muted truncate max-w-[200px] opacity-70">{stock.name}</span>
                                                    {/* 1D Range Bar */}
                                                    {stock.dayLow && stock.dayHigh && stock.dayLow > 0 && (
                                                        <RangeBar
                                                            low={stock.dayLow}
                                                            high={stock.dayHigh}
                                                            current={stock.price}
                                                            open={stock.open || stock.price}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {/* LTP */}
                                            <div className="col-span-2 text-right tabular-nums">
                                                <div className="text-sm font-black text-text-primary font-mono">
                                                    ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                {stock.change !== 0 && (
                                                    <div className={`text-[10px] font-bold ${stock.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {stock.change > 0 ? '+' : ''}₹{stock.change.toFixed(2)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Change % */}
                                            <div className="col-span-2 text-right tabular-nums">
                                                <div className={`text-xs font-black px-2 py-1 rounded-md inline-block ${stock.changePct > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                    {stock.changePct > 0 ? '+' : ''}{stock.changePct.toFixed(2)}%
                                                </div>
                                            </div>

                                            {/* Volume */}
                                            <div className="col-span-2 text-right tabular-nums text-[11px] font-bold text-text-muted uppercase">
                                                {stock.volume}
                                            </div>

                                            {/* Sector badge */}
                                            <div className="col-span-1 text-right">
                                                <span className="text-[9px] font-black text-indigo-400/80 bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10 uppercase tracking-tighter truncate">
                                                    {stock.sector?.split(' ')[0] || '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Hover Mini Chart */}
                                        {isHovered && (
                                            <div className="px-4 pb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="flex items-center justify-between mb-1.5 px-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                                                        {stock.ticker} · Today · 5m
                                                    </span>
                                                    <span className="text-[9px] text-text-muted">
                                                        H: ₹{stock.dayHigh?.toFixed(1) || '—'} &nbsp;|&nbsp; L: ₹{stock.dayLow?.toFixed(1) || '—'}
                                                    </span>
                                                </div>
                                                <MiniChart symbol={stock.ticker} isDark={isDark} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted gap-4 opacity-40 py-20">
                            <Activity size={48} strokeWidth={1} className="animate-pulse" />
                            <div className="text-center">
                                <p className="text-lg font-black uppercase tracking-widest mb-1">No Constituents Detected</p>
                                <p className="text-xs font-medium">Refine your search or adjust the sector filter</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="px-8 py-3 border-t border-border-primary bg-surface/50 backdrop-blur-xl flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span>NSE Live Data</span>
                    </div>
                    <span className="text-indigo-400">Hover row → 5m chart</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-indigo-400">Index:</span>
                    <span>{sectorFilter}</span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BreadthStockListModal;
