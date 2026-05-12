import React, { useEffect, useRef, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { useTheme } from '../../theme/ThemeProvider';
import { getSessionLines } from '../../utils/sessionTiming';
import { X } from 'lucide-react';

interface ChartPaneProps {
    id?: string;
    symbol: string;
    interval: string;
    data: any[];
    height?: string | number;
    chartType?: 'Candle' | 'Line' | 'Area';
    showGrid?: boolean;
    logScale?: boolean;
    priceScaleSide?: 'right' | 'left';
    crosshairMode?: any;
    showSessionLines?: boolean;
    isPrimary?: boolean;
    currentPrice?: number;
    onToggleSessionLines?: () => void;
    onChartReady?: (chart: IChartApi, series: ISeriesApi<'Candlestick'>, volumeSeries?: ISeriesApi<'Histogram'>) => void;
    onSyncTimeRange?: (range: { from: number; to: number }) => void;
    onSyncCrosshair?: (time: number | null) => void;
    onHoverChange?: (data: any | null) => void;
    onClose?: () => void;
    syncedTimeRange?: { from: number; to: number } | null;
    syncedCrosshair?: number | null;
}

const ChartPane: React.FC<ChartPaneProps> = ({
    symbol,
    interval,
    data,
    height = '100%',
    chartType = 'Candle',
    showGrid = true,
    logScale = false,
    priceScaleSide = 'right',
    crosshairMode = 1,
    showSessionLines = true,
    onToggleSessionLines,
    onChartReady,
    onSyncTimeRange,
    onSyncCrosshair,
    onHoverChange,
    onClose,
    syncedTimeRange,
    syncedCrosshair
}) => {
    const prevSymbolRef = useRef(symbol);
    const prevIntervalRef = useRef(interval);
    const chartTypeRef = useRef(chartType); // tracks current type without triggering chart recreation
    const dataSetRef = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<any> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
    const dataByTimeRef = useRef<Map<number, any>>(new Map());
    const isSyncingRef = useRef(false);
    const [_hoveredData, setHoveredData] = React.useState<any>(null);
    const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, type: 'chart' | 'axis' } | null>(null);
    const [sessionStyle, setSessionStyle] = React.useState({ type: 'dashed', width: 1 });
    const { currentTheme } = useTheme();

    const onChartReadyRef = useRef(onChartReady);
    const onSyncTimeRangeRef = useRef(onSyncTimeRange);
    const onSyncCrosshairRef = useRef(onSyncCrosshair);

    useEffect(() => {
        onChartReadyRef.current = onChartReady;
        onSyncTimeRangeRef.current = onSyncTimeRange;
        onSyncCrosshairRef.current = onSyncCrosshair;
    }, [onChartReady, onSyncTimeRange, onSyncCrosshair]);

    const drawSessionLines = useCallback(() => {
        if (!chartRef.current || !seriesRef.current || !showSessionLines) {
            const existing = containerRef.current?.querySelector('.session-breaks-overlay');
            if (existing) existing.remove();
            return;
        }

        // We use seriesRef.current.data() to get current data without depending on props.data directly.
        const seriesData = seriesRef.current.data();
        if (!seriesData || seriesData.length === 0) return;

        const lineConfigs = getSessionLines(seriesData.map((d: any) => d.time));
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
        ctx.strokeStyle = currentTheme.mode === 'dark' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.4)';
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
    }, [showSessionLines, currentTheme.mode, sessionStyle.width, sessionStyle.type]); // Removed `data` from dependencies to stop endless recreation loop!

    const cleanup = useCallback(() => {
        if (chartRef.current) {
            try { chartRef.current.remove(); } catch (e) { }
            chartRef.current = null;
        }
        seriesRef.current = null;
        volumeSeriesRef.current = null;
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        cleanup();

        // Get container dimensions with fallback
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || window.innerWidth * 0.8;
        const height = rect.height || 400;

        const chart = createChart(containerRef.current, {
            width: Math.max(width, 100),
            height: Math.max(height, 100),
            layout: {
                background: { type: 'solid' as any, color: 'transparent' },
                textColor: currentTheme.colors.chart.text,
            },
            grid: {
                vertLines: { visible: showGrid, color: currentTheme.colors.border.primary + '20' },
                horzLines: { visible: showGrid, color: currentTheme.colors.border.primary + '20' },
            },
            localization: {
                timeFormatter: (time: number) => {
                    const date = new Date((time + 5.5 * 3600) * 1000);
                    const hours = date.getUTCHours().toString().padStart(2, '0');
                    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                    return `${hours}:${minutes}`;
                },
            },
            timeScale: {
                borderColor: currentTheme.colors.border.primary,
                timeVisible: true,
                secondsVisible: false,
                tickMarkFormatter: (time: number, tickMarkType: number) => {
                    const date = new Date((time + 5.5 * 3600) * 1000);
                    if (tickMarkType <= 2) {
                        const day = date.getUTCDate().toString().padStart(2, '0');
                        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
                        return `${day}/${month}`;
                    }
                    const hours = date.getUTCHours().toString().padStart(2, '0');
                    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
                    if (hours === '09' && minutes === '15') {
                        const day = date.getUTCDate().toString().padStart(2, '0');
                        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
                        return `${day}/${month} 09:15`;
                    }
                    return `${hours}:${minutes}`;
                },
            },
            rightPriceScale: {
                borderColor: currentTheme.colors.border.primary,
                visible: priceScaleSide === 'right',
                mode: logScale ? 1 : 0,
                autoScale: true,
            },
            leftPriceScale: {
                borderColor: currentTheme.colors.border.primary,
                visible: priceScaleSide === 'left',
                mode: logScale ? 1 : 0,
            },
            crosshair: {
                mode: crosshairMode,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: {
                    time: true,
                    price: true,
                },
                mouseWheel: true,
                pinch: true,
            },
        });

        // Create the initial series based on chartType
        const initialType = chartTypeRef.current;
        let series: ISeriesApi<any>;
        if (initialType === 'Line') {
            series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2 });
        } else if (initialType === 'Area') {
            series = chart.addAreaSeries({ lineColor: '#3b82f6', topColor: '#3b82f640', bottomColor: '#3b82f605' });
        } else {
            series = chart.addCandlestickSeries({
                upColor: currentTheme.colors.chart.candleUp,
                downColor: currentTheme.colors.chart.candleDown,
                borderUpColor: currentTheme.colors.chart.candleUp,
                borderDownColor: currentTheme.colors.chart.candleDown,
                wickUpColor: currentTheme.colors.chart.candleUp,
                wickDownColor: currentTheme.colors.chart.candleDown,
            });
        }

        chartRef.current = chart;
        seriesRef.current = series;

        // Add volume series for candlestick
        if (initialType === 'Candle') {
            const volumeSeries = chart.addHistogramSeries({
                color: '#26a69a',
                priceFormat: { type: 'volume' },
                priceScaleId: '',
            });
            volumeSeries.priceScale().applyOptions({
                scaleMargins: { top: 0.8, bottom: 0 },
            });
            volumeSeriesRef.current = volumeSeries;
        }

        // Reset dataSetRef so data useEffect feeds data into this new series
        dataSetRef.current = false;

        if (onChartReadyRef.current) onChartReadyRef.current(chart, series as any, volumeSeriesRef.current ?? undefined);

        chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
            if (isSyncingRef.current) return;
            if (range && onSyncTimeRangeRef.current) {
                onSyncTimeRangeRef.current({ from: range.from as number, to: range.to as number });
            }
        });

        chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
            drawSessionLines();
        });

        chart.subscribeCrosshairMove((param) => {
            if (isSyncingRef.current) return;
            if (param.time && param.point) {
                const dataPoint = param.seriesData.get(seriesRef.current!);
                if (dataPoint) {
                    setHoveredData({ ...(dataPoint as any), time: param.time });
                }
            } else {
                setHoveredData(null);
            }

            if (onSyncCrosshairRef.current) {
                onSyncCrosshairRef.current(param.time as number | null);
            }

            if (onHoverChange) {
                if (param.time && param.point) {
                    const dataPoint = param.seriesData.get(seriesRef.current!);
                    if (dataPoint) {
                        onHoverChange({ ...(dataPoint as any), time: param.time });
                    }
                } else {
                    onHoverChange(null);
                }
            }
        });

        const resizeObserver = new ResizeObserver((entries) => {
            if (entries[0] && chartRef.current) {
                const { width, height } = entries[0].contentRect;
                if (width > 0 && height > 0) {
                    chartRef.current.applyOptions({
                        width: Math.round(width),
                        height: Math.round(height)
                    });
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        drawSessionLines();

        return () => {
            resizeObserver.disconnect();
            cleanup();
        };
        // ✅ chartType intentionally NOT in deps — series swap is handled by the effect below
    }, [symbol, interval, currentTheme.mode, showGrid, logScale, priceScaleSide, crosshairMode, cleanup]);

    // ✅ NEW: Series-swap effect — handles chartType changes WITHOUT destroying the chart
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return; // chart not yet initialized, skip

        const currentData = data.length > 0 ? data : [];

        try {
            // Remove old series
            if (seriesRef.current) {
                try { chart.removeSeries(seriesRef.current); } catch (_) { }
                seriesRef.current = null;
            }
            if (volumeSeriesRef.current) {
                try { chart.removeSeries(volumeSeriesRef.current); } catch (_) { }
                volumeSeriesRef.current = null;
            }

            // Add new series of correct type
            let series: ISeriesApi<any>;
            if (chartType === 'Line') {
                series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2 });
                if (currentData.length > 0)
                    series.setData(currentData.map((d: any) => ({ time: d.time, value: d.close })));
            } else if (chartType === 'Area') {
                series = chart.addAreaSeries({ lineColor: '#3b82f6', topColor: '#3b82f640', bottomColor: '#3b82f605' });
                if (currentData.length > 0)
                    series.setData(currentData.map((d: any) => ({ time: d.time, value: d.close })));
            } else {
                series = chart.addCandlestickSeries({
                    upColor: currentTheme.colors.chart.candleUp,
                    downColor: currentTheme.colors.chart.candleDown,
                    borderUpColor: currentTheme.colors.chart.candleUp,
                    borderDownColor: currentTheme.colors.chart.candleDown,
                    wickUpColor: currentTheme.colors.chart.candleUp,
                    wickDownColor: currentTheme.colors.chart.candleDown,
                });
                if (currentData.length > 0) {
                    series.setData(currentData);
                    const volumeSeries = chart.addHistogramSeries({
                        color: '#26a69a',
                        priceFormat: { type: 'volume' },
                        priceScaleId: '',
                    });
                    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
                    volumeSeries.setData(currentData.map((d: any) => ({
                        time: d.time,
                        value: d.v || d.volume || 0,
                        color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
                    })));
                    volumeSeriesRef.current = volumeSeries;
                }
            }

            seriesRef.current = series;
            dataSetRef.current = currentData.length > 0;
            chartTypeRef.current = chartType;

            if (onChartReadyRef.current) {
                onChartReadyRef.current(chart, series as any, volumeSeriesRef.current ?? undefined);
            }
        } catch (e) {
            console.warn('[ChartPane] Series swap failed:', e);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartType]); // Only runs when chartType changes

    useEffect(() => {
        if (!chartRef.current || !syncedTimeRange || isSyncingRef.current) return;
        isSyncingRef.current = true;
        chartRef.current.timeScale().setVisibleRange(syncedTimeRange as any);
        setTimeout(() => { isSyncingRef.current = false; }, 50);
    }, [syncedTimeRange]);

    useEffect(() => {
        if (!seriesRef.current || !chartRef.current) return;
        
        if (seriesRef.current) {
            // Handle empty data (clearing the chart)
            if (data.length === 0) {
                seriesRef.current.setData([]);
                dataSetRef.current = false;
                dataByTimeRef.current = new Map();
                return;
            }

            // Only fully replace data (setData) if symbol or interval changed, 
            // or if it's the very first time we have data in this series.
            const symbolChanged = prevSymbolRef.current !== symbol;
            const intervalChanged = prevIntervalRef.current !== interval;
            const isInitialLoad = !dataSetRef.current;

            if (symbolChanged || intervalChanged || isInitialLoad) {
                if (chartType === 'Line' || chartType === 'Area') {
                    seriesRef.current.setData(data.map((d: any) => ({ time: d.time, value: d.close })));
                } else {
                    seriesRef.current.setData(data);
                    
                    if (chartType === 'Candle' && volumeSeriesRef.current) {
                        volumeSeriesRef.current.setData(data.map((d: any) => ({
                            time: d.time,
                            value: d.v || d.volume || 0,
                            color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
                        })));
                    }
                }

                chartRef.current?.timeScale().fitContent();
                prevSymbolRef.current = symbol;
                prevIntervalRef.current = interval;
                dataSetRef.current = true;
            }

            // Refresh lookup map for crosshair syncing (time -> candle/point)
            // Keep it lightweight; only store the latest mapping.
            try {
                const next = new Map<number, any>();
                for (const d of data) {
                    const t = typeof d.time === 'number' ? d.time : (d.time as any);
                    if (typeof t === 'number') next.set(t, d);
                }
                dataByTimeRef.current = next;
            } catch {
                // ignore
            }
            // For periodic live updates, ChartComponent already calls series.update(newCandle).
            // We do NOT call series.setData() here, because it resets user axis dragging/panning.

            drawSessionLines();
        }
    }, [data, chartType, drawSessionLines, symbol, interval]);

    useEffect(() => {
        if (!chartRef.current || !seriesRef.current || isSyncingRef.current) return;
        isSyncingRef.current = true;
        try {
            if (syncedCrosshair !== null) {
                const t = syncedCrosshair as number;
                const x = chartRef.current.timeScale().timeToCoordinate(t as any);
                const datum = dataByTimeRef.current.get(t);
                const price =
                    datum && typeof datum.close === 'number' ? datum.close :
                        datum && typeof datum.value === 'number' ? datum.value :
                            null;
                if (x !== null) {
                    (chartRef.current as any).setCrosshairPosition(price, t as any, seriesRef.current);
                } else {
                    (chartRef.current as any).setCrosshairPosition(0, null, seriesRef.current);
                }
            } else {
                (chartRef.current as any).setCrosshairPosition(0, null, seriesRef.current);
            }
        } catch (err) { }
        setTimeout(() => { isSyncingRef.current = false; }, 50);
    }, [syncedCrosshair]);

    return (
        <div style={{ height }} className="relative flex flex-col w-full min-h-0 bg-background border-b border-border-primary/50">
            <div
                ref={containerRef}
                className="flex-1 w-full h-full touch-none overflow-hidden"
                style={{ cursor: 'crosshair', userSelect: 'none' }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const relativeY = e.clientY - rect.top;

                    // Detect if click is on Time Axis (bottom ~30px)
                    const isAxis = relativeY > rect.height - 30;

                    const showAbove = relativeY > rect.height * 0.6;
                    setContextMenu({
                        x: e.clientX,
                        y: showAbove ? e.clientY - 180 : e.clientY,
                        type: isAxis ? 'axis' : 'chart'
                    });
                }}
            />

            {onClose && (
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="absolute top-2 right-2 z-[60] w-7 h-7 flex items-center justify-center rounded-lg bg-surface/60 backdrop-blur border border-border-primary hover:bg-rose-500/20 hover:border-rose-500/50 transition-all shadow-md group"
                    title="Close Pane"
                >
                    <X size={14} className="text-rose-500" />
                </button>
            )}

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
                                onClick={onToggleSessionLines}
                                className="w-full text-left px-3 py-1.5 hover:bg-indigo-500/10 text-[11px] font-bold flex items-center justify-between"
                            >
                                <span>Session Breaks</span>
                                <span className={showSessionLines ? 'text-emerald-500' : 'text-rose-500'}>
                                    {showSessionLines ? 'ON' : 'OFF'}
                                </span>
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

export default ChartPane;