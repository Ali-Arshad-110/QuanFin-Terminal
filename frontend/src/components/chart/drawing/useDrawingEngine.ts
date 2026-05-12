import { useState, useCallback, useRef, useEffect } from 'react';
import type { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import { DrawingType, MagnetMode } from './types';
import type { DrawingObject, Point } from './types';

interface DrawingEngineState {
    drawings: DrawingObject[];
    activeTool: DrawingType | 'none';
    magnetMode: MagnetMode;
    isDrawing: boolean;
    selectedId: string | null;
    previewPoints: Point[];
}

export const useDrawingEngine = (
    chart: IChartApi | null,
    series: ISeriesApi<any> | null,
    symbol: string,
    timeframe: string
) => {
    const [state, setState] = useState<DrawingEngineState>({
        drawings: [],
        activeTool: 'none',
        magnetMode: MagnetMode.NONE,
        isDrawing: false,
        selectedId: null,
        previewPoints: [],
    });

    const undoStack = useRef<DrawingObject[][]>([]);
    const redoStack = useRef<DrawingObject[][]>([]);
    const currentPoints = useRef<Point[]>([]);

    // ─── Persistence ──────────────────────────────────────────────────────────
    useEffect(() => {
        const key = `drawings:${symbol}:${timeframe}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setState(prev => ({ ...prev, drawings: parsed }));
            } catch (e) {
                console.error('Failed to load drawings', e);
            }
        } else {
            setState(prev => ({ ...prev, drawings: [] }));
        }
    }, [symbol, timeframe]);

    const saveDrawings = (drawings: DrawingObject[]) => {
        const key = `drawings:${symbol}:${timeframe}`;
        localStorage.setItem(key, JSON.stringify(drawings));
    };

    const recordState = () => {
        undoStack.current.push([...state.drawings]);
        redoStack.current = [];
        if (undoStack.current.length > 50) undoStack.current.shift();
    };

    const undo = useCallback(() => {
        if (undoStack.current.length === 0) return;
        const previous = undoStack.current.pop()!;
        redoStack.current.push([...state.drawings]);
        setState(prev => ({ ...prev, drawings: previous }));
        saveDrawings(previous);
    }, [state.drawings]);

    const redo = useCallback(() => {
        if (redoStack.current.length === 0) return;
        const next = redoStack.current.pop()!;
        undoStack.current.push([...state.drawings]);
        setState(prev => ({ ...prev, drawings: next }));
        saveDrawings(next);
    }, [state.drawings]);

    // ─── Intelligence: Auto Trend ──────────────────────────────────────────────
    const detectAutoTrend = useCallback(() => {
        if (!series || !chart) return;
        const visibleRange = chart.timeScale().getVisibleRange();
        if (!visibleRange) return;

        recordState();
        const autoLine: DrawingObject = {
            id: crypto.randomUUID(),
            type: DrawingType.TREND_LINE,
            points: [
                { time: visibleRange.from as number, price: series.coordinateToPrice(200) || 0 },
                { time: visibleRange.to as number, price: series.coordinateToPrice(100) || 0 }
            ],
            style: { color: '#fbbf24', width: 2, opacity: 0.8, dashed: true },
            layer: 'bg',
            locked: true,
            visible: true,
            symbol,
            timeframe,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        const nextDrawings = [...state.drawings, autoLine];
        setState(prev => ({ ...prev, drawings: nextDrawings }));
        saveDrawings(nextDrawings);
    }, [series, chart, state.drawings, symbol, timeframe]);

    // ─── Hit Testing ──────────────────────────────────────────────────────────
    const getDistanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt(Math.pow(px - (x1 + t * (x2 - x1)), 2) + Math.pow(py - (y1 + t * (y2 - y1)), 2));
    };

    const hitTest = useCallback((px: number, py: number) => {
        if (!series || !chart) return null;
        const timeScale = chart.timeScale();
        const tolerance = 10;

        for (const d of state.drawings) {
            if (!d.visible) continue;
            const coords = d.points.map(p => ({
                x: timeScale.timeToCoordinate(p.time as any),
                y: series.priceToCoordinate(p.price)
            })).filter(c => c.x !== null && c.y !== null) as { x: number; y: number }[];

            if (coords.length === 0) continue;

            if (d.type === DrawingType.TREND_LINE || d.type === DrawingType.RAY) {
                if (coords.length >= 2) {
                    const dist = getDistanceToSegment(px, py, coords[0].x, coords[0].y, coords[1].x, coords[1].y);
                    if (dist < tolerance) return d.id;
                }
            } else if (d.type === DrawingType.HORIZONTAL_LINE) {
                if (Math.abs(py - coords[0].y) < tolerance) return d.id;
            } else if (d.type === DrawingType.VERTICAL_LINE) {
                if (Math.abs(px - coords[0].x) < tolerance) return d.id;
            } else if ((d.type === DrawingType.RECTANGLE || d.type === DrawingType.RISK_REWARD) && coords.length >= 2) {
                const xmin = Math.min(coords[0].x, coords[1].x);
                const xmax = Math.max(coords[0].x, coords[1].x);
                const ymin = Math.min(coords[0].y, coords[1].y);
                const ymax = Math.max(coords[0].y, coords[1].y);
                if (px >= xmin && px <= xmax && py >= ymin && py <= ymax) return d.id;
            }
        }
        return null;
    }, [state.drawings, chart, series]);

    // ─── Logic ────────────────────────────────────────────────────────────────
    const getMagnetPrice = useCallback((param: MouseEventParams) => {
        if (!series || !param.point) return null;
        const price = series.coordinateToPrice(param.point.y) || 0;
        if (state.magnetMode === MagnetMode.NONE) return price;

        const data = param.seriesData.get(series);
        if (data && 'open' in data) {
            const candle = data as any;
            const prices = [candle.open, candle.high, candle.low, candle.close];
            return prices.reduce((prev, curr) => Math.abs(curr - price) < Math.abs(prev - price) ? curr : prev);
        }
        return price;
    }, [series, chart, state.magnetMode]);

    const handleChartClick = useCallback((param: MouseEventParams) => {
        if (!param.point || !series || !chart) return;

        if (state.activeTool === DrawingType.AUTO_TREND) {
            detectAutoTrend();
            setState(prev => ({ ...prev, activeTool: 'none' }));
            return;
        }

        if (state.activeTool === 'none') {
            const hitId = hitTest(param.point.x, param.point.y);
            setState(prev => ({ ...prev, selectedId: hitId }));
            return;
        }

        const price = getMagnetPrice(param) ?? 0;
        const time = param.time as number;
        if (!time) return;

        currentPoints.current.push({ time, price });

        const tool = state.activeTool as string;
        const isSinglePoint = [
            DrawingType.HORIZONTAL_LINE,
            DrawingType.VERTICAL_LINE,
            DrawingType.SMART_LABEL,
            DrawingType.TEXT,
            DrawingType.ARROW_UP,
            DrawingType.ARROW_DOWN,
            DrawingType.EMOJI_MARKER
        ].includes(tool as any);

        const isTriplePoint = [
            DrawingType.PITCHFORK,
            DrawingType.FIB_EXTENSION,
            DrawingType.PATH,
            DrawingType.PARALLEL_CHANNEL
        ].includes(tool as any);

        const minPoints = isSinglePoint ? 1 : isTriplePoint ? 3 : 2;

        if (currentPoints.current.length >= minPoints) {
            recordState();
            const newDrawing: DrawingObject = {
                id: crypto.randomUUID(),
                type: tool as DrawingType,
                points: [...currentPoints.current],
                style: { color: tool === DrawingType.RISK_REWARD ? '#10b981' : '#2962FF', width: 2, opacity: 1 },
                layer: 'mid',
                locked: false,
                visible: true,
                symbol,
                timeframe,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const nextDrawings = [...state.drawings, newDrawing];
            setState(prev => ({ ...prev, drawings: nextDrawings, isDrawing: false, activeTool: 'none', previewPoints: [] }));
            saveDrawings(nextDrawings);
            currentPoints.current = [];
        } else {
            setState(prev => ({ ...prev, isDrawing: true, previewPoints: [...currentPoints.current] }));
        }
    }, [state.activeTool, state.drawings, hitTest, getMagnetPrice, symbol, timeframe, detectAutoTrend, chart, series]);

    const handleMouseMove = useCallback((param: MouseEventParams) => {
        if (!state.isDrawing || state.activeTool === 'none' || !param.time || !param.point || !series) return;
        const price = getMagnetPrice(param) ?? 0;
        const time = param.time as number;
        setState(prev => ({ ...prev, previewPoints: [...currentPoints.current, { time, price }] }));
    }, [state.isDrawing, state.activeTool, series, chart, getMagnetPrice]);

    return {
        ...state,
        setActiveTool: (tool: DrawingType | 'none') => {
            currentPoints.current = [];
            setState(prev => ({ ...prev, activeTool: tool, isDrawing: false, previewPoints: [], selectedId: null }));
        },
        setMagnetMode: (mode: MagnetMode) => setState(prev => ({ ...prev, magnetMode: mode })),
        handleChartClick,
        handleMouseMove,
        undo,
        redo,
        deleteDrawing: (id: string) => {
            recordState();
            const nextDrawings = state.drawings.filter(d => d.id !== id);
            setState(prev => ({ ...prev, drawings: nextDrawings, selectedId: null }));
            saveDrawings(nextDrawings);
        },
        toggleVisibility: (id: string) => {
            const nextDrawings = state.drawings.map(d => d.id === id ? { ...d, visible: !d.visible } : d);
            setState(prev => ({ ...prev, drawings: nextDrawings }));
            saveDrawings(nextDrawings);
        },
        updateDrawingStyle: (id: string, style: Partial<DrawingObject['style']>) => {
            const nextDrawings = state.drawings.map(d => d.id === id ? { ...d, style: { ...d.style, ...style }, updatedAt: Date.now() } : d);
            setState(prev => ({ ...prev, drawings: nextDrawings }));
            saveDrawings(nextDrawings);
        },
        updateDrawingPoints: (id: string, points: Point[], isDragging = false) => {
            if (!isDragging) recordState(); // Only record for undo if it's the final drop
            const nextDrawings = state.drawings.map(d => d.id === id ? { ...d, points, updatedAt: Date.now() } : d);
            setState(prev => ({ ...prev, drawings: nextDrawings }));
            if (!isDragging) saveDrawings(nextDrawings);
        },
        setSelectedId: (id: string | null) => setState(prev => ({ ...prev, selectedId: id })),
    };
};
