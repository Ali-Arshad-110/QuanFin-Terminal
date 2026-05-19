import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../theme/ThemeProvider';
import { API_BASE } from '../config/api';

/* ─── Types ─────────────────────────────────────────────────────────────── */
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

interface Props {
    constituents: Constituent[];
    colorMode?: ColorMode;
    onStockClick?: (symbol: string) => void;
}

interface Rect {
    x: number; y: number;
    width: number; height: number;
    data: Constituent & { value: number };
}

export type ColorMode = 'change' | 'oi' | 'volume';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function intensityColor(value: number, maxAbs: number = 5, isDark: boolean = true): string {
    const abs = Math.min(Math.abs(value), maxAbs);
    const intensity = abs / maxAbs; // 0 … 1

    if (value > 0) {
        if (isDark) {
            // deep emerald at intensity=1, muted at 0
            const r = Math.round(4 + intensity * 4);
            const g = Math.round(120 + intensity * 65);
            const b = Math.round(80 - intensity * 30);
            return `rgba(${r},${g},${b},${0.35 + intensity * 0.65})`;
        } else {
            // Lighter pastel emerald for light mode, solid opacity but lighter shading
            const r = Math.round(230 - intensity * 130);
            const g = Math.round(250 - intensity * 50);
            const b = Math.round(230 - intensity * 130);
            return `rgba(${r},${g},${b},1)`;
        }
    } else if (value < 0) {
        if (isDark) {
            const r = Math.round(180 + intensity * 64);
            const g = Math.round(30 - intensity * 10);
            const b = Math.round(35 - intensity * 15);
            return `rgba(${r},${g},${b},${0.35 + intensity * 0.65})`;
        } else {
            // Lighter pastel red for light mode
            const r = Math.round(255 - intensity * 25);
            const g = Math.round(230 - intensity * 130);
            const b = Math.round(230 - intensity * 130);
            return `rgba(${r},${g},${b},1)`;
        }
    }
    return isDark ? 'rgba(71,85,105,0.6)' : 'rgba(226,232,240,1)'; // neutral slate vs slate-200
}

function formatLargeNum(n: number | string | undefined): string {
    if (n === undefined || n === null) return 'N/A';
    const num = typeof n === 'string' ? parseFloat(n.replace(/,/g, '')) : n;
    if (isNaN(num)) return String(n);
    if (num >= 1e7) return (num / 1e7).toFixed(2) + ' Cr';
    if (num >= 1e5) return (num / 1e5).toFixed(2) + ' L';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + ' K';
    return num.toFixed(0);
}

/* ─── Squarified Treemap Algorithm ─────────────────────────────────────── */
function buildLayout(data: (Constituent & { value: number })[]): Rect[] {
    if (data.length === 0) return [];
    const rects: Rect[] = [];

    const split = (items: typeof data, x: number, y: number, w: number, h: number) => {
        if (items.length === 0) return;
        if (items.length === 1) { rects.push({ x, y, width: w, height: h, data: items[0] }); return; }

        const total = items.reduce((s, i) => s + i.value, 0);
        const half = total / 2;
        let sum = 0, idx = 0;
        for (let i = 0; i < items.length; i++) {
            sum += items[i].value;
            if (sum >= half) { idx = i + 1; break; }
        }
        idx = Math.max(1, Math.min(idx, items.length - 1));

        const g1 = items.slice(0, idx);
        const g2 = items.slice(idx);
        const ratio = g1.reduce((s, i) => s + i.value, 0) / total;

        if (w > h) {
            const w1 = w * ratio;
            split(g1, x, y, w1, h);
            split(g2, x + w1, y, w - w1, h);
        } else {
            const h1 = h * ratio;
            split(g1, x, y, w, h1);
            split(g2, x, y + h1, w, h - h1);
        }
    };
    split(data, 0, 0, 100, 100);
    return rects;
}

