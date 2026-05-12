import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import ChartToolbar from './ChartToolbar';
import DrawingLayer from './chart/DrawingLayer';
import { useDrawingEngine } from './chart/drawing/useDrawingEngine';
import type { ComparisonSymbol, ComparisonMode } from '../hooks/useComparativeEngine';
import ComparativeLegend from './chart/ComparativeLegend';
import ChartPane from './chart/ChartPane';
import { useTheme } from '../theme/ThemeProvider';
import { Loader2, AlertCircle } from 'lucide-react';
import { OptionChainDrawer } from './OptionChainDrawer';
import StockLogo from './StockLogo';
import TickerSearch from './TickerSearch';
import { useMarketStore } from '../store';
import {
  calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands,
  calculateVWAP, calculateATR, calculateCCI, calculateStochastic, calculateADX,
  calculateOBV, calculatePSAR, calculateIchimoku,
} from '../utils/indicators';
import { useWebSocket } from '../contexts/WebSocketContext';
import {
  X, Minus, Check, Trash2, Maximize, Minimize, MoreHorizontal, Layout,
  Eye, EyeOff, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Signal {
  type: 'BUY' | 'SELL';
  price: number;
  time: number;
}

interface HoverData {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
  v?: number;
}

interface ChartComponentProps {
  ticker: string;
  comparisonSymbols?: ComparisonSymbol[];
  comparisonMode?: ComparisonMode;
  onToggleComparison?: (symbol: string) => void;
  onRemoveComparison?: (symbol: string) => void;
  onToggleScale?: (symbol: string) => void;
  onTogglePane?: (symbol: string) => void;
  compLoading?: string | null;
  signals?: Signal[];
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  currentPrice?: number;
  onAnalyzeClick?: () => void;
}

interface ChartSettings {
  showGrid: boolean;
  logScale: boolean;
  crosshairMode: 'normal' | 'magnet';
  priceScaleSide: 'right' | 'left';
}

type IndicatorPane = 'main' | 'new';
export type PlotType = 'Line' | 'Step' | 'Area' | 'Histogram';

type IndicatorConfig = {
  pane: IndicatorPane;
  period?: number;
  color?: string;
  lineWidth?: number;
  opacity?: number;
  plotType?: PlotType;
  visible?: boolean;
};

// Fixed palette for comparison overlays
const COMP_COLORS = ['#2962FF', '#FF6D00', '#00897B', '#D500F9', '#FFD600'];

const PRESET_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ffffff', '#94a3b8'];

// ─── Drawing Style Editor ───
const DrawingStyleEditor: React.FC<{
  drawing: any;
  onUpdate: (style: any) => void;
  onDelete: () => void;
  onClose: () => void;
  isDark: boolean;
}> = ({ drawing, onUpdate, onDelete, onClose, isDark }) => {
  return (
    <motion.div 
      drag 
      dragMomentum={false} 
      className={`fixed z-[1000] bottom-20 left-1/2 -translate-x-1/2 w-[300px] rounded-xl border shadow-2xl p-3 cursor-move ${isDark ? 'bg-[#0f1419]/90 backdrop-blur-xl border-white/10' : 'bg-white/95 backdrop-blur-xl border-black/10'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: drawing.style.color }} />
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">{drawing.type} Settings</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onDelete} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Colors */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => onUpdate({ color: c })}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full transition-all ${drawing.style.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0f1419] scale-110' : 'hover:scale-110'}`}
            />
          ))}
          <input
            type="color"
            value={drawing.style.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-6 h-6 rounded-full overflow-hidden border-0 p-0 bg-transparent cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Width */}
          <div className="flex-1">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Line Width</span>
              <span className="text-[10px] font-mono text-indigo-400">{drawing.style.width}px</span>
            </div>
            <input
              type="range" min="1" max="8" step="1"
              value={drawing.style.width}
              onChange={(e) => onUpdate({ width: parseInt(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Opacity */}
          <div className="flex-1">
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Opacity</span>
              <span className="text-[10px] font-mono text-indigo-400">{Math.round(drawing.style.opacity * 100)}%</span>
            </div>
            <input
              type="range" min="0.1" max="1" step="0.1"
              value={drawing.style.opacity}
              onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={() => onUpdate({ dashed: !drawing.style.dashed })}
          className={`flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-bold transition-all border ${drawing.style.dashed ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-transparent border-border-primary text-text-muted'}`}
        >
          <Minus size={14} />
          DASHED LINE
          {drawing.style.dashed && <Check size={14} className="ml-1" />}
        </button>
      </div>
    </motion.div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const ChartComponent: React.FC<ChartComponentProps> = ({
  ticker,
  comparisonSymbols = [],
  comparisonMode: _comparisonMode = 'PRICE',
  onToggleComparison,
  onRemoveComparison,
  onToggleScale,
  onTogglePane,
  compLoading = null,
  currentPrice = 0,
  isMaximized = false,
  onToggleMaximize,
  onAnalyzeClick
}) => {
  // ── State ──
  const [currentInterval, setCurrentInterval] = useState<string>('5m');

  // ✅ FIX 1: chartType state — this was updating but never passed to ChartPane
  const [chartType, setChartType] = useState<'Candle' | 'Line' | 'Area'>('Candle');

  const [chartData, setChartData] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<'broker' | 'yahoo' | 'demo' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOptionChainOpen, setIsOptionChainOpen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set());
  const [hiddenIndicators, setHiddenIndicators] = useState<Set<string>>(new Set());
  const [indicatorConfigs, setIndicatorConfigs] = useState<Record<string, IndicatorConfig>>({});
  const [indicatorSettingsOpen, setIndicatorSettingsOpen] = useState<string | null>(null);
  const [chartSettings, setChartSettings] = useState<ChartSettings>({
    showGrid: true, logScale: false, crosshairMode: 'normal', priceScaleSide: 'right',
  });
  const [showSessionLines, setShowSessionLines] = useState(true);
  const [typedInterval, setTypedInterval] = useState('');
  const [showIntervalInput, setShowIntervalInput] = useState(false);
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);
  const [showTickerSearch, setShowTickerSearch] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');

  // ── WebSocket Integration ──
  const { subscribe, lastMessage } = useWebSocket();

  // ── Sync State ──
  const [syncTimeRange, setSyncTimeRange] = useState<{ from: number; to: number } | null>(null);
  const [syncCrosshair, setSyncCrosshair] = useState<number | null>(null);
  const syncSourceIdRef = useRef<string | null>(null);

  // ── Primary Chart Instance ──
  const [primaryChart, setPrimaryChart] = useState<IChartApi | null>(null);
  const [primarySeries, setPrimarySeries] = useState<ISeriesApi<any> | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  const compSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const indicatorSeriesRefs = useRef<Map<string, { series: ISeriesApi<any>; type: string }>>(new Map());

  // ✅ Reset references when chart is about to remount to avoid using stale/destroyed objects
  const chartId = `${ticker}-${currentInterval}-${chartType}`;
  const [lastChartId, setLastChartId] = useState(chartId);
  if (lastChartId !== chartId) {
    setPrimaryChart(null);
    setPrimarySeries(null);
    // ✅ MUST clear these refs too! They hold series bound to the OLD chart instance.
    indicatorSeriesRefs.current.clear();
    compSeriesRef.current.clear();
    setLastChartId(chartId);
  }

  // Handle keyboard for interval switching and ticker search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input/textarea, ignore
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      // Detect Alphabetical keys for Ticker Search
      if (/^[a-zA-Z]$/.test(e.key)) {
        setQuickSearchQuery(e.key.toUpperCase());
        setShowTickerSearch(true);
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        setTypedInterval(prev => prev + e.key);
        setShowIntervalInput(true);
      } else if (e.key === 'Enter' && typedInterval) {
        // e.g., '15' -> '15m'
        const newInterval = typedInterval + 'm';
        setCurrentInterval(newInterval);
        setTypedInterval('');
        setShowIntervalInput(false);
      } else if (e.key === 'Escape') {
        setTypedInterval('');
        setShowIntervalInput(false);
        setShowTickerSearch(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [typedInterval]);

  // Auto-hide interval input
  useEffect(() => {
    if (showIntervalInput) {
      const timer = setTimeout(() => {
        setShowIntervalInput(false);
        setTypedInterval('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showIntervalInput, typedInterval]);

  // Subscribe to live ticks for current ticker
  useEffect(() => {
    if (!ticker) return;
    subscribe([ticker]);
    console.log(`[ChartComponent] Subscribed to live ticks for: ${ticker}`);
  }, [ticker, subscribe]);

  // Handle live ticks and update chart
  useEffect(() => {
    if (!lastMessage || !primarySeries || !primaryChart || !ticker) return;

    // Message format from backend: { symbol: "...", ltp: 123.45, ts: 1700000000, ... }
    if (lastMessage.symbol !== ticker) return;

    const ltp = lastMessage.ltp;
    if (!ltp) return;

    // Convert backend ms timestamp to seconds for lightweight-charts
    const timestamp = Math.floor(lastMessage.ts / 1000);

    // Interval window logic (e.g., 1m = 60s, 5m = 300s)
    let intervalSeconds = 60; // default 1m
    const match = currentInterval.match(/^(\d+)([mhd])$/);
    if (match) {
      const val = parseInt(match[1]);
      const unit = match[2];
      if (unit === 'm') intervalSeconds = val * 60;
      else if (unit === 'h') intervalSeconds = val * 3600;
      else if (unit === 'd') intervalSeconds = val * 86400;
    }

    const candleStart = Math.floor(timestamp / intervalSeconds) * intervalSeconds;

    setChartData(prev => {
      if (prev.length === 0) return prev;

      const lastCandle = prev[prev.length - 1];
      const isNewCandle = candleStart > (lastCandle.time as number);

      if (isNewCandle) {
        // Push new candle
        const newCandle = {
          time: candleStart as Time,
          open: ltp,
          high: ltp,
          low: ltp,
          close: ltp,
          v: lastMessage?.volume || lastMessage?.v || lastMessage?.vqi || 0,
        };
        
        // Use correct format for update based on chartType
        if (chartType === 'Line' || chartType === 'Area') {
          primarySeries.update({ time: newCandle.time, value: newCandle.close });
        } else {
          primarySeries.update(newCandle);
        }
        
        return [...prev, newCandle];
      } else {
        // Update existing candle
        const updatedCandle = {
          ...lastCandle,
          high: Math.max(lastCandle.high, ltp),
          low: Math.min(lastCandle.low, ltp),
          close: ltp,
          v: lastMessage?.volume || lastMessage?.v || lastMessage?.vqi || lastCandle.v || 0,
        };

        // Use correct format for update based on chartType
        if (chartType === 'Line' || chartType === 'Area') {
          primarySeries.update({ time: updatedCandle.time, value: updatedCandle.close });
        } else {
          primarySeries.update(updatedCandle);
        }

        const next = [...prev];
        next[next.length - 1] = updatedCandle;
        return next;
      }
    });

    // Also update indicators if needed - usually they'll recalculate on next data change
    // but lightweight-charts handles update() calls transparently.

  }, [lastMessage, ticker, currentInterval, primarySeries]);

  const { currentTheme } = useTheme();
  const isDark = currentTheme.mode === 'dark';

  // ── Drawing Engine ──
  const {
    drawings: engineDrawings,
    activeTool: engineActiveTool,
    setActiveTool: setEngineActiveTool,
    undo, redo,
    deleteDrawing,
    toggleVisibility: toggleDrawingVisibility,
    updateDrawingPoints,
    updateDrawingStyle,
    selectedId,
    setSelectedId,
    previewPoints,
    isDrawing,
    magnetMode,
    setMagnetMode,
    handleChartClick: engineHandleClick,
    handleMouseMove: engineHandleMouseMove,
  } = useDrawingEngine(primaryChart, primarySeries as any, ticker, currentInterval);

  // ── Wire Drawing Engine to Chart Events ──
  // Use stable refs so the subscription doesn't re-fire on every drawing state update
  const engineHandleClickRef = useRef(engineHandleClick);
  const engineHandleMouseMoveRef = useRef(engineHandleMouseMove);
  useEffect(() => { engineHandleClickRef.current = engineHandleClick; }, [engineHandleClick]);
  useEffect(() => { engineHandleMouseMoveRef.current = engineHandleMouseMove; }, [engineHandleMouseMove]);

  useEffect(() => {
    if (!primaryChart) return;
    const stableClick = (p: any) => engineHandleClickRef.current(p);
    const stableMove = (p: any) => engineHandleMouseMoveRef.current(p);
    
    try {
      primaryChart.subscribeClick(stableClick);
      primaryChart.subscribeCrosshairMove(stableMove);
    } catch (e) {
      console.warn('Failed to subscribe to chart events', e);
    }

    return () => {
      try {
        primaryChart.unsubscribeClick(stableClick);
        primaryChart.unsubscribeCrosshairMove(stableMove);
      } catch (e) {
        // Silently fail if chart is already disposed
      }
    };
  }, [primaryChart]);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo?.(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey))) { e.preventDefault(); redo?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ── Fetch Primary Data ──
  useEffect(() => {
    let isActive = true;
    const fetchData = async () => {
      if (!ticker) return;

      // Clear old data immediately to avoid "wrong chart" flash
      setChartData([]);

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:8000/api/v1/analyze/${encodeURIComponent(ticker)}?interval=${currentInterval}`);
        if (!isActive) return;

        const json = await res.json();
        const src: 'broker' | 'yahoo' | 'demo' = json.source ?? 'demo';
        setDataSource(src);
        const formatted: any[] = (json.data as any[]).map(d => ({
          time: (typeof d.date === 'string' ? Math.floor(new Date(d.date).getTime() / 1000) : d.timestamp) as Time,
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
          v: Number(d.volume || d.v || 0),
        })).filter(d =>
          d.time &&
          !isNaN(d.open) && !isNaN(d.high) &&
          !isNaN(d.low) && !isNaN(d.close)
        );

        const sortedData = formatted
          .sort((a, b) => (a.time as number) - (b.time as number));

        // Final Deduplication
        const uniqueData: any[] = [];
        const seenTimes = new Set();
        for (const d of sortedData) {
          if (!seenTimes.has(d.time)) {
            seenTimes.add(d.time);
            uniqueData.push(d);
          }
        }

        if (isActive) {
          setChartData(uniqueData);
        }
      } catch {
        if (isActive) setError('Failed to load chart data');
      } finally {
        if (isActive) setLoading(false);
      }
    };
    fetchData();
    return () => { isActive = false; };
  }, [ticker, currentInterval]);

  // ── Comparison Overlay Series on Primary Chart ──
  useEffect(() => {
    if (!primaryChart || !primarySeries) return;

    compSeriesRef.current.forEach((s, sym) => {
      const still = comparisonSymbols.find(c => c.symbol === sym && c.pane === 'main' && c.visible);
      if (!still) {
        try { primaryChart.removeSeries(s); } catch (_) { }
        compSeriesRef.current.delete(sym);
      }
    });

    comparisonSymbols.filter(c => c.pane === 'main' && c.visible).forEach((comp, i) => {
      let lineSeries = compSeriesRef.current.get(comp.symbol);
      if (!lineSeries) {
        const color = COMP_COLORS[i % COMP_COLORS.length];
        lineSeries = primaryChart.addLineSeries({
          color,
          lineWidth: 2,
          title: comp.symbol,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          priceScaleId: comp.scale === 'left' ? 'left' : 'right',
        });
        compSeriesRef.current.set(comp.symbol, lineSeries);
      }
      const lineData = comp.data
        .map(d => ({ time: d.time as Time, value: d.value ?? d.close ?? 0 }))
        .filter(d => d.time && d.value > 0);
      if (lineData.length > 0) {
        try { lineSeries.setData(lineData); } catch (_) { }
      }
    });
  }, [comparisonSymbols, primaryChart]);

  // ── Apply chartSettings once when primaryChart first becomes available ──
  useEffect(() => {
    if (!primaryChart) return;
    primaryChart.applyOptions({
      grid: {
        vertLines: { visible: chartSettings.showGrid, color: 'rgba(148,163,184,0.08)' },
        horzLines: { visible: chartSettings.showGrid, color: 'rgba(148,163,184,0.08)' },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryChart]);

  // ── Indicators on Primary Chart ──
  useEffect(() => {
    if (!primaryChart || !primarySeries || chartData.length === 0) return;

    try {
      indicatorSeriesRefs.current.forEach((ref, key) => {
        if (!activeIndicators.has(key) && key !== 'ICHIMOKU_KIJUN') {
          try { primaryChart.removeSeries(ref.series); } catch (_) { }
          indicatorSeriesRefs.current.delete(key);
        }
      });

      const COLORS: Record<string, string> = {
        SMA20: '#FF9800',
        SMA50: '#FF6D00',
        EMA20: '#2196F3',
        EMA50: '#64B5F6',
        BB: '#00BCD4',
        VWAP: '#10b981',
        ICHIMOKU: '#6366f1',
        PSAR: '#ec4899',
        RSI: '#7E57C2',
        MACD: '#E91E63',
        STOCH: '#14b8a6',
        CCI: '#f59e0b',
        ATR: '#a855f7',
        ADX: '#0ea5e9',
        OBV: '#22c55e',
      };

      const toTimeSeries = (arr: { time: any; value: number }[]) =>
        arr.map(d => ({ time: d.time as Time, value: d.value }));

      // Only render "main pane" indicators as overlay series on the primary chart.
      activeIndicators.forEach(ind => {
        const config = indicatorConfigs[ind] || { pane: 'main' };
        if (config.pane !== 'main') return;

        const existing = indicatorSeriesRefs.current.get(ind);
        const plotType = config.plotType || 'Line';

        // 1. Calculate Data (Recalculate even if existing, to handle period changes)
        let indData: { time: Time; value: number }[] = [];
        try {
          if (ind === 'SMA20') indData = toTimeSeries(calculateSMA(chartData, config.period ?? 20));
          else if (ind === 'SMA50') indData = toTimeSeries(calculateSMA(chartData, config.period ?? 50));
          else if (ind === 'EMA20') indData = toTimeSeries(calculateEMA(chartData, config.period ?? 20));
          else if (ind === 'EMA50') indData = toTimeSeries(calculateEMA(chartData, config.period ?? 50));
          else if (ind === 'RSI') indData = toTimeSeries(calculateRSI(chartData, config.period ?? 14));
          else if (ind === 'BB') indData = toTimeSeries(calculateBollingerBands(chartData, 20, 2).middle);
          else if (ind === 'MACD') indData = calculateMACD(chartData).map(d => ({ time: d.time as Time, value: d.macd }));
          else if (ind === 'VWAP') indData = toTimeSeries(calculateVWAP(chartData));
          else if (ind === 'ATR') indData = toTimeSeries(calculateATR(chartData, config.period ?? 14));
          else if (ind === 'CCI') indData = toTimeSeries(calculateCCI(chartData, 20));
          else if (ind === 'STOCH') indData = toTimeSeries(calculateStochastic(chartData, 14, 3));
          else if (ind === 'ADX') indData = toTimeSeries(calculateADX(chartData, 14));
          else if (ind === 'OBV') indData = toTimeSeries(calculateOBV(chartData));
          else if (ind === 'PSAR') indData = toTimeSeries(calculatePSAR(chartData));
          else if (ind === 'ICHIMOKU') {
            const { tenkan, kijun } = calculateIchimoku(chartData);
            if (tenkan.length > 0) {
              // Re-create or update Ichimoku
              let s1: any;
              if (existing && existing.type === 'Line') {
                s1 = existing.series;
                s1.applyOptions({ color: config.color || '#6366f1', lineWidth: (config.lineWidth || 1) as any, visible: config.visible !== false });
              } else {
                if (existing) try { primaryChart.removeSeries(existing.series); } catch (_) { }
                s1 = primaryChart.addLineSeries({ color: config.color || '#6366f1', lineWidth: (config.lineWidth || 1) as any, title: 'Tenkan', priceLineVisible: false });
                indicatorSeriesRefs.current.set('ICHIMOKU', { series: s1, type: 'Line' });
              }
              s1.setData(toTimeSeries(tenkan));
            }
            if (kijun.length > 0) {
              const kInd = 'ICHIMOKU_KIJUN';
              const kExisting = indicatorSeriesRefs.current.get(kInd);
              let s2: any;
              if (kExisting) {
                s2 = kExisting.series;
                s2.applyOptions({ color: '#a78bfa', lineWidth: (config.lineWidth || 1) as any, visible: config.visible !== false });
              } else {
                s2 = primaryChart.addLineSeries({ color: '#a78bfa', lineWidth: (config.lineWidth || 1) as any, title: 'Kijun', priceLineVisible: false });
                indicatorSeriesRefs.current.set(kInd, { series: s2, type: 'Line' });
              }
              s2.setData(toTimeSeries(kijun));
            }
            return;
          }
        } catch { return; }

        // 2. Handle Series Instance (Update existing or recreate if type mismatch)
        let series: any;
        if (existing) {
          if (existing.type === plotType) {
            series = existing.series;
            series.applyOptions({
              color: config.color || COLORS[ind] || '#aaa',
              lineWidth: (config.lineWidth || 2) as any,
              visible: config.visible !== false,
            } as any);
          } else {
            try { primaryChart.removeSeries(existing.series); } catch (_) { }
            indicatorSeriesRefs.current.delete(ind);
          }
        }

        // 3. Create NEW if doesn't exist (re-uses calculation from step 1)
        if (!series && indData.length > 0) {
          const options: any = {
            color: config.color || COLORS[ind] || '#aaa',
            lineWidth: (config.lineWidth || 2) as any,
            title: ind,
            priceLineVisible: false,
            visible: config.visible !== false,
          };

          if (plotType === 'Area') {
            series = primaryChart.addAreaSeries({ ...options, topColor: (options.color + '40'), bottomColor: (options.color + '05') });
          } else if (plotType === 'Histogram') {
            series = primaryChart.addHistogramSeries({ ...options });
          } else {
            series = primaryChart.addLineSeries({ ...options, lineType: plotType === 'Step' ? 2 : 0 });
          }
          indicatorSeriesRefs.current.set(ind, { series, type: plotType });
        }

        // 4. Update Data (Handles period changes)
        if (series && indData.length > 0) {
          series.setData(indData);
        }
      });

      // Clean up ICHIMOKU_KIJUN when ICHIMOKU is deactivated
      if (!activeIndicators.has('ICHIMOKU')) {
        const kijunRef = indicatorSeriesRefs.current.get('ICHIMOKU_KIJUN');
        if (kijunRef) {
          try { primaryChart.removeSeries(kijunRef.series); } catch (_) { }
          indicatorSeriesRefs.current.delete('ICHIMOKU_KIJUN');
        }
      }
    } catch (e) {
      console.warn('Indicator update failed gracefully:', e);
    }
  }, [activeIndicators, chartData, primaryChart, indicatorConfigs]);

  // Remove overlay series when indicator moved to a new pane
  useEffect(() => {
    indicatorSeriesRefs.current.forEach((ref, key) => {
      const pane = indicatorConfigs[key]?.pane ?? 'main';
      if (pane !== 'main') {
        try { primaryChart?.removeSeries(ref.series); } catch (_) { }
        indicatorSeriesRefs.current.delete(key);
      }
    });
  }, [indicatorConfigs, primaryChart]);

  const indicatorPaneData = useCallback((ind: string): any[] => {
    if (chartData.length === 0) return [];
    try {
      if (ind === 'RSI') {
        const p = indicatorConfigs[ind]?.period ?? 14;
        return calculateRSI(chartData, p).map(d => ({ time: d.time as Time, close: d.value }));
      }
      if (ind === 'MACD') {
        return calculateMACD(chartData).map(d => ({ time: d.time as Time, close: d.macd }));
      }
      if (ind === 'ATR') {
        const p = indicatorConfigs[ind]?.period ?? 14;
        return calculateATR(chartData, p).map(d => ({ time: d.time as Time, close: d.value }));
      }
      if (ind === 'OBV') {
        return calculateOBV(chartData).map(d => ({ time: d.time as Time, close: d.value }));
      }
    } catch { }
    return [];
  }, [chartData, indicatorConfigs]);

  const toggleIndicator = useCallback((id: string) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleIndicatorVisibility = useCallback((id: string) => {
    setHiddenIndicators(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // Toggle Visibility of existing indicator series natively
  useEffect(() => {
    indicatorSeriesRefs.current.forEach((ref, key) => {
      if (key === 'ICHIMOKU_KIJUN') return;
      const isVisible = !hiddenIndicators.has(key);
      ref.series.applyOptions({ visible: isVisible });
      if (key === 'ICHIMOKU') {
         const kRef = indicatorSeriesRefs.current.get('ICHIMOKU_KIJUN');
         if (kRef) kRef.series.applyOptions({ visible: isVisible });
      }
    });
  }, [hiddenIndicators]);

  // ── Pane Sync handlers ──
  const handleSyncTimeRange = useCallback((id: string, range: { from: number; to: number }) => {
    syncSourceIdRef.current = id;
    setSyncTimeRange(range);
  }, []);

  const handleSyncCrosshair = useCallback((id: string, time: number | null) => {
    syncSourceIdRef.current = id;
    setSyncCrosshair(time);
  }, []);

  // ── Snapshot ──
  const handleSnapshot = () => {
    if (!primaryChart) return;
    const canvas = primaryChart.takeScreenshot();
    const link = document.createElement('a');
    link.download = `${ticker}_chart.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ── Derived ──
  const newPaneSymbols = comparisonSymbols.filter(s => s.visible && s.pane === 'new');
  const newPaneIndicators = Array.from(activeIndicators).filter(ind => (indicatorConfigs[ind]?.pane ?? 'main') === 'new');
  const paneCount = 1 + newPaneSymbols.length + newPaneIndicators.length;
  const paneHeightPct = `${100 / paneCount}%`;

  const wrapperBg = isDark ? 'bg-[#0B0F14]' : 'bg-white';
  const wrapperBorder = isDark ? 'border-slate-800' : 'border-slate-200';

  return (
    <div className={`flex flex-col rounded-xl border ${wrapperBorder} relative overflow-hidden ${wrapperBg} flex-1 min-h-0`}>

      {/* ══ Toolbar ══ */}
      <ChartToolbar
        ticker={ticker}
        dataSource={dataSource}
        interval={currentInterval}
        onIntervalChange={setCurrentInterval}
        onChartTypeChange={setChartType}
        currentChartType={chartType}
        onToggleIndicator={toggleIndicator}
        activeIndicators={Array.from(activeIndicators)}
        onSnapshot={handleSnapshot}
        onReset={() => {
          if (!primaryChart || chartData.length === 0) return;
          const timeScale = primaryChart.timeScale();
          const lastPoint = chartData[chartData.length - 1].time as number;
          const oneDayAgo = lastPoint - 24 * 60 * 60;
          timeScale.setVisibleRange({ from: oneDayAgo as Time, to: lastPoint as Time });
        }}
        chartSettings={chartSettings}
        onSettingsChange={setChartSettings}
        activeDrawingTool={engineActiveTool as any}
        onDrawingToolChange={setEngineActiveTool as any}
        drawings={engineDrawings as any}
        onToggleDrawing={toggleDrawingVisibility}
        onDeleteDrawing={deleteDrawing}
        onUpdateDrawingStyle={updateDrawingStyle as any}
        onSelectDrawing={setSelectedId}
        selectedId={selectedId}
        magnetMode={magnetMode}
        onMagnetModeChange={setMagnetMode}
        onOptionChainClick={() => setIsOptionChainOpen(true)}
        onAnalyzeClick={onAnalyzeClick}
        onJumpToDate={(year, month) => {
          // Use UTC to avoid local-timezone offset (especially IST = UTC+5:30)
          if (!primaryChart) return;
          const ts = Math.floor(Date.UTC(year, month - 1, 1) / 1000);
          primaryChart.timeScale().setVisibleRange({
            from: ts as Time,
            to: (ts + 60 * 60 * 24 * 30) as Time,   // ~1 month window
          });
        }}
      />

      {/* ══ Pane Area ══ */}
      <div ref={overlayRef} className="flex-1 min-h-0 flex flex-col relative overflow-hidden">


        {/* ─ Primary Pane ─ */}
        <ChartPane
          key={`primary-${ticker}-${currentInterval}`}
          id="primary"
          symbol={ticker}
          interval={currentInterval}
          data={chartData}
          isPrimary={true}
          height={paneHeightPct}
          currentPrice={currentPrice}
          showSessionLines={showSessionLines}
          onToggleSessionLines={() => setShowSessionLines(v => !v)}

          // ✅ FIX: chartType was MISSING here — that's why chart never changed
          chartType={chartType}

          // ✅ FIX: chartSettings props — grid, logScale, priceScaleSide now passed
          showGrid={chartSettings.showGrid}
          logScale={chartSettings.logScale}
          priceScaleSide={chartSettings.priceScaleSide}
          crosshairMode={chartSettings.crosshairMode}

          onChartReady={(chart, series) => {
            setPrimaryChart(chart);
            setPrimarySeries(series);
          }}
          onSyncTimeRange={(r) => handleSyncTimeRange('primary', r)}
          onSyncCrosshair={(t) => handleSyncCrosshair('primary', t)}
          onHoverChange={setHoveredData}
          syncedTimeRange={syncSourceIdRef.current !== 'primary' ? syncTimeRange : null}
          syncedCrosshair={syncSourceIdRef.current !== 'primary' ? syncCrosshair : null}
        />

        {/* ─ Additional Panes (comparison "new" pane) ─ */}
        {newPaneSymbols.map(sym => (
          <ChartPane
            key={sym.symbol}
            id={sym.symbol}
            symbol={sym.symbol}
            interval={currentInterval}
            data={sym.data}
            height={paneHeightPct}
            chartType={chartType}                      // ✅ sync type across panes
            showGrid={chartSettings.showGrid}          // ✅ sync grid across panes
            logScale={chartSettings.logScale}          // ✅ sync logScale across panes
            onClose={() => onRemoveComparison?.(sym.symbol)}
            onSyncTimeRange={(r) => handleSyncTimeRange(sym.symbol, r)}
            onSyncCrosshair={(t) => handleSyncCrosshair(sym.symbol, t)}
            syncedTimeRange={syncSourceIdRef.current !== sym.symbol ? syncTimeRange : null}
            syncedCrosshair={syncSourceIdRef.current !== sym.symbol ? syncCrosshair : null}
          />
        ))}

        {/* ─ Indicator Panes (new pane) ─ */}
        {newPaneIndicators.map(ind => (
          <ChartPane
            key={`ind:${ind}`}
            id={`ind:${ind}`}
            symbol={ind}
            interval={currentInterval}
            data={indicatorPaneData(ind)}
            height={paneHeightPct}
            chartType={'Line'}
            showGrid={chartSettings.showGrid}
            logScale={false}
            onClose={() => setIndicatorConfigs(prev => ({ ...prev, [ind]: { ...(prev[ind] ?? { pane: 'main' }), pane: 'main' } }))}
            onSyncTimeRange={(r) => handleSyncTimeRange(`ind:${ind}`, r)}
            onSyncCrosshair={(t) => handleSyncCrosshair(`ind:${ind}`, t)}
            syncedTimeRange={syncSourceIdRef.current !== `ind:${ind}` ? syncTimeRange : null}
            syncedCrosshair={syncSourceIdRef.current !== `ind:${ind}` ? syncCrosshair : null}
          />
        ))}

        {/* ─ Drawing Layer ─ */}
        {primaryChart && primarySeries && (
          <DrawingLayer
            chart={primaryChart}
            series={primarySeries as any}
            drawings={engineDrawings}
            activeTool={engineActiveTool as any}
            isDrawing={isDrawing}
            previewPoints={previewPoints}
            selectedId={selectedId}
            onUpdatePoints={updateDrawingPoints as any}
            onSelect={setSelectedId}
            width={overlayRef.current?.clientWidth || 0}
            height={(overlayRef.current?.clientHeight || 0) / paneCount}
          />
        )}

        {/* ─ Comparison Legend ─ */}
        <ComparativeLegend
          symbols={comparisonSymbols}
          mainSymbol={ticker}
          onToggle={onToggleComparison!}
          onRemove={onRemoveComparison!}
          onToggleScale={onToggleScale}
          onTogglePane={onTogglePane}
          isLoading={compLoading}
        />
      </div>

      <OptionChainDrawer isOpen={isOptionChainOpen} onClose={() => setIsOptionChainOpen(false)} symbol={ticker} />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/10 transition-opacity duration-300">
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <span className="text-sm font-bold text-slate-200 tracking-wider uppercase">Loading Market Data...</span>
          </div>
        </div>
      )}

      {/* ─ Error Overlay ─ */}
      {error && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/40 animate-in fade-in duration-300">
          <div className="max-w-md p-8 rounded-3xl bg-slate-900/90 border border-rose-500/30 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 border border-rose-500/20">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Data Stream Interrupted</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="group relative px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-rose-500/25 active:scale-95"
            >
              Reconnect Stream
            </button>
          </div>
        </div>
      )}

      {/* ─ Floating Maximize Button (Bottom Middle) ─ */}
      <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-[10] flex items-center">
        <button
          onClick={onToggleMaximize}
          className="
      flex items-center gap-2 px-4 py-2
      rounded-full
      bg-[#1e222d]/70 backdrop-blur-xl
      border border-white/10
      hover:bg-indigo-500/20
      hover:border-indigo-500/40
      transition-all duration-300 ease-out
      shadow-xl hover:shadow-indigo-500/30
      text-text-primary
      group relative
    "
          title={isMaximized ? "Exit Fullscreen" : "Enter Fullscreen"}
        >

          {/* Icon */}
          <span className="flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            {isMaximized ? (
              <Minimize size={16} className="text-indigo-400" />
            ) : (
              <Maximize size={16} className="text-indigo-400" />
            )}
          </span>

          {/* Label */}
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 opacity-80 group-hover:opacity-100">
            {isMaximized ? "MIN" : "MAX"}
          </span>

          {/* Glow Effect */}
          <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition bg-indigo-500/10 blur-md"></span>

        </button>
      </div>

      {/* ─ Ticker Logo & Data Overlay (TradingView Style) ─ */}
      <div className="absolute top-12 left-6 z-[40] pointer-events-none flex items-center gap-3 select-none">
        {/* Main Badge */}
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border shadow-xl ${isDark ? 'bg-[#131722] border-[#2a2e39]' : 'bg-white border-slate-200'}`}>
          <StockLogo symbol={ticker} size={5} className={`shadow-sm border ${isDark ? 'border-white/10' : 'border-slate-100'}`} />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[12px] font-bold ${isDark ? 'text-[#d1d4dc]' : 'text-slate-800'} truncate max-w-[150px]`}>{ticker}</span>
            <span className="text-[12px] text-[#868993]">·</span>
            <span className={`text-[12px] font-bold ${isDark ? 'text-[#d1d4dc]' : 'text-slate-800'}`}>{currentInterval.replace('m', '')}</span>
            <span className="text-[12px] text-[#868993]">·</span>
            <span className={`text-[12px] font-bold ${isDark ? 'text-[#d1d4dc]' : 'text-slate-800'}`}>NSE</span>
            <div className="w-5 h-5 flex items-center justify-center ml-1 opacity-60">
              <Layout size={12} className="text-[#868993] fill-current" />
            </div>
            <div className="w-5 h-5 flex items-center justify-center -ml-1 opacity-60">
              <MoreHorizontal size={14} className="text-[#868993]" />
            </div>
          </div>
        </div>

        {/* OHLC Data */}
        <div className="flex items-center gap-3 text-[12px] font-medium tracking-tight">
          {(hoveredData || chartData.length > 0) && (() => {
            const dataToShow = hoveredData || chartData[chartData.length - 1];
            const last = dataToShow;
            const prevIndex = hoveredData ? chartData.findIndex(d => (d.time as number) === (hoveredData.time as number)) - 1 : chartData.length - 2;
            const prev = chartData[Math.max(0, prevIndex)] || last;

            const diff = last.close - prev.close;
            const pct = (diff / prev.close) * 100;
            const isUp = diff >= 0;
            const color = isUp ? 'text-[#089981]' : 'text-[#f23645]';

            return (
              <>
                <div className="flex items-center gap-0.5"><span className="text-[#868993]">O</span><span className={`${isDark ? 'text-[#d1d4dc]' : 'text-slate-800'} font-mono`}>{last.open.toFixed(2)}</span></div>
                <div className="flex items-center gap-0.5"><span className="text-[#868993]">H</span><span className={`${isDark ? 'text-[#d1d4dc]' : 'text-slate-800'} font-mono`}>{last.high.toFixed(2)}</span></div>
                <div className="flex items-center gap-0.5"><span className="text-[#868993]">L</span><span className={`${isDark ? 'text-[#d1d4dc]' : 'text-slate-800'} font-mono`}>{last.low.toFixed(2)}</span></div>
                <div className="flex items-center gap-0.5"><span className="text-[#868993]">C</span><span className={`${color} font-mono`}>{last.close.toFixed(2)}</span></div>
                <div className={`flex items-center gap-1 font-mono ${color}`}>
                  <span>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</span>
                  <span>({diff > 0 ? '+' : ''}{pct.toFixed(2)}%)</span>
                </div>
                <div className="flex items-center gap-0.5 ml-1">
                  <span className="text-[#868993]">Vol</span>
                  <span className={`${color} font-mono`}>
                    {last.v ? (last.v > 1000000 ? `${(last.v / 1000000).toFixed(2)}M` : last.v > 1000 ? `${(last.v / 1000).toFixed(2)}K` : last.v) : '0'}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ─ Active Indicators Legend ─ */}
      {activeIndicators.size > 0 && (
        <div className="absolute top-24 left-6 z-[40] pointer-events-none flex flex-col gap-1.5 select-none animate-in fade-in duration-200">
          {Array.from(activeIndicators).map(ind => (
            <div key={ind} className={`group flex items-center gap-1.5 px-2 py-1 rounded-md border shadow-sm pointer-events-auto transition-colors ${isDark ? 'bg-[#131722]/90 border-[#2a2e39] text-[#d1d4dc]' : 'bg-white/90 border-slate-200 text-slate-800'}`}>
              <span className="text-[11px] font-bold tracking-wider mr-1">
                {(() => {
                  const p = indicatorConfigs[ind]?.period;
                  if (!p) return ind;
                  if (ind === 'RSI' || ind === 'ATR') return `${ind}(${p})`;
                  if (ind.startsWith('SMA')) return `SMA(${p})`;
                  if (ind.startsWith('EMA')) return `EMA(${p})`;
                  return ind;
                })()}
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleIndicatorVisibility(ind); }} 
                className={`transition-all focus:opacity-100 ${hiddenIndicators.has(ind) ? 'opacity-100 text-slate-500 hover:text-indigo-400' : 'opacity-0 group-hover:opacity-100 hover:text-indigo-400'}`} 
                title={hiddenIndicators.has(ind) ? "Show" : "Hide"}
              >
                {hiddenIndicators.has(ind) ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIndicatorSettingsOpen(prev => prev === ind ? null : ind); }}
                className="opacity-0 group-hover:opacity-100 hover:text-indigo-400 transition-all focus:opacity-100"
                title={`${ind} Settings`}
              >
                <Settings size={12} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleIndicator(ind); }} 
                className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all focus:opacity-100" 
                title={`Remove ${ind}`}
              >
                <X size={12} />
              </button>

              {/* Settings popover */}
              {indicatorSettingsOpen === ind && (
                <div
                  className={`absolute left-full ml-2 top-0 z-[500] w-56 rounded-xl border shadow-2xl p-3 ${isDark ? 'bg-[#0f1419] border-white/10' : 'bg-white border-slate-200'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Indicator Settings</span>
                    <button onClick={() => setIndicatorSettingsOpen(null)} className={`${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'}`}>
                      <X size={12} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* ── Tabs ── */}
                    <div className="flex border-b border-border-primary/30">
                      {(['Inputs', 'Style', 'Visibility'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setIndicatorConfigs(prev => ({ 
                            ...prev, 
                            [ind]: { ...(prev[ind] ?? { pane: 'main' }), _activeTab: tab } 
                          }))}
                          className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest relative ${((indicatorConfigs[ind] as any)?._activeTab || 'Inputs') === tab ? 'text-indigo-400' : 'text-text-muted hover:text-text-primary'}`}
                        >
                          {tab}
                          {((indicatorConfigs[ind] as any)?._activeTab || 'Inputs') === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="min-h-[140px]">
                      {((indicatorConfigs[ind] as any)?._activeTab || 'Inputs') === 'Inputs' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                          <div>
                            <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1.5">Target Pane</div>
                            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-background/50 border border-border-primary/20">
                              {(['main', 'new'] as const).map(p => (
                                <button
                                  key={p}
                                  onClick={() => setIndicatorConfigs(prev => ({ ...prev, [ind]: { ...(prev[ind] ?? { pane: 'main' }), pane: p } }))}
                                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${((indicatorConfigs[ind]?.pane ?? 'main') === p)
                                    ? 'bg-indigo-500 text-white shadow-lg'
                                    : 'text-text-muted hover:text-text-primary hover:bg-surface/50'}`}
                                >
                                  {p === 'main' ? 'Overlay' : 'New Pane'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(['SMA20', 'SMA50', 'EMA20', 'EMA50', 'RSI', 'ATR', 'CCI', 'STOCH', 'ADX'] as string[]).includes(ind) && (
                            <div>
                              <div className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1.5">Indicator Period</div>
                              <input
                                type="number" min={2} max={300}
                                value={indicatorConfigs[ind]?.period ?? (ind.includes('50') ? 50 : ind.includes('20') ? 20 : 14)}
                                onChange={(e) => {
                                  const v = Math.max(2, Math.min(300, Number(e.target.value || 0)));
                                  setIndicatorConfigs(prev => ({ ...prev, [ind]: { ...(prev[ind] ?? { pane: 'main' }), period: v } }));
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-sm font-bold border outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {((indicatorConfigs[ind] as any)?._activeTab || 'Inputs') === 'Style' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                           <div className="flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  checked={indicatorConfigs[ind]?.visible !== false}
                                  onChange={(e) => setIndicatorConfigs(prev => ({ ...prev, [ind]: { ...(prev[ind] ?? { pane: 'main' }), visible: e.target.checked } }))}
                                  className="w-4 h-4 accent-indigo-500 rounded border-border-primary"
                                />
                                <span className="text-[11px] font-bold text-text-primary uppercase">{ind} Plot</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="color"
                                  value={indicatorConfigs[ind]?.color || '#4338ca'}
                                  onChange={(e) => setIndicatorConfigs(prev => ({ ...prev, [ind]: { ...(prev[ind] ?? { pane: 'main' }), color: e.target.value } }))}
                                  className="w-8 h-8 rounded-lg overflow-hidden border-0 p-0 bg-transparent cursor-pointer ring-1 ring-border-primary"
                                />
                                <div className="p-1.5 rounded-lg bg-background/50 border border-border-primary/20 flex gap-1">
                                  {[1, 2, 3, 4].map(w => (
                                    <button
                                      key={w}
                                      onClick={() => setIndicatorConfigs(prev => ({ ...prev, [ind]: { ...(prev[ind] ?? { pane: 'main' }), lineWidth: w } }))}
                                      className={`w-5 h-5 flex items-center justify-center rounded transition-all ${ (indicatorConfigs[ind]?.lineWidth || 2) === w ? 'bg-indigo-500 text-white' : 'text-text-muted hover:text-text-primary'}`}
                                    >
                                      <div className="bg-current rounded-full" style={{ width: w * 2, height: 2 }} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                           </div>
                           
                           <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Opacity</span>
                                <span className="text-[10px] font-mono text-indigo-400">{Math.round((indicatorConfigs[ind]?.opacity ?? 0.8) * 100)}%</span>
                              </div>
                              <input 
                                type="range" min="0.1" max="1" step="0.1"
                                value={indicatorConfigs[ind]?.opacity ?? 0.8}
                                onChange={(e) => setIndicatorConfigs(prev => ({ ...prev, [ind]: { ...(prev[ind] ?? { pane: 'main' }), opacity: parseFloat(e.target.value) } }))}
                                className="w-full accent-indigo-500"
                              />
                           </div>

                           <div className="space-y-1.5">
                              <div className="text-[9px] font-black text-text-muted uppercase tracking-widest">Plot Type</div>
                              <select 
                                value={indicatorConfigs[ind]?.plotType || 'Line'}
                                onChange={(e) => setIndicatorConfigs(prev => ({ ...prev, [ind]: { ...(prev[ind] ?? { pane: 'main' }), plotType: e.target.value as PlotType } }))}
                                className={`w-full px-3 py-2 rounded-xl text-[11px] font-bold border outline-none appearance-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                              >
                                <option value="Line">Line</option>
                                <option value="Step">Step Line</option>
                                <option value="Area">Area</option>
                                <option value="Histogram">Histogram</option>
                              </select>
                           </div>
                        </div>
                      )}

                      {((indicatorConfigs[ind] as any)?._activeTab || 'Inputs') === 'Visibility' && (
                        <div className="space-y-4 animate-in fade-in duration-200 py-2">
                           <div className="flex items-center justify-between p-3 rounded-xl bg-background/30 border border-border-primary/10">
                              <span className="text-xs font-bold text-text-primary">Show on Chart</span>
                              <button 
                                onClick={() => toggleIndicatorVisibility(ind)}
                                className={`w-10 h-5 rounded-full relative transition-colors ${!hiddenIndicators.has(ind) ? 'bg-indigo-500' : 'bg-slate-700'}`}
                              >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${!hiddenIndicators.has(ind) ? 'left-6' : 'left-1'}`} />
                              </button>
                           </div>
                           <p className="text-[10px] text-text-muted px-1">
                              Visibility settings affect all timeframes and data sources for this indicator.
                           </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border-primary/20 flex gap-2">
                      <button
                        onClick={() => {
                          setIndicatorConfigs(prev => {
                            const next = { ...prev };
                            delete next[ind];
                            return next;
                          });
                          setIndicatorSettingsOpen(null);
                        }}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDark ? 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                      >
                        Reset Defaults
                      </button>
                      <button
                        onClick={() => setIndicatorSettingsOpen(null)}
                        className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-lg"
                      >
                        Apply Done
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─ Typed Interval Inline Input ─ */}
      {showIntervalInput && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] flex flex-col items-center">
          <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-indigo-500 rounded-3xl p-8 shadow-[0_0_50px_rgba(99,102,241,0.3)] animate-in zoom-in duration-200">
            <span className="text-6xl font-black text-white font-mono tracking-widest">{typedInterval}</span>
            <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Change Interval (Enter)</div>
          </div>
        </div>
      )}

      {/* ─ Quick Ticker Search Overlay ─ */}
      {showTickerSearch && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setShowTickerSearch(false)}>
          <div className="w-full max-w-lg mx-4 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className={`p-6 rounded-2xl shadow-2xl border ${isDark ? 'bg-[#131722] border-[#2a2e39]' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Quick Search</span>
                <button onClick={() => setShowTickerSearch(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <TickerSearch
                onSelect={(symbol) => {
                  useMarketStore.getState().setTicker(symbol);
                  setShowTickerSearch(false);
                }}
                initialValue={quickSearchQuery}
                autoFocus={true}
                placeholder="Type symbol name..."
                className="w-full"
              />
              <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700">Enter</kbd> Select
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700">Esc</kbd> Close
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─ Drawing Settings Popup ─ */}
      {selectedId && (
        <DrawingStyleEditor
          drawing={engineDrawings.find(d => d.id === selectedId)}
          onUpdate={(style) => updateDrawingStyle(selectedId, style)}
          onDelete={() => deleteDrawing(selectedId)}
          onClose={() => setSelectedId(null)}
          isDark={isDark}
        />
      )}
    </div>
  );
};

export default ChartComponent;
export type { ChartComponentProps };