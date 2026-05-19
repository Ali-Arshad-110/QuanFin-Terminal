import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useMarketStore } from '../store';
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink, Activity, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, BarChart2, ShieldCheck, Star, CheckCircle2, Download } from 'lucide-react';
import StockLogo from './StockLogo';
import { API_BASE } from '../config/api';

/* ─── Mini Sparkline Trend ──────────────────────────────────────────────── */
const MiniSparkline: React.FC<{ data: number[]; isUp: boolean }> = ({ data, isUp }) => {
    const width = 60;
    const height = 24;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                fill="none"
                stroke={isUp ? '#10b981' : '#f43f5e'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]"
            />
        </svg>
    );
};

/* ─── Detailed Constituents Table ────────────────────────────────────────── */
const DetailedConstituentsTable: React.FC<{
    data: any[];
    isDark: boolean;
    onStockClick: (symbol: string) => void;
    onActionClick?: (action: 'chart' | 'analysis' | 'watchlist', symbol: string, data?: any) => void;
}> = ({ data, isDark, onStockClick, onActionClick }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
        key: 'changePercent',
        direction: 'desc'
    });

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronsUpDown size={10} className="ml-1 opacity-30" />;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp size={10} className="ml-1 text-indigo-400 font-black" /> 
            : <ChevronDown size={10} className="ml-1 text-indigo-400 font-black" />;
    };

    const HeaderCell = ({ label, sortKey, align = 'left' }: { label: string; sortKey?: string; align?: 'left' | 'right' | 'center' }) => (
        <th 
            className={`px-3 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap sticky top-0 z-20 border-b ${
                isDark 
                    ? 'bg-[#0b0f14] text-slate-400 border-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.4)]' 
                    : 'bg-white text-slate-500 border-slate-200 shadow-sm'
            } ${sortKey ? 'cursor-pointer hover:bg-indigo-500/5 transition-colors' : ''}`}
            onClick={() => sortKey && requestSort(sortKey)}
        >
            <div className={`flex items-center ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {label}
                {sortKey && getSortIcon(sortKey)}
            </div>
        </th>
    );

    return (
        <div className={`w-full overflow-hidden rounded-2xl border ${isDark ? 'border-indigo-500/10 bg-[#0b0f14]' : 'border-slate-200 bg-white'} shadow-2xl`}>
            <div className="overflow-x-auto custom-scrollbar h-full max-h-[600px]">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr>
                            <HeaderCell label="SYMBOL / TREND" sortKey="symbol" />
                            <HeaderCell label="OPEN" sortKey="open" align="right" />
                            <HeaderCell label="HIGH" sortKey="high" align="right" />
                            <HeaderCell label="LOW" sortKey="low" align="right" />
                            <HeaderCell label="PREV. CLOSE" sortKey="prevClose" align="right" />
                            <HeaderCell label="LTP" sortKey="ltp" align="right" />
                            <HeaderCell label="INDICATIVE CLOSE" sortKey="indicativeClose" align="right" />
                            <HeaderCell label="CHNG" sortKey="change" align="right" />
                            <HeaderCell label="%CHNG" sortKey="changePercent" align="right" />
                            <HeaderCell label="VOLUME (shares)" sortKey="volume" align="right" />
                            <HeaderCell label="VALUE (₹ Crores)" sortKey="valueCrores" align="right" />
                            <HeaderCell label="52W H" sortKey="yearHigh" align="right" />
                            <HeaderCell label="52W L" sortKey="yearLow" align="right" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/5">
                        {sortedData.map((s) => {
                            const isUp = s.changePercent >= 0;
                            return (
                                <tr 
                                    key={s.symbol}
                                    onClick={() => onStockClick(s.symbol)}
                                    className={`group hover:bg-indigo-500/5 transition-all cursor-pointer border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}
                                >
                                    <td className="px-3 py-2.5 relative group/row">
                                        <div className="flex items-center gap-3">
                                            <StockLogo symbol={s.symbol} name={s.name} size={6} className="shadow-lg group-hover:scale-110 transition-transform" />
                                            <div className="flex flex-col min-w-[80px]">
                                                <span className="text-[11px] font-black text-indigo-400 group-hover:text-indigo-300 transition-colors uppercase leading-none">{s.symbol.replace('.NS','')}</span>
                                                <span className="text-[8px] text-text-muted font-bold truncate max-w-[120px] opacity-60 uppercase mt-0.5">{s.name}</span>
                                            </div>
                                            
                                            {/* Sparkline Trend */}
                                            <div className="ml-auto pr-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                <MiniSparkline 
                                                    isUp={isUp} 
                                                    data={s.trend || [s.open, s.high, s.low, s.ltp, s.ltp * (1 + (Math.random() * 0.01 - 0.005))]} 
                                                />
                                            </div>
                                        </div>

                                        {/* Quick Action Overlay (Appears on far right on hover) */}
                                        <div className="absolute inset-y-0 right-2 flex items-center gap-1.5 opacity-0 group-hover/row:opacity-100 transition-all duration-300 translate-x-4 group-hover/row:translate-x-0 z-10 pointer-events-none group-hover/row:pointer-events-auto">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onActionClick?.('chart', s.symbol); }}
                                                className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 transition-all shadow-lg active:scale-90"
                                                title="View Detailed Chart"
                                            >
                                                <BarChart2 size={12} strokeWidth={3} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onActionClick?.('analysis', s.symbol); }}
                                                className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 transition-all shadow-lg active:scale-90"
                                                title="Stability Analysis"
                                            >
                                                <ShieldCheck size={12} strokeWidth={3} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onActionClick?.('watchlist', s.symbol, s); }}
                                                className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white border border-indigo-500/30 transition-all shadow-lg active:scale-90"
                                                title="Add to Watchlist"
                                            >
                                                <Star size={12} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] font-bold text-text-secondary">{s.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] font-bold text-text-secondary">{s.high.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] font-bold text-text-secondary">{s.low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] font-bold text-text-secondary/70">{s.prevClose.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className={`px-3 py-2.5 text-right font-mono text-[11px] font-black ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {s.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] font-bold text-text-secondary/80">{s.indicativeClose?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className={`px-3 py-2.5 text-right font-mono text-[10px] font-bold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {isUp ? '+' : ''}{s.change.toFixed(2)}
                                    </td>
                                    <td className={`px-3 py-2.5 text-right shrink-0`}>
                                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-black font-mono text-[10px] ${isUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {isUp ? '+' : ''}{s.changePercent.toFixed(2)}%
                                            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] font-bold text-text-secondary/70">{s.volume.toLocaleString('en-IN')}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] font-black text-indigo-400">{s.valueCrores?.toFixed(2)}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] font-bold text-emerald-500/70">{s.yearHigh.toLocaleString('en-IN')}</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-[10px] font-bold text-rose-500/70">{s.yearLow.toLocaleString('en-IN')}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface IndexEntry {
    label: string;
    symbol: string;
    exchange: 'NSE' | 'BSE';
    description: string;
}

interface IndexPrice {
    price: number;
    change: number;
    pct: number;
}

type ExchangeFilter = 'BSE' | 'NSE';

/* ─── Index Data ─────────────────────────────────────────────────────────── */
const NSE_INDICES: IndexEntry[] = [
    { label: 'NIFTY 50', symbol: 'NIFTY 50', exchange: 'NSE', description: 'Top 50 NSE companies' },
    { label: 'BANK NIFTY', symbol: 'NIFTY BANK', exchange: 'NSE', description: 'Banking sector index' },
    { label: 'NIFTY IT', symbol: 'NIFTY IT', exchange: 'NSE', description: 'IT sector index' },
    { label: 'NIFTY AUTO', symbol: 'NIFTY AUTO', exchange: 'NSE', description: 'Automobile sector' },
    { label: 'NIFTY FMCG', symbol: 'NIFTY FMCG', exchange: 'NSE', description: 'FMCG sector index' },
    { label: 'NIFTY PHARMA', symbol: 'NIFTY PHARMA', exchange: 'NSE', description: 'Pharma sector index' },
    { label: 'NIFTY METAL', symbol: 'NIFTY METAL', exchange: 'NSE', description: 'Metals sector index' },
    { label: 'NIFTY REALTY', symbol: 'NIFTY REALTY', exchange: 'NSE', description: 'Real estate index' },
    { label: 'NIFTY MID 50', symbol: 'NIFTY MIDCAP 50', exchange: 'NSE', description: 'Midcap 50 index' },
    { label: 'INDIA VIX', symbol: 'INDIA VIX', exchange: 'NSE', description: 'Volatility index' },
];

const BSE_INDICES: IndexEntry[] = [
    { label: 'SENSEX', symbol: 'SENSEX', exchange: 'BSE', description: 'Top 30 BSE companies' },
    { label: 'BSE MID CAP', symbol: 'BSE MIDCAP', exchange: 'BSE', description: 'Midcap BSE index' },
    { label: 'BSE SM CAP', symbol: 'BSE SMALLCAP', exchange: 'BSE', description: 'Smallcap BSE index' },
    { label: 'BSE 100', symbol: 'BSE 100', exchange: 'BSE', description: 'Top 100 BSE companies' },
    { label: 'BSE 200', symbol: 'BSE 200', exchange: 'BSE', description: 'Top 200 BSE companies' },
    { label: 'BSE AUTO', symbol: 'BSE AUTO', exchange: 'BSE', description: 'BSE Auto sector' },
    { label: 'BSE FMCG', symbol: 'BSE FMCG', exchange: 'BSE', description: 'BSE FMCG sector' },
    { label: 'BSE IT', symbol: 'BSE IT', exchange: 'BSE', description: 'BSE IT sector' },
];

/* ─── Index Logo Map ──────────────────────────────────────────────────────── */
const INDEX_IMAGES: Record<string, string> = {
    'NIFTY 50':    '/assets/indices/nifty50.png',
    'BANK NIFTY':  '/assets/indices/niftybank.png',
    'NIFTY BANK':  '/assets/indices/niftybank.png',
    'NIFTY IT':    '/assets/indices/niftyit.png',
    'NIFTY AUTO':  '/assets/indices/niftyauto.png',
    'NIFTY FMCG':  '/assets/indices/niftyfmcg.png',
    'SENSEX':      '/assets/indices/sensex.png',
    'BSE BANK':    '/assets/indices/bsebank.png',
    'BSE IT':      '/assets/indices/bseit.png',
    'BSE AUTO':    '/assets/indices/bseauto.png',
    'BSE FMCG':    '/assets/indices/bsegmcg.png',
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function getPieSliceColor(pct: number, index: number, exchange: 'NSE' | 'BSE'): string {
    if (pct > 0) return exchange === 'NSE'
        ? `rgba(16,185,129,${Math.min(0.4 + Math.abs(pct) * 0.15, 0.95)})`
        : `rgba(52,211,153,${Math.min(0.4 + Math.abs(pct) * 0.15, 0.95)})`;
    if (pct < 0) return exchange === 'NSE'
        ? `rgba(239,68,68,${Math.min(0.4 + Math.abs(pct) * 0.15, 0.95)})`
        : `rgba(251,113,133,${Math.min(0.4 + Math.abs(pct) * 0.15, 0.95)})`;
    
    const colors = exchange === 'NSE' 
        ? ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#06b6d4', '#0ea5e9', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444']
        : ['#f97316', '#fb923c', '#fbbf24', '#facc15', '#4ade80', '#34d399', '#2dd4bf', '#60a5fa'];
    return colors[index % colors.length];
}

/* ─── Donut Pie Chart ─────────────────────────────────────────────────────── */
const DonutPieChart: React.FC<{
    indices: IndexEntry[];
    prices: Record<string, IndexPrice>;
    exchange: 'NSE' | 'BSE';
    onSliceClick: (symbol: string) => void;
    isDark: boolean;
    size?: number;
}> = ({ indices, prices, exchange, onSliceClick, isDark, size = 220 }) => {
    const [hovered, setHovered] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; entry: IndexEntry } | null>(null);

    const center = size / 2;
    const outerR = size / 2 - 8;
    const innerR = outerR * 0.55;

    const values = indices.map(idx => Math.max(Math.abs(prices[idx.symbol]?.pct ?? 0), 0.5));
    const total = values.reduce((s, v) => s + v, 0) || indices.length;

    let cumAngle = -90;
    const slices = indices.map((idx, i) => {
        const pct = prices[idx.symbol]?.pct ?? 0;
        const sliceDeg = (values[i] / total) * 360;
        const startDeg = cumAngle;
        const endDeg = cumAngle + (sliceDeg === 360 ? 359.99 : sliceDeg);
        cumAngle += sliceDeg;

        const startRad = (startDeg * Math.PI) / 180;
        const endRad = (endDeg * Math.PI) / 180;

        const r = hovered === i ? outerR + 6 : outerR;
        const x1 = center + r * Math.cos(startRad);
        const y1 = center + r * Math.sin(startRad);
        const x2 = center + r * Math.cos(endRad);
        const y2 = center + r * Math.sin(endRad);
        const x3 = center + innerR * Math.cos(endRad);
        const y3 = center + innerR * Math.sin(endRad);
        const x4 = center + innerR * Math.cos(startRad);
        const y4 = center + innerR * Math.sin(startRad);

        const large = sliceDeg > 180 ? 1 : 0;
        const path = `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${large} 0 ${x4},${y4} Z`;

        const midRad = ((startDeg + endDeg) / 2 * Math.PI) / 180;
        const labelR = (r + innerR) / 2;
        const lx = center + labelR * Math.cos(midRad);
        const ly = center + labelR * Math.sin(midRad);

        return { path, idx, pct, lx, ly, sliceDeg, i };
    });

    const avgPct = indices.length
        ? indices.reduce((s, idx) => s + (prices[idx.symbol]?.pct ?? 0), 0) / indices.length
        : 0;

    if (size === 0) return null;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${exchange === 'NSE' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                {exchange} Market Intelligence
            </div>
            <div className="relative">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
                    {slices.map(({ path, idx, pct, lx, ly, sliceDeg, i }) => {
                        const color = getPieSliceColor(pct, i, exchange);
                        const isHovered = hovered === i;
                        return (
                            <g key={idx.symbol}>
                                <path
                                    d={path}
                                    fill={color}
                                    stroke={isDark ? '#0b0f14' : '#fff'}
                                    strokeWidth={isHovered ? 2 : 1.5}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none',
                                        opacity: hovered !== null && !isHovered ? 0.6 : 1,
                                    }}
                                    onMouseEnter={(e) => {
                                        setHovered(i);
                                        setTooltip({ x: e.clientX, y: e.clientY, entry: idx });
                                    }}
                                    onMouseMove={(e) => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                                    onMouseLeave={() => { setHovered(null); setTooltip(null); }}
                                    onClick={() => onSliceClick(idx.symbol)}
                                />
                                {sliceDeg > 22 && (
                                    <text
                                        x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                                        fontSize={sliceDeg > 45 ? 9 : 7} fill="white" fontWeight="900"
                                        style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                        {idx.label.length > 8 ? idx.label.slice(0, 7) : idx.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                    <text x={center} y={center - 14} textAnchor="middle" fontSize={12} fontWeight="900" fill={isDark ? '#e2e8f0' : '#1e293b'}>{indices.length}</text>
                    <text x={center} y={center} textAnchor="middle" fontSize={8} fill={isDark ? '#94a3b8' : '#64748b'} fontWeight="800">INDICES</text>
                    <text x={center} y={center + 14} textAnchor="middle" fontSize={11} fontWeight="900" fill={avgPct >= 0 ? '#10b981' : '#ef4444'}>
                        {avgPct >= 0 ? '+' : ''}{avgPct.toFixed(2)}%
                    </text>
                </svg>
                {tooltip && (
                    <div
                        className={`fixed z-[9999] pointer-events-none px-3 py-2 rounded-xl shadow-2xl border text-xs ${isDark ? 'bg-[#0f1419] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}
                        style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
                    >
                        <div className="font-black text-[11px] mb-0.5">{tooltip.entry.label}</div>
                        <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} mb-1`}>{tooltip.entry.description}</div>
                        {prices[tooltip.entry.symbol] && (
                            <div className="flex items-center gap-2">
                                <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>₹{prices[tooltip.entry.symbol].price.toLocaleString('en-IN')}</span>
                                <span className={`font-bold ${prices[tooltip.entry.symbol].pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {prices[tooltip.entry.symbol].pct >= 0 ? '+' : ''}{prices[tooltip.entry.symbol].pct.toFixed(2)}%
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─── Index Row ───────────────────────────────────────────────────────────── */
const IndexRow: React.FC<{
    entry: IndexEntry;
    price: IndexPrice | undefined;
    isDark: boolean;
    onClick: () => void;
    exchange: 'NSE' | 'BSE';
}> = ({ entry, price, isDark, onClick, exchange }) => {
    const isUp = (price?.pct ?? 0) >= 0;
    return (
        <button
            onClick={onClick}
            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left border ${isDark
                ? 'hover:bg-indigo-500/10 border-transparent hover:border-indigo-500/20'
                : 'hover:bg-slate-50 border-transparent hover:border-slate-200 shadow-sm'
                }`}
        >
            {INDEX_IMAGES[entry.label] ? (
                <img
                    src={INDEX_IMAGES[entry.label]}
                    alt={entry.label}
                    className="w-8 h-8 rounded-lg object-contain flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                />
            ) : (
                <div className={`w-0.5 h-8 rounded-full shrink-0 ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            )}
            <div className="flex-1 min-w-0">
                <div className={`text-xs font-black truncate uppercase tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{entry.label}</div>
                {price && <div className={`text-[10px] font-mono font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>₹{price.price.toLocaleString('en-IN')}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {price ? (
                    <>
                        <div className={`flex items-center gap-2`}>
                            <span className={`text-[10px] font-bold font-mono ${isUp ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                                {isUp ? '+' : ''}{price.change.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                            <div className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-lg ${isUp ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                                {isUp ? '+' : ''}{price.pct.toFixed(2)}%
                            </div>
                        </div>
                        <ExternalLink size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${exchange === 'NSE' ? 'text-blue-400' : 'text-orange-400'}`} />
                    </>
                ) : (
                    <span className={`text-[10px] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>FETCHING...</span>
                )}
            </div>
        </button>
    );
};

/* ─── Exchange Toggle ────────────────────────────────────────────────────── */
const ExchangeToggle: React.FC<{
    active: ExchangeFilter;
    onChange: (f: ExchangeFilter) => void;
    isDark: boolean;
}> = ({ active, onChange, isDark }) => (
    <div className={`flex gap-1 p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
        {(['NSE', 'BSE'] as ExchangeFilter[]).map(key => (
            <button
                key={key}
                onClick={() => onChange(key)}
                className={`px-5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    active === key
                        ? key === 'NSE' ? 'bg-blue-500 text-white shadow-lg' : 'bg-orange-500 text-white shadow-lg'
                        : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                {key}
            </button>
        ))}
    </div>
);

/* ─── Main Component ──────────────────────────────────────────────────────── */
interface IndicesExchangeViewProps {
    onNavigate?: (view: string) => void;
}

const IndicesExchangeView: React.FC<IndicesExchangeViewProps> = ({ onNavigate }) => {
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');
    const { setTicker, addToWatchlist } = useMarketStore();

    const [exchangeFilter, setExchangeFilter] = useState<ExchangeFilter>('NSE');
    const [selectedIndex, setSelectedIndex] = useState<IndexEntry | null>(null);
    const [constituents, setConstituents] = useState<any[]>([]);
    const [isFetchingConstituents, setIsFetchingConstituents] = useState(false);
    const [prices, setPrices] = useState<Record<string, IndexPrice>>({});
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [notification, setNotification] = useState<{ message: string; symbol: string } | null>(null);

    const allIndices = useMemo(() => [...NSE_INDICES, ...BSE_INDICES], []);

    const fetchPrices = useCallback(async () => {
        setLoading(true);
        const results: Record<string, IndexPrice> = {};
        await Promise.allSettled(allIndices.map(async (idx) => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || `${API_BASE}`;
                const res = await fetch(`${API_URL}/api/v1/analyze/${encodeURIComponent(idx.symbol)}?interval=1d`);
                if (!res.ok) return;
                const json = await res.json();
                const data: any[] = json.data ?? [];
                if (data.length < 2) return;
                const last = data[data.length - 1];
                const prev = data[data.length - 2];
                const price = Number(last.close ?? last.ltp ?? 0);
                const change = price - Number(prev.close ?? 0);
                const pct = prev.close ? (change / Number(prev.close)) * 100 : 0;
                results[idx.symbol] = { price, change, pct };
            } catch { /* Failures Ignore */ }
        }));
        setPrices(results);
        setLastUpdated(new Date());
        setLoading(false);
    }, [allIndices]);

    const fetchConstituents = useCallback(async (indexLabel: string) => {
        setIsFetchingConstituents(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || `${API_BASE}`;
            const res = await fetch(`${API_URL}/api/v1/market/breadth/${encodeURIComponent(indexLabel)}`);
            const json = await res.json();
            if (json.status === 'success') setConstituents(json.data || []);
        } catch (e) { console.error(e); } finally { setIsFetchingConstituents(false); }
    }, []);

    useEffect(() => {
        fetchPrices();
        const interval = setInterval(fetchPrices, 60_000);
        return () => clearInterval(interval);
    }, [fetchPrices]);

    const currentIndices = exchangeFilter === 'NSE' ? NSE_INDICES : BSE_INDICES;

    const handleIndexClick = useCallback((symbol: string) => {
        const indexEntry = currentIndices.find(i => i.symbol === symbol);
        if (indexEntry) {
            setSelectedIndex(indexEntry);
            fetchConstituents(indexEntry.label);
            return;
        }
        setTicker(symbol);
        if (onNavigate) onNavigate('dashboard');
    }, [currentIndices, fetchConstituents, setTicker, onNavigate]);

    const handleQuickAction = useCallback((action: 'chart' | 'analysis' | 'watchlist', symbol: string, data?: any) => {
        setTicker(symbol);
        if (action === 'chart') {
            if (onNavigate) onNavigate('dashboard');
        } else if (action === 'analysis') {
            if (onNavigate) onNavigate('stability');
        } else if (action === 'watchlist' && data) {
            addToWatchlist({
                symbol: data.symbol,
                price: data.ltp,
                change: data.change,
                changePercent: data.changePercent,
                volume: data.volume,
                sector: data.sector || 'General'
            });
            setNotification({ message: 'Added to Watchlist', symbol: data.symbol });
        }
    }, [setTicker, onNavigate, addToWatchlist]);

    const handleExportCSV = useCallback(() => {
        if (!constituents.length || !selectedIndex) return;
        
        const headers = ['Symbol', 'Company Name', 'Open', 'High', 'Low', 'LTP', 'Change', '% Change', 'Volume', 'Value (Cr)', '52W High', '52W Low'];
        const csvRows = [headers.join(',')];

        constituents.forEach(s => {
            const row = [
                s.symbol,
                `"${s.name.replace(/"/g, '""')}"`,
                s.open,
                s.high,
                s.low,
                s.ltp,
                s.change,
                s.changePercent,
                s.volume,
                s.valueCrores?.toFixed(2) || '0.00',
                s.yearHigh,
                s.yearLow
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const fileName = `${selectedIndex.label.replace(/\s+/g, '_')}_Research_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setNotification({ message: 'Research Exported', symbol: selectedIndex.label });
    }, [constituents, selectedIndex]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleBack = () => {
        setSelectedIndex(null);
        setConstituents([]);
    };

    const nseAvg = NSE_INDICES.reduce((s, i) => s + (prices[i.symbol]?.pct ?? 0), 0) / NSE_INDICES.length;
    const bseAvg = BSE_INDICES.reduce((s, i) => s + (prices[i.symbol]?.pct ?? 0), 0) / BSE_INDICES.length;

    return (
        <div className={`flex flex-col h-full overflow-hidden ${isDark ? 'bg-[#0b0f14]' : 'bg-slate-50'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? 'border-slate-800 bg-[#0b0f14]' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h1 className={`text-xl font-black uppercase tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            FlowMap <span className="text-indigo-500">Terminal</span>
                        </h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Live Intelligence</span>
                            </div>
                            {lastUpdated && (
                                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                    • {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <ExchangeToggle active={exchangeFilter} onChange={setExchangeFilter} isDark={isDark} />
                    <button 
                        onClick={fetchPrices} 
                        disabled={loading} 
                        className={`p-3 rounded-xl border transition-all ${isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'} ${loading ? 'opacity-50' : ''}`}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Collapse Toggle Button (Floating on the border) */}
                <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={`absolute z-40 top-1/2 -translate-y-1/2 left-0 transition-all duration-300 flex items-center justify-center w-6 h-12 rounded-r-xl border border-l-0 shadow-lg ${
                        isDark 
                            ? 'bg-[#1a1f26] border-slate-700 text-indigo-400 hover:text-indigo-300' 
                            : 'bg-white border-slate-200 text-indigo-600 hover:text-indigo-500'
                    }`}
                    style={{ left: isSidebarCollapsed ? '0px' : '340px' }}
                    title={isSidebarCollapsed ? "Expand Analytics" : "Collapse Analytics"}
                >
                    {isSidebarCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
                </button>

                {/* Side Analytics Panel */}
                <div 
                    className={`shrink-0 border-r flex flex-col gap-8 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300 ease-in-out ${
                        isDark ? 'border-slate-800 bg-[#0b0f14]' : 'border-slate-200 bg-white'
                    } ${isSidebarCollapsed ? 'w-0 opacity-0 p-0' : 'w-[340px] p-6'}`}
                >
                    <div className="flex flex-col gap-8 min-w-[292px]">
                        <DonutPieChart 
                            indices={currentIndices} 
                            prices={prices} 
                            exchange={exchangeFilter} 
                            onSliceClick={handleIndexClick} 
                            isDark={isDark} 
                            size={280} 
                        />

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] block">Market Performance</span>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">NSE Breadth</span>
                                            <span className={`text-xs font-black font-mono ${nseAvg >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {nseAvg >= 0 ? '+' : ''}{nseAvg.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(Math.max(50 + nseAvg * 5, 10), 90)}%` }} />
                                        </div>
                                    </div>
                                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">BSE Breadth</span>
                                            <span className={`text-xs font-black font-mono ${bseAvg >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {bseAvg >= 0 ? '+' : ''}{bseAvg.toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-800/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${Math.min(Math.max(50 + bseAvg * 5, 10), 90)}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={14} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Terminal Intelligence</span>
                                </div>
                                <p className={`text-[10px] font-bold leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                                    Data terminal synchronized with exchange liquidity providers. High-density constituent tracking enabled.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Content Area (The Table/List) */}
                <div className="flex-1 flex flex-col overflow-hidden bg-surface/30">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-6">
                        {isFetchingConstituents ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                                <RefreshCw size={40} className="animate-spin text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Loading Constituents...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full animate-in fade-in duration-500">
                                <div className="flex items-center justify-between mb-6 sticky top-0 z-30 py-2 bg-transparent backdrop-blur-sm">
                                    <div>
                                        <h2 className={`text-sm font-black uppercase tracking-[0.1em] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {selectedIndex ? `${selectedIndex.label} Constituents` : `${exchangeFilter} Major Indices`}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-8 h-1 bg-indigo-500 rounded-full" />
                                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest opacity-60">
                                                {selectedIndex ? 'Market Matrix' : 'Exchange Overview'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={handleExportCSV}
                                            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black tracking-widest hover:bg-emerald-500/20 transition-all uppercase border border-emerald-500/20 shadow-lg"
                                        >
                                            <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                                            Export Research (CSV)
                                        </button>
                                        
                                        {selectedIndex && (
                                            <button 
                                                onClick={handleBack} 
                                                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-[10px] font-black tracking-widest hover:bg-indigo-500/20 transition-all uppercase border border-indigo-500/20 shadow-lg"
                                            >
                                                <Activity size={14} className="rotate-180 transition-transform group-hover:-translate-x-1" />
                                                Back to Global View
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    {selectedIndex ? (
                                        <DetailedConstituentsTable 
                                            data={constituents} 
                                            isDark={isDark} 
                                            onStockClick={handleIndexClick} 
                                            onActionClick={handleQuickAction}
                                        />
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-8">
                                            {currentIndices.map(idx => (
                                                <IndexRow 
                                                    key={idx.symbol} 
                                                    entry={idx} 
                                                    price={prices[idx.symbol]} 
                                                    isDark={isDark} 
                                                    onClick={() => handleIndexClick(idx.symbol)} 
                                                    exchange={exchangeFilter} 
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Global Notification Toast */}
            {notification && (
                <div className={`fixed bottom-8 right-8 z-[5000] animate-in slide-in-from-right-10 fade-in duration-300`}>
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl ${
                        isDark ? 'bg-slate-900 border-emerald-500/30 text-white' : 'bg-white border-emerald-200 text-slate-900'
                    }`}>
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <CheckCircle2 size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Success</span>
                            <span className="text-xs font-bold font-mono">
                                {notification.symbol.replace('.NS','')} {notification.message}
                            </span>
                        </div>
                        <button 
                            onClick={() => setNotification(null)}
                            className="ml-2 text-slate-500 hover:text-white transition-colors"
                        >
                            <ChevronDown size={14} className="rotate-90" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndicesExchangeView;
