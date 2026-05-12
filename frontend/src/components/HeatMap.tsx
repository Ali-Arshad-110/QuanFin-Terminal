import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowUpRight, ArrowDownRight, RefreshCw, Layers,
    ArrowUp, ArrowDown, ChevronsUpDown, LayoutGrid, List,
    Maximize2, Minimize2, Filter, Clock,
    TrendingUp, BarChart2, Activity,
} from 'lucide-react';
import { useMarketStore } from '../store';
import { useTheme } from '../theme/ThemeProvider';
import AdvanceHeatMap, { type ColorMode } from './AdvanceHeatMap';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Sector {
    name: string;
    change: number;
    changePercent: number;
    ltp: number;
}

interface Constituent {
    symbol: string;
    name: string;
    ltp: number;
    change: number;
    changePercent: number;
    openInterest?: string;
    oiChangePercent?: number;
    volume?: number;
}

interface SectorDetails {
    symbol: string;
    index: string;
    name: string;
    constituents: Constituent[];
}

type FilterType = 'all' | 'bullish' | 'bearish' | 'oiRising' | 'oiFalling';
type SortKey = keyof Constituent;
/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatLargeNum(n: number | string | undefined): string {
    if (n === undefined || n === null) return 'N/A';
    const num = typeof n === 'string' ? parseFloat(n.replace(/,/g, '')) : n;
    if (isNaN(num)) return String(n);
    if (num >= 1e7) return (num / 1e7).toFixed(2) + ' Cr';
    if (num >= 1e5) return (num / 1e5).toFixed(2) + ' L';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + ' K';
    return num.toFixed(0);
}

function getIntensityBg(pct: number): string {
    const abs = Math.min(Math.abs(pct), 4);
    const alpha = 0.25 + (abs / 4) * 0.75;
    if (pct > 0) return `rgba(16,185,129,${alpha.toFixed(2)})`;
    if (pct < 0) return `rgba(244,63,94,${alpha.toFixed(2)})`;
    return 'rgba(71,85,105,0.5)';
}

function getTextColor(pct: number, isDark: boolean = true) {
    if (pct > 0) return isDark ? 'text-emerald-500' : 'text-emerald-700';
    if (pct < 0) return isDark ? 'text-rose-500' : 'text-rose-700';
    return 'text-text-muted';
}

/* ─── Sector Pill ─────────────────────────────────────────────────────────── */
const SectorPill: React.FC<{
    sector: Sector;
    isSelected: boolean;
    onClick: () => void;
    isDark: boolean;
}> = ({ sector, isSelected, onClick, isDark }) => {
    // Generate base intensity bg, then lighten it overriding alpha if in light mode
    const baseBg = getIntensityBg(sector.changePercent);
    const bg = isDark ? baseBg : baseBg.replace(/0\.\d+\)$/, '0.15)');
    const isUp = sector.changePercent >= 0;

    return (
        <button
            onClick={onClick}
            className={`relative flex flex-col items-start justify-between p-3 rounded-xl transition-all duration-150 text-left overflow-hidden border
                ${isSelected
                    ? `ring-2 scale-[1.02] z-10 shadow-xl ${isDark ? 'ring-white/60 border-transparent' : 'ring-emerald-500/50 border-emerald-500/30 bg-white/50'}`
                    : `hover:scale-[1.01] hover:brightness-110 opacity-90 hover:opacity-100 ${isDark ? 'border-transparent' : 'border-slate-200/60 bg-white/40'}`
                }`}
            style={{
                background: isDark ? bg : undefined,
                backgroundColor: !isDark ? bg : undefined
            }}
        >
            {/* Live pulse */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isUp ? (isDark ? 'bg-emerald-300' : 'bg-emerald-500') : (isDark ? 'bg-rose-300' : 'bg-rose-500')}`} />
            </div>

            <div>
                <div className={`text-xs font-bold leading-tight pr-4 ${isDark ? 'text-white/90' : 'text-slate-800'}`}>{sector.name}</div>
                <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-white/60' : 'text-slate-600 font-medium'}`}>
                    ₹{sector.ltp.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
                {isUp
                    ? <ArrowUpRight size={12} className={`shrink-0 ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`} />
                    : <ArrowDownRight size={12} className={`shrink-0 ${isDark ? 'text-rose-300' : 'text-rose-600'}`} />
                }
                <span className={`text-sm font-bold font-mono ${isUp ? (isDark ? 'text-emerald-200' : 'text-emerald-700') : (isDark ? 'text-rose-200' : 'text-rose-700')}`}>
                    {isUp ? '+' : ''}{sector.changePercent.toFixed(2)}%
                </span>
            </div>

            {/* Bottom intensity bar */}
            <div className="absolute bottom-0 left-0 h-0.5 w-full bg-black/10">
                <div
                    className="h-full transition-all"
                    style={{
                        width: `${Math.min(Math.abs(sector.changePercent) / 4 * 100, 100)}%`,
                        backgroundColor: isUp ? '#34d399' : '#fb7185',
                    }}
                />
            </div>
        </button>
    );
};


/* ─── Sort Icon ─────────────────────────────────────────────────────────── */
const SortIcon: React.FC<{ col: SortKey; sortKey: SortKey | null; dir: 'asc' | 'desc' }> = ({ col, sortKey, dir }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="inline ml-1 opacity-20" />;
    return dir === 'asc'
        ? <ArrowUp size={12} className="inline ml-1 text-emerald-400" />
        : <ArrowDown size={12} className="inline ml-1 text-rose-400" />;
};

/* ─── Main HeatMap ───────────────────────────────────────────────────────── */
interface HeatMapProps {
    onNavigate?: (view: any) => void;
}

const HeatMap: React.FC<HeatMapProps> = ({ onNavigate }) => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [selectedSector, setSelectedSector] = useState<string | null>(null);
    const [details, setDetails] = useState<SectorDetails | null>(null);
    const [loadingSectors, setLoadingSectors] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [isAdvanceView, setIsAdvanceView] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [colorMode, setColorMode] = useState<ColorMode>('change');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const { setTicker } = useMarketStore();
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /* ── Fetch ─────────────────────────────────────────────────────────── */
    const fetchSectors = useCallback(async (isInitial = false) => {
        if (isInitial || sectors.length === 0) setLoadingSectors(true);
        try {
            const res = await fetch('http://localhost:8000/api/v1/sectors');
            if (res.ok) {
                const data: Sector[] = await res.json();
                setSectors(data);
                setLastUpdated(new Date());
                if (data.length > 0 && !selectedSector) setSelectedSector(data[0].name);
            }
        } catch (e) { console.error('Sectors fetch failed', e); }
        finally { setLoadingSectors(false); }
    }, [selectedSector, sectors.length]);

    const fetchDetails = useCallback(async (sectorName: string, isInitial = false) => {
        if (isInitial || details?.index !== sectorName) setLoadingDetails(true);
        try {
            const res = await fetch(
                `http://localhost:8000/api/v1/network-map/constituents/${encodeURIComponent(sectorName)}`
            );
            if (res.ok) {
                const data = await res.json();
                setDetails(data);
            }
        } catch (e) { console.error('Details fetch failed', e); }
        finally { setLoadingDetails(false); }
    }, [details?.symbol]);

    useEffect(() => {
        fetchSectors(true);
        // Auto-refresh every 60 s
        refreshIntervalRef.current = setInterval(() => {
            fetchSectors(false);
            if (selectedSector) fetchDetails(selectedSector, false);
        }, 60_000);
        return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
    }, [fetchSectors, fetchDetails, selectedSector]);

    useEffect(() => { if (selectedSector) fetchDetails(selectedSector, true); }, [selectedSector, fetchDetails]);

    /* ── Sort + Filter ─────────────────────────────────────────────────── */
    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const filteredConstituents = React.useMemo(() => {
        if (!details?.constituents) return [];
        let list = [...details.constituents];

        // Filter
        if (filterType === 'bullish') list = list.filter(s => s.changePercent > 0);
        if (filterType === 'bearish') list = list.filter(s => s.changePercent < 0);
        if (filterType === 'oiRising') list = list.filter(s => (s.oiChangePercent ?? 0) > 0);
        if (filterType === 'oiFalling') list = list.filter(s => (s.oiChangePercent ?? 0) < 0);

        // Sort
        if (sortKey) {
            list.sort((a, b) => {
                const av = a[sortKey] as any;
                const bv = b[sortKey] as any;
                if (av < bv) return sortDir === 'asc' ? -1 : 1;
                if (av > bv) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [details?.constituents, sortKey, sortDir, filterType]);

    /* ── Sector stats ──────────────────────────────────────────────────── */
    const gainers = sectors.filter(s => s.changePercent > 0).length;
    const losers = sectors.filter(s => s.changePercent < 0).length;
    const avgChange = sectors.length
        ? sectors.reduce((s, x) => s + x.changePercent, 0) / sectors.length
        : 0;

    /* ── Th helper ─────────────────────────────────────────────────────── */
    const Th: React.FC<{ col: SortKey; children: React.ReactNode; className?: string }> = ({ col, children, className = '' }) => (
        <th
            className={`px-3 py-2.5 cursor-pointer hover:bg-surface bg-card transition-colors select-none text-[10px] uppercase tracking-wider font-semibold text-text-muted ${className}`}
            onClick={() => handleSort(col)}
        >
            {children}
            <SortIcon col={col} sortKey={sortKey} dir={sortDir} />
        </th>
    );

    /* ── Filter chips ──────────────────────────────────────────────────── */
    const filterChips: { type: FilterType; label: string; color: string }[] = [
        { type: 'all', label: 'All', color: 'bg-card text-text-primary' },
        { type: 'bullish', label: '🟢 Bullish', color: 'bg-emerald-500/20 text-emerald-500 font-bold' },
        { type: 'bearish', label: '🔴 Bearish', color: 'bg-rose-500/20 text-rose-500 font-bold' },
        { type: 'oiRising', label: '📈 OI ↑', color: 'bg-indigo-500/20 text-indigo-500' },
        { type: 'oiFalling', label: '📉 OI ↓', color: 'bg-amber-500/20 text-amber-500' },
    ];

    const colorModes: { mode: ColorMode; label: string; Icon: React.ElementType }[] = [
        { mode: 'change', label: 'Change%', Icon: TrendingUp },
        { mode: 'oi', label: 'OI Chg%', Icon: Activity },
        { mode: 'volume', label: 'Volume', Icon: BarChart2 },
    ];

    /* ── Layout wrapper (supports fullscreen) ───────────────────────────── */
    const wrapperClass = isFullscreen
        ? 'fixed inset-x-0 bottom-0 top-24 z-[100] flex flex-col bg-background p-4 overflow-hidden transition-colors duration-300'
        : 'flex flex-col gap-4 mt-6 animate-fade-in pb-12 overflow-y-auto transition-colors duration-300';

    return (
        <div className={wrapperClass}>
            {/* ── Top Header bar ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Layers className="text-emerald-500" size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-primary tracking-tight leading-none uppercase">
                            Stocks F&amp;O Sectoral Heat Map
                        </h2>
                        <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-emerald-500 font-semibold">{gainers} ▲</span>
                            <span className="text-[10px] text-rose-500 font-semibold">{losers} ▼</span>
                            <span className={`text-[10px] font-mono font-bold ${getTextColor(avgChange, isDark)}`}>
                                Avg {avgChange > 0 ? '+' : ''}{avgChange.toFixed(2)}%
                            </span>
                            {lastUpdated && (
                                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                                    <Clock size={9} />
                                    {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchSectors(true)}
                        disabled={loadingSectors}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loadingSectors ? 'animate-spin' : ''} />
                    </button>
                    {/* Only show maximize button when NOT in fullscreen */}
                    {!isFullscreen && (
                        <button
                            onClick={() => setIsFullscreen(true)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Enter Fullscreen"
                        >
                            <Maximize2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Floating fullscreen exit button — always on top ──────── */}
            {isFullscreen && createPortal(
                <button
                    onClick={() => setIsFullscreen(false)}
                    className="fixed top-3 right-4 z-[9999] flex items-center gap-2 bg-card hover:bg-rose-600 border border-border-primary hover:border-rose-500 text-text-primary hover:text-white px-3 py-1.5 rounded-full shadow-2xl transition-all text-xs font-semibold backdrop-blur"
                    title="Exit Fullscreen"
                >
                    <Minimize2 size={13} />
                    Exit Fullscreen
                </button>,
                document.body
            )}

            {/* ── Main layout ────────────────────────────────────────────── */}
            <div className={`flex flex-col lg:flex-row gap-4 ${isFullscreen ? 'flex-1 overflow-hidden' : 'min-h-[600px]'}`}>

                {/* ── Left: Sector Grid ──────────────────────────────────── */}
                <div className={`bg-surface/50 rounded-xl border border-border-secondary p-3 ${isFullscreen ? 'lg:w-64 shrink-0 overflow-y-auto' : 'flex-1'}`}>
                    {loadingSectors ? (
                        <div className="flex h-full items-center justify-center text-text-muted gap-2">
                            <RefreshCw className="animate-spin" size={16} /> Loading…
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {sectors.map(sector => (
                                <SectorPill
                                    key={sector.name}
                                    sector={sector}
                                    isSelected={selectedSector === sector.name}
                                    onClick={() => setSelectedSector(sector.name)}
                                    isDark={isDark}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right: Details panel ───────────────────────────────── */}
                <div className={`bg-background rounded-xl border border-border-secondary flex flex-col overflow-hidden shadow-2xl ${isFullscreen ? 'flex-1' : 'flex-[1.4]'}`}>

                    {/* Panel header */}
                    <div className="px-4 py-3 border-b border-border-secondary bg-surface/80 flex flex-wrap gap-2 items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider">
                                {selectedSector || '—'} F&amp;O
                            </h3>
                            <span className="bg-card text-text-muted text-[10px] px-2 py-0.5 rounded-full font-mono">
                                {filteredConstituents.length}/{details?.constituents.length ?? 0}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Color mode — only for treemap */}
                            {isAdvanceView && (
                                <div className="flex items-center gap-0.5 bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                                    {colorModes.map(({ mode, label, Icon }) => (
                                        <button
                                            key={mode}
                                            onClick={() => setColorMode(mode)}
                                            title={label}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all
                                                ${colorMode === mode ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                                        >
                                            <Icon size={10} />
                                            <span className="hidden sm:inline">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Filter chips — only for list */}
                            {!isAdvanceView && (
                                <div className="flex items-center gap-1 flex-wrap">
                                    <Filter size={11} className="text-text-muted" />
                                    {filterChips.map(({ type, label, color }) => (
                                        <button
                                            key={type}
                                            onClick={() => setFilterType(type)}
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all
                                                ${filterType === type
                                                    ? `${color} border-border-primary scale-105`
                                                    : 'bg-surface/50 text-text-muted border-border-secondary hover:border-border-primary'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* View toggle */}
                            <div className="flex bg-background rounded-lg p-0.5 border border-border-primary">
                                <button
                                    onClick={() => setIsAdvanceView(false)}
                                    className={`p-1.5 rounded transition-colors ${!isAdvanceView ? 'bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                    title="List"
                                ><List size={14} /></button>
                                <button
                                    onClick={() => setIsAdvanceView(true)}
                                    className={`p-1.5 rounded transition-colors ${isAdvanceView ? 'bg-emerald-600 text-white' : 'text-text-muted hover:text-text-primary'}`}
                                    title="Heatmap"
                                ><LayoutGrid size={14} /></button>
                            </div>
                        </div>
                    </div>

                    {/* Panel body */}
                    <div className="flex-1 relative">
                        {isAdvanceView ? (
                            <div className="absolute inset-0 p-3">
                                {loadingDetails
                                    ? <div className="flex h-full items-center justify-center text-slate-500 gap-2"><RefreshCw className="animate-spin" size={16} /> Loading…</div>
                                    : <AdvanceHeatMap
                                        constituents={filteredConstituents}
                                        colorMode={colorMode}
                                        onStockClick={(symbol: string) => {
                                            setTicker(symbol);
                                            if (onNavigate) onNavigate('dashboard');
                                        }}
                                    />
                                }
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 text-[10px] bg-surface/95 backdrop-blur">
                                    <tr>
                                        <th className="w-1 px-0 py-2 bg-surface/95" />
                                        <Th col="name">F&amp;O Scrip</Th>
                                        <Th col="ltp" className="text-right">LTP</Th>
                                        <Th col="changePercent" className="text-right">Chg%</Th>
                                        <Th col="openInterest" className="text-right">Open Interest</Th>
                                        <Th col="oiChangePercent" className="text-right">OI Chg%</Th>
                                        <Th col="volume" className="text-right">Volume</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-secondary/50">
                                    {loadingDetails ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-16 text-text-muted">
                                                <RefreshCw className="animate-spin mx-auto mb-2" size={18} />
                                                Loading…
                                            </td>
                                        </tr>
                                    ) : filteredConstituents.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-slate-600 text-sm">
                                                No stocks match the current filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredConstituents.map(stock => {
                                            const isUp = stock.changePercent >= 0;
                                            const oiUp = (stock.oiChangePercent ?? 0) >= 0;
                                            return (
                                                <tr
                                                    key={stock.symbol}
                                                    onClick={() => {
                                                        setTicker(stock.symbol);
                                                        if (onNavigate) onNavigate('dashboard');
                                                    }}
                                                    className="hover:bg-surface/50 transition-colors cursor-pointer group relative"
                                                >
                                                    {/* Left color stripe */}
                                                    <td className="px-0 py-0 w-1">
                                                        <div className="w-1 h-full absolute left-0 top-0 bottom-0 rounded-r shadow-success/40 shadow-sm"
                                                            style={{ backgroundColor: isUp ? '#10b981' : '#f43f5e', opacity: 0.8 }} />
                                                    </td>
                                                    <td className="pl-4 pr-3 py-2.5 font-medium text-text-secondary group-hover:text-text-primary text-xs">
                                                        <div className="font-bold tracking-tight">{stock.symbol}</div>
                                                        <div className="text-[10px] text-text-muted truncate max-w-[160px]">{stock.name}</div>
                                                    </td>
                                                    <td className={`px-3 py-2.5 text-right font-mono text-xs font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        ₹{stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        {isUp ? <ArrowUpRight className="inline ml-0.5" size={11} /> : <ArrowDownRight className="inline ml-0.5" size={11} />}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-xs">
                                                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${isUp ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                                                            {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right font-mono text-xs text-text-secondary">
                                                        {stock.openInterest ? formatLargeNum(stock.openInterest) : <span className="text-text-muted">—</span>}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-xs">
                                                        {stock.oiChangePercent !== undefined ? (
                                                            <span className={`font-mono font-semibold ${oiUp ? 'text-indigo-500' : 'text-amber-500'}`}>
                                                                {oiUp ? '+' : ''}{stock.oiChangePercent.toFixed(2)}%
                                                            </span>
                                                        ) : <span className="text-text-muted">—</span>}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right font-mono text-xs text-text-secondary">
                                                        {stock.volume ? formatLargeNum(stock.volume) : <span className="text-text-muted">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Footer summary */}
                    {!isAdvanceView && details?.constituents && (
                        <div className="px-4 py-2 border-t border-border-secondary bg-surface/80 flex items-center gap-4 text-[10px] text-text-muted shrink-0">
                            <span>
                                <span className="text-emerald-500 font-bold">
                                    {details.constituents.filter(s => s.changePercent > 0).length}
                                </span> Gainers
                            </span>
                            <span>
                                <span className="text-rose-500 font-bold">
                                    {details.constituents.filter(s => s.changePercent < 0).length}
                                </span> Losers
                            </span>
                            <span className="ml-auto">
                                Avg: <span className={`font-mono font-bold ${getTextColor(
                                    details.constituents.reduce((s, c) => s + c.changePercent, 0) / details.constituents.length,
                                    isDark
                                )}`}>
                                    {(details.constituents.reduce((s, c) => s + c.changePercent, 0) / details.constituents.length).toFixed(2)}%
                                </span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HeatMap;
