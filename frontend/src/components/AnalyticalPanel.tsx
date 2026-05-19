import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import axios from 'axios';
import {
    AlertCircle,
    LineChart,
    Settings,
    Activity,
    Target
} from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { PanelConfig } from '../store/workspaceStore';
import { useTheme } from '../theme/ThemeProvider';
import { extractErrorMessage } from '../utils/errorUtils';
import { getSessionLines } from '../utils/sessionTiming';
import { API_BASE } from '../config/api';

interface AnalyticalPanelProps {
    id: string;
    config: PanelConfig;
    isMaximized?: boolean;
    syncSettings?: {
        timeframe: boolean;
        crosshair: boolean;
        zoom: boolean;
        indicators: boolean;
    };
}

const INTERVALS = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '1d', value: '1d' },
];

const AnalyticalPanel: React.FC<AnalyticalPanelProps> = ({ id, config, syncSettings }) => {
    const {
        updatePanelConfig,
        activePanelId,
        setActivePanelId
    } = useWorkspaceStore();

    const { themeMode } = useTheme();
    const isDark = themeMode === 'dark';
    const isActive = activePanelId === id;

    // ─── State ──────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showIntervalMenu, setShowIntervalMenu] = useState(false);
    const [chartType, setChartType] = useState<'Candle' | 'Line' | 'Area'>(config.type === 'chart' ? 'Candle' : 'Area');
    const [ltpInfo, setLtpInfo] = useState({ price: 0, changePercent: 0 });
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'chart' | 'axis' } | null>(null);
    const [sessionStyle, setSessionStyle] = useState({ type: 'dashed', width: 1 });

    // ─── Refs ───────────────────────────────────────────────────────────
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<any> | null>(null);
    const chartDataRef = useRef<any[]>([]);
    const prevTickerRef = useRef(config.ticker);
    const prevTimeframeRef = useRef(config.timeframe);
    const isSyncingRef = useRef(false);

    // ─── Chart Aesthetics ──────────────────────────────────────────────
    const colors = useMemo(() => ({
        up: '#10b981',
        down: '#f43f5e',
        price: isDark ? '#6366f1' : '#4f46e5',
        background: isDark ? 'transparent' : '#ffffff',
        text: isDark ? '#94a3b8' : '#64748b',
        grid: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.5)',
        gradientTop: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.15)',
        gradientBottom: 'rgba(99, 102, 241, 0)',
        sessionLine: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    }), [isDark]);

    // ─── Session Breaks Logic ──────────────────────────────────────────
    const drawSessionBreaks = useCallback(() => {
        if (!chartRef.current || chartDataRef.current.length === 0 || config.timeframe === '1d') {
            const existing = containerRef.current?.querySelector('.session-breaks-overlay');
            if (existing) existing.remove();
            return;
        }

        const data = chartDataRef.current;
        const lineConfigs = getSessionLines(data.map(d => d.time));
        const timeScale = chartRef.current.timeScale();

        let overlay = containerRef.current?.querySelector('.session-breaks-overlay') as HTMLCanvasElement;
        if (!overlay && containerRef.current) {
            overlay = document.createElement('canvas');
            overlay.className = 'session-breaks-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '5';
            containerRef.current.appendChild(overlay);
        }

        if (!overlay) return;

        const ctx = overlay.getContext('2d');
        if (!ctx) return;

        const rect = overlay.getBoundingClientRect();
        overlay.width = rect.width * window.devicePixelRatio;
        overlay.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.4)';
        ctx.lineWidth = sessionStyle.width;

        if (sessionStyle.type === 'dashed') ctx.setLineDash([4, 4]);
        else if (sessionStyle.type === 'dotted') ctx.setLineDash([2, 2]);
        else ctx.setLineDash([]);

        lineConfigs.forEach(line => {
            const x = timeScale.timeToCoordinate(line.time as Time);
            if (x !== null) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, rect.height);
                ctx.stroke();
            }
        });
    }, [isDark, config.timeframe, sessionStyle]);

    // ─── Main Chart Rendering ──────────────────────────────────────────
    const renderSeries = useCallback(() => {
        if (!chartRef.current || chartDataRef.current.length === 0) return;

        // If series already exists, do NOT remove it. Just update data.
        if (seriesRef.current) {
            chartRef.current.removeSeries(seriesRef.current);
        }

        const data = chartDataRef.current;
        const isPercentage = config.type === 'sector-compare' || config.compareSector;

        if (chartType === 'Candle' && !isPercentage) {
            const candleSeries = chartRef.current.addCandlestickSeries({
                upColor: colors.up, downColor: colors.down,
                wickUpColor: colors.up, wickDownColor: colors.down,
                borderVisible: false,
            });
            candleSeries.setData(data.map(d => ({
                time: d.time, open: d.open, high: d.high, low: d.low, close: d.close,
            })));
            seriesRef.current = candleSeries;
        } else {
            const areaSeries = chartRef.current.addAreaSeries({
                lineColor: colors.price,
                topColor: colors.gradientTop,
                bottomColor: colors.gradientBottom,
                lineWidth: 2,
                crosshairMarkerRadius: 4,
            });
            areaSeries.setData(data.map(d => ({ time: d.time, value: d.close })));
            seriesRef.current = areaSeries;
        }

        // LTP Update
        const last = data[data.length - 1];
        const prev = data[data.length - 2] || last;
        const chg = last.close - prev.close;
        const pct = (chg / prev.close) * 100;
        setLtpInfo({ price: last.close, changePercent: pct });

        drawSessionBreaks();

        // Only fit content if ticker or timeframe has changed, 
        // or if it's the very first time we have data.
        const tickerChanged = prevTickerRef.current !== config.ticker;
        const timeframeChanged = prevTimeframeRef.current !== config.timeframe;
        const isInitialLoad = prevTickerRef.current === config.ticker && prevTimeframeRef.current === config.timeframe && chartRef.current?.timeScale().getVisibleRange() === null;

        if (tickerChanged || timeframeChanged || isInitialLoad) {
            chartRef.current?.timeScale().fitContent();
            prevTickerRef.current = config.ticker;
            prevTimeframeRef.current = config.timeframe;
        }
    }, [chartType, config.type, config.compareSector, config.ticker, config.timeframe, colors, drawSessionBreaks]);

    // ─── Chart Lifecycle ───────────────────────────────────────────────
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            layout: {
                background: { color: colors.background },
                textColor: colors.text,
                fontSize: 10,
                fontFamily: 'Inter, sans-serif',
            },
            grid: {
                vertLines: { color: colors.grid },
                horzLines: { color: colors.grid },
            },
            handleScroll: true,
            handleScale: true,
            crosshair: {
                mode: CrosshairMode.Normal,
            },
        });

        chartRef.current = chart;
        renderSeries();

        const observer = new ResizeObserver(() => {
            if (containerRef.current && chart) {
                const { clientWidth, clientHeight } = containerRef.current;
                if (clientWidth > 0 && clientHeight > 0) {
                    chart.applyOptions({ width: clientWidth, height: clientHeight });
                }
            }
        });
        observer.observe(containerRef.current);

        chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
            drawSessionBreaks();
        });

        return () => {
            observer.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, [colors, id]);

    // ─── Sync Logic ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!chartRef.current || !syncSettings?.crosshair) return;

        const handleGlobalCrosshair = (e: CustomEvent) => {
            if (isSyncingRef.current || e.detail.sourceId === id) return;
            isSyncingRef.current = true;
            chartRef.current?.setCrosshairPosition(e.detail.price, e.detail.time, seriesRef.current!);
            isSyncingRef.current = false;
        };

        window.addEventListener('chart-sync-crosshair' as any, handleGlobalCrosshair as any);

        const crosshairHandler = (param: any) => {
            if (isSyncingRef.current || !param.time || !param.point || !seriesRef.current) return;
            const dataPoint = param.seriesData.get(seriesRef.current!);
            if (!dataPoint) return;
            window.dispatchEvent(new CustomEvent('chart-sync-crosshair', {
                detail: {
                    time: param.time,
                    price: (dataPoint as any).value !== undefined ? (dataPoint as any).value : (dataPoint as any).close,
                    sourceId: id
                }
            }));
        };

        chartRef.current.subscribeCrosshairMove(crosshairHandler);

        return () => {
            window.removeEventListener('chart-sync-crosshair' as any, handleGlobalCrosshair as any);
            chartRef.current?.unsubscribeCrosshairMove(crosshairHandler);
        };
    }, [syncSettings?.crosshair, id]);

    useEffect(() => {
        if (!chartRef.current || !syncSettings?.zoom) return;

        const handleGlobalZoom = (e: CustomEvent) => {
            if (isSyncingRef.current || e.detail.sourceId === id) return;
            isSyncingRef.current = true;
            chartRef.current?.timeScale().setVisibleLogicalRange(e.detail.range);
            isSyncingRef.current = false;
        };

        window.addEventListener('chart-sync-zoom' as any, handleGlobalZoom as any);

        const sub = (range: any) => {
            if (isSyncingRef.current || !range) return;
            window.dispatchEvent(new CustomEvent('chart-sync-zoom', {
                detail: { range, sourceId: id }
            }));
        };
        chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(sub);

        return () => {
            window.removeEventListener('chart-sync-zoom' as any, handleGlobalZoom as any);
            chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(sub);
        };
    }, [syncSettings?.zoom, id]);

    // ─── Data Fetching ──────────────────────────────────────────────────
    useEffect(() => {
        if (!config.ticker) return;
        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Normalize interval for API
                const apiInterval = config.timeframe === '1h' ? '1h' : config.timeframe;
                const url = `${API_BASE}/api/v1/analyze/${config.ticker}?interval=${apiInterval}`;
                const res = await axios.get(url, { timeout: 10000 });
                if (cancelled) return;

                const processed = res.data.data.map((d: any) => ({
                    time: Math.floor(new Date(d.date).getTime() / 1000) as Time,
                    open: Number(d.open), high: Number(d.high), low: Number(d.low), close: Number(d.close), volume: Number(d.volume)
                }));

                chartDataRef.current = processed;
                if (processed.length === 0) setError('No data found');
                else renderSeries();

                setLoading(false);
            } catch (err: any) {
                if (cancelled) return;
                setError(extractErrorMessage(err));
                setLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [config.ticker, config.timeframe, renderSeries]);

    return (
        <div
            onClick={() => setActivePanelId(id)}
            className={`flex flex-col h-full w-full bg-surface group overflow-hidden border transition-all duration-300 ${isActive ? 'border-indigo-500 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5' : 'border-border-primary/20 hover:border-border-primary/40'}`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
                e.preventDefault();
                const ticker = e.dataTransfer.getData('ticker');
                if (ticker) updatePanelConfig(id, { ticker });
            }}
        >
            {/* High-Density Header */}
            <div className={`flex items-center justify-between px-3 py-1 border-b flex-none select-none transition-colors ${isActive ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-background/40 border-border-primary/20'}`}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 focus-within:scale-105 transition-transform cursor-pointer" onClick={() => setActivePanelId(id)}>
                        <div className={`p-1 rounded ${isActive ? 'bg-indigo-500 text-white' : 'bg-surface text-text-muted'}`}>
                            <Target size={12} />
                        </div>
                        <span className="text-[10px] font-black text-text-primary uppercase tracking-wider">{config.ticker.split('.')[0]}</span>
                        <div className="h-3 w-px bg-border-primary/30" />
                        <span className={`text-[10px] font-bold ${ltpInfo.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {ltpInfo.price.toFixed(2)}
                            <span className="ml-1 opacity-80 text-[9px]">({ltpInfo.changePercent >= 0 ? '+' : ''}{ltpInfo.changePercent.toFixed(2)}%)</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        <button onClick={(e) => { e.stopPropagation(); setShowIntervalMenu(!showIntervalMenu); }} className="text-[9px] font-black text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded bg-surface border border-border-primary/30 uppercase">
                            {config.timeframe}
                        </button>
                        {showIntervalMenu && (
                            <div className="absolute top-10 left-32 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-[100] py-1 w-20">
                                {INTERVALS.map(i => (
                                    <button
                                        key={i.value}
                                        onClick={(e) => { e.stopPropagation(); updatePanelConfig(id, { timeframe: i.value }); setShowIntervalMenu(false); }}
                                        className="w-full px-3 py-1.5 text-left text-[10px] font-bold text-slate-300 hover:bg-slate-700 uppercase"
                                    >
                                        {i.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-1 ml-1">
                            <button onClick={(e) => { e.stopPropagation(); setChartType('Candle'); }} className={`p-1 rounded ${chartType === 'Candle' ? 'bg-indigo-500/20 text-indigo-400' : 'text-text-muted hover:text-text-primary'}`}><Activity size={12} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setChartType('Area'); }} className={`p-1 rounded ${chartType === 'Area' ? 'bg-indigo-500/20 text-indigo-400' : 'text-text-muted hover:text-text-primary'}`}><LineChart size={12} /></button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className="text-text-muted hover:text-indigo-500 p-1"><Settings size={13} /></button>
                        <div className="flex items-center gap-1.5 border-l border-border-primary/30 pl-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className="text-[8px] font-black text-text-muted uppercase tracking-tighter">{loading ? 'Syncing' : 'Live'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Display */}
            <div className="flex-1 relative min-h-0 bg-background/5">
                {error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-20 bg-background/40 backdrop-blur-sm">
                        <AlertCircle size={24} className="text-rose-500 mb-2" />
                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">{error}</p>
                        <button onClick={(e) => { e.stopPropagation(); updatePanelConfig(id, { ticker: config.ticker }); }} className="mt-3 text-[9px] font-black text-indigo-400 hover:text-indigo-300 underline uppercase">Retry Fetch</button>
                    </div>
                ) : (
                    <div
                        ref={containerRef}
                        className="flex-1 min-h-0 w-full h-full relative select-none touch-none bg-background cursor-crosshair absolute inset-0"
                        style={{ cursor: 'crosshair', userSelect: 'none' }}
                        onMouseDown={() => { if (activePanelId !== id) setActivePanelId(id); }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            if (activePanelId !== id) setActivePanelId(id);
                            const rect = containerRef.current?.getBoundingClientRect();
                            if (!rect) return;
                            const relativeY = e.clientY - rect.top;

                            // Detect if click is on Time Axis (bottom ~30px)
                            const isAxis = relativeY > rect.height - 30;

                            const showAbove = relativeY > rect.height * 0.6;
                            setContextMenu({
                                x: e.clientX,
                                y: showAbove ? e.clientY - 120 : e.clientY,
                                type: isAxis ? 'axis' : 'chart'
                            });
                        }}
                    />
                )}
            </div>

            {contextMenu && (
                <div
                    className="fixed z-[3000] bg-surface border border-border-primary rounded-lg shadow-2xl py-2 w-48 animate-in fade-in zoom-in duration-100"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={() => setContextMenu(null)}
                    onMouseLeave={() => setContextMenu(null)}
                >
                    {contextMenu.type === 'chart' ? (
                        <>
                            <div className="px-3 py-1.5 text-[10px] font-black text-text-muted uppercase tracking-wider border-b border-border-primary mb-1">
                                Chart Settings
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setContextMenu(null); }}
                                className="w-full text-left px-3 py-1.5 hover:bg-indigo-500/10 text-[11px] font-bold flex items-center justify-between"
                            >
                                <span>Preferences</span>
                                <Settings size={12} />
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="px-3 py-1.5 text-[10px] font-black text-indigo-400 uppercase tracking-wider border-b border-border-primary mb-1">
                                Time Axis Settings
                            </div>
                            <div className="px-3 py-1 text-[9px] font-bold text-text-muted uppercase">Line Type</div>
                            {['dashed', 'dotted', 'solid'].map(type => (
                                <button
                                    key={type}
                                    onClick={(e) => { e.stopPropagation(); setSessionStyle(s => ({ ...s, type })); }}
                                    className={`w-full text-left px-3 py-1 hover:bg-indigo-500/10 text-[10px] capitalize ${sessionStyle.type === type ? 'text-indigo-400 font-black' : 'text-text-primary'}`}
                                >
                                    {type}
                                </button>
                            ))}
                            <div className="px-3 py-1 mt-1 text-[9px] font-bold text-text-muted uppercase border-t border-border-primary pt-1">Line Width</div>
                            <div className="flex px-3 py-1 gap-2">
                                {[1, 2, 3].map(w => (
                                    <button
                                        key={w}
                                        onClick={(e) => { e.stopPropagation(); setSessionStyle(s => ({ ...s, width: w })); }}
                                        className={`flex-1 py-1 rounded border ${sessionStyle.width === w ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-border-primary text-text-muted'} text-[10px] font-bold`}
                                    >
                                        {w}px
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalyticalPanel;