/* ─── Sparkline mini SVG ─────────────────────────────────────────────────── */
const Sparkline: React.FC<{ symbol: string; color: string }> = ({ symbol, color }) => {
    const [points, setPoints] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        axios.get(`${API_BASE}/api/v1/analyze/${encodeURIComponent(symbol)}?interval=1d`)
            .then(r => {
                if (cancelled) return;
                const candles = (r.data?.data ?? []).slice(-10);
                setPoints(candles.map((c: any) => c.close ?? c.Close ?? 0));
            })
            .catch(() => { })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [symbol]);

    if (loading) return <div className="w-full h-8 animate-pulse bg-white/10 rounded" />;
    if (points.length < 2) return null;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const W = 120, H = 32;
    const step = W / (points.length - 1);
    const toY = (v: number) => H - ((v - min) / range) * H;
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${toY(p).toFixed(1)}`).join(' ');

    return (
        <svg width={W} height={H} className="overflow-visible">
            <polyline
                points={points.map((p, i) => `${(i * step).toFixed(1)},${toY(p).toFixed(1)}`).join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            {/* Fill */}
            <path d={`${d} L${W},${H} L0,${H} Z`} fill={color} fillOpacity="0.12" />
        </svg>
    );
};

/* ─── Rich Floating Tooltip ─────────────────────────────────────────────── */
interface TooltipData {
    stock: Constituent;
    x: number;
    y: number;
}
const FloatingTooltip: React.FC<{ data: TooltipData }> = ({ data }) => {
    const { stock, x, y } = data;
    const isUp = stock.changePercent >= 0;
    const color = isUp ? '#10b981' : '#f43f5e';

    // Clamp position so tooltip stays inside viewport
    const TW = 220, TH = 200;
    const vpW = window.innerWidth, vpH = window.innerHeight;
    const left = Math.min(x + 12, vpW - TW - 8);
    const top = Math.min(y + 12, vpH - TH - 8);

    return (
        <div
            className="fixed z-[200] pointer-events-none"
            style={{ left, top, width: TW }}
        >
            <div className="bg-card border border-border-primary rounded-xl shadow-2xl p-3 space-y-2.5 backdrop-blur-sm">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-sm font-bold text-text-primary">{stock.symbol}</div>
                        <div className="text-[10px] text-text-muted truncate max-w-[130px]">{stock.name}</div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                </div>

                {/* Price row */}
                <div className="flex gap-3 text-xs">
                    <div>
                        <div className="text-text-muted text-[9px] uppercase font-bold tracking-wider">LTP</div>
                        <div className="font-mono font-bold" style={{ color }}>₹{stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                        <div className="text-text-muted text-[9px] uppercase font-bold tracking-wider">Change</div>
                        <div className={`font-mono font-semibold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isUp ? '+' : ''}₹{stock.change?.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* OI + Volume */}
                <div className="grid grid-cols-2 gap-2">
                    {stock.openInterest && (
                        <div className="bg-surface/60 border border-border-secondary/30 rounded p-1.5">
                            <div className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Open Interest</div>
                            <div className="text-xs font-mono text-text-secondary">{formatLargeNum(stock.openInterest)}</div>
                        </div>
                    )}
                    {stock.oiChangePercent !== undefined && (
                        <div className="bg-surface/60 border border-border-secondary/30 rounded p-1.5">
                            <div className="text-[9px] text-text-muted uppercase font-bold tracking-wider">OI Change</div>
                            <div className={`text-xs font-mono font-bold ${(stock.oiChangePercent ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {(stock.oiChangePercent ?? 0) >= 0 ? '+' : ''}{stock.oiChangePercent?.toFixed(2)}%
                            </div>
                        </div>
                    )}
                    {stock.volume !== undefined && (
                        <div className="bg-surface/60 border border-border-secondary/30 rounded p-1.5 col-span-2">
                            <div className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Volume</div>
                            <div className="text-xs font-mono text-text-secondary">{formatLargeNum(stock.volume)}</div>
                        </div>
                    )}
                </div>

                {/* Sparkline */}
                <div>
                    <div className="text-[9px] text-text-muted uppercase font-bold tracking-wider mb-1">10-Day Price</div>
                    <Sparkline symbol={stock.symbol} color={color} />
                </div>
            </div>
        </div>
    );
};

/* ─── Main AdvanceHeatMap ────────────────────────────────────────────────── */
const AdvanceHeatMap: React.FC<Props> = ({ constituents, colorMode = 'change', onStockClick }) => {
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const data = useMemo(() => {
        return constituents
            .map(c => ({
                ...c,
                value: Math.abs(c.changePercent) || 0.01,
            }))
            .sort((a, b) => b.value - a.value);
    }, [constituents]);

    const layout = useMemo(() => buildLayout(data), [data]);

    // Compute per-stock color value based on mode
    const maxAbsOI = useMemo(() => Math.max(...data.map(d => Math.abs(d.oiChangePercent ?? 0)), 1), [data]);
    const maxVolume = useMemo(() => Math.max(...data.map(d => d.volume ?? 0), 1), [data]);

    const getColorValue = useCallback((stock: Constituent): number => {
        if (colorMode === 'oi') return stock.oiChangePercent ?? 0;
        if (colorMode === 'volume') {
            // normalize volume to a -5..+5 scale relative to max
            const v = stock.volume ?? 0;
            return (v / maxVolume) * 5 * (stock.changePercent >= 0 ? 1 : -1);
        }
        return stock.changePercent;
    }, [colorMode, maxAbsOI, maxVolume]);

    const handleMouseEnter = useCallback((e: React.MouseEvent, stock: Constituent) => {
        setTooltip({ stock, x: e.clientX, y: e.clientY });
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : t);
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full relative bg-background rounded-xl overflow-hidden border border-border-secondary/50 transition-colors duration-300">
            {layout.map((rect) => {
                const colorVal = getColorValue(rect.data);
                const bgColor = intensityColor(colorVal, colorMode === 'oi' ? maxAbsOI : 5, isDark);
                const isUp = rect.data.changePercent >= 0;
                const fontSize = Math.min(Math.max(rect.width * 0.18, 9), 22);

                return (
                    <div
                        key={rect.data.symbol}
                        style={{
                            position: 'absolute',
                            left: `${rect.x}%`,
                            top: `${rect.y}%`,
                            width: `${rect.width}%`,
                            height: `${rect.height}%`,
                            backgroundColor: bgColor,
                            border: '1px solid rgba(0,0,0,0.25)',
                            transition: 'filter 0.15s',
                        }}
                        className="flex flex-col items-center justify-center cursor-pointer hover:z-20 hover:brightness-125 overflow-hidden group"
                        onClick={() => {
                            onStockClick?.(rect.data.symbol);
                        }}
                        onMouseEnter={e => handleMouseEnter(e, rect.data)}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={() => setTooltip(null)}
                    >
                        {rect.width > 4 && rect.height > 4 && (
                            <div className="text-center px-0.5 pointer-events-none select-none">
                                <div
                                    className={`font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'} drop-shadow-sm`}
                                    style={{ fontSize }}
                                >
                                    {rect.data.symbol}
                                </div>
                                {rect.width > 7 && rect.height > 7 && (
                                    <div
                                        className={`font-mono font-bold leading-tight ${isUp
                                            ? (isDark ? 'text-emerald-300' : 'text-emerald-800')
                                            : (isDark ? 'text-rose-300' : 'text-rose-800')
                                            }`}
                                        style={{ fontSize: Math.max(fontSize * 0.7, 9) }}
                                    >
                                        {isUp ? '+' : ''}{rect.data.changePercent.toFixed(2)}%
                                    </div>
                                )}
                                {rect.width > 10 && rect.height > 10 && (
                                    <div
                                        className={`leading-tight ${isDark ? 'text-white/70' : 'text-slate-700 font-semibold'}`}
                                        style={{ fontSize: Math.max(fontSize * 0.6, 8) }}
                                    >
                                        ₹{rect.data.ltp.toFixed(1)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Top-left change bar */}
                        <div
                            className="absolute top-0 left-0 h-0.5 transition-all"
                            style={{
                                width: `${Math.min(Math.abs(rect.data.changePercent) / 5 * 100, 100)}%`,
                                backgroundColor: isUp ? '#34d399' : '#fb7185',
                            }}
                        />
                    </div>
                );
            })}

            {layout.length === 0 && (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                    No data available
                </div>
            )}

            {/* Floating Tooltip */}
            {tooltip && (
                <FloatingTooltip
                    data={tooltip}
                />
            )}
        </div>
    );
};

export default AdvanceHeatMap;
