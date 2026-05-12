import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
    Settings, ChevronDown, Activity, BarChart2, Check,
    RotateCcw, PenTool, LayoutDashboard,
    Minus, Square, Type, ArrowRight, Grid3x3,
    TrendingUp, X, MoveVertical, Info,
    ArrowUpCircle, ArrowDownCircle, Smile, Hash, Percent, Ruler,
    GripHorizontal, Play, Eye, EyeOff, Trash2,
    Search, Layers, CalendarDays, AlignLeft, AlignRight,
    Crosshair, AreaChart,
    ChevronRight, AlertCircle, Camera
} from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { DrawingType, ToolCategory, MagnetMode } from './chart/drawing/types';
import { motion } from 'framer-motion';

// ─── Magnet SVG Icon (lucide doesn't ship Magnet in all versions) ─────────────
const MagnetIcon: React.FC<{ size?: number; className?: string }> = ({ size = 15, className = '' }) => (
    <svg
        width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        className={className}
    >
        <path d="M6 15A6 6 0 1 0 18 15V6" />
        <line x1="6" y1="6" x2="6" y2="15" />
        <line x1="18" y1="6" x2="18" y2="15" />
        <line x1="3" y1="6" x2="9" y2="6" />
        <line x1="15" y1="6" x2="21" y2="6" />
    </svg>
);

// ─── Dropdown Portal ──────────────────────────────────────────────────────────
const DropdownPortal: React.FC<{
    triggerRef: React.RefObject<HTMLButtonElement | HTMLDivElement>;
    open: boolean;
    align?: 'left' | 'right';
    onClose: () => void;
    children: React.ReactNode;
}> = ({ triggerRef, open, align = 'left', onClose, children }) => {
    const [pos, setPos] = useState({ top: 0, left: 0 });

    useLayoutEffect(() => {
        if (!open || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const top = rect.bottom + 6;
        const left = align === 'right' ? rect.right : rect.left;
        setPos({ top, left });
    }, [open, align]);

    if (!open) return null;

    return ReactDOM.createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div
                className="fixed z-[9999]"
                style={
                    align === 'right'
                        ? { top: pos.top, right: `calc(100vw - ${pos.left}px)` }
                        : { top: pos.top, left: pos.left }
                }
            >
                {children}
            </div>
        </>,
        document.body
    );
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChartSettings {
    showGrid: boolean;
    logScale: boolean;
    crosshairMode: 'normal' | 'magnet';
    priceScaleSide: 'right' | 'left';
}

interface Drawing {
    id: string;
    type: DrawingType;
    visible: boolean;
    label?: string;
    layer: string;
    style: { color: string; width: number; opacity: number; dashed?: boolean };
}

interface ChartToolbarProps {
    onToggleIndicator: (id: string) => void;
    activeIndicators: string[];
    onChartTypeChange: (type: 'Candle' | 'Line' | 'Area') => void;
    currentChartType: 'Candle' | 'Line' | 'Area';
    interval: string;
    onIntervalChange: (interval: string) => void;
    onReset: () => void;
    onSnapshot?: () => void;
    isCompact?: boolean;
    onOptionChainClick?: () => void;
    ticker?: string;
    dataSource?: 'broker' | 'yahoo' | 'demo' | null;
    onJumpToDate?: (year: number, month: number) => void;
    onAnalyzeClick?: () => void;
    onSettingsChange?: (settings: ChartSettings) => void;
    chartSettings?: ChartSettings;
    onDrawingToolChange?: (tool: DrawingType | 'none') => void;
    activeDrawingTool?: DrawingType | 'none';
    drawings?: Drawing[];
    onToggleDrawing?: (id: string) => void;
    onDeleteDrawing?: (id: string) => void;
    onUpdateDrawingStyle?: (id: string, style: Partial<Drawing['style']>) => void;
    onSelectDrawing?: (id: string | null) => void;
    selectedId?: string | null;
    magnetMode?: MagnetMode;
    onMagnetModeChange?: (mode: MagnetMode) => void;
}

// ─── Drawing Tools Map ────────────────────────────────────────────────────────
const DRAW_TOOLS_MAP: Record<ToolCategory, { id: DrawingType; label: string; icon: React.ReactNode; shortcut?: string }[]> = {
    [ToolCategory.STRUCTURE]: [
        { id: DrawingType.TREND_LINE, label: 'Trend Line', icon: <TrendingUp size={13} />, shortcut: 'T' },
        { id: DrawingType.RAY, label: 'Ray', icon: <ArrowRight size={13} />, shortcut: 'R' },
        { id: DrawingType.PITCHFORK, label: 'Pitchfork', icon: <GripHorizontal size={13} />, shortcut: 'F' },
        { id: DrawingType.HORIZONTAL_LINE, label: 'Horizontal Line', icon: <Minus size={13} />, shortcut: 'H' },
        { id: DrawingType.VERTICAL_LINE, label: 'Vertical Line', icon: <MoveVertical size={13} />, shortcut: 'V' },
        { id: DrawingType.PARALLEL_CHANNEL, label: 'Parallel Channel', icon: <GripHorizontal size={13} />, shortcut: 'P' },
    ],
    [ToolCategory.FIB_MEASURE]: [
        { id: DrawingType.FIB_RETRACEMENT, label: 'Fib Retracement', icon: <Hash size={13} /> },
        { id: DrawingType.FIB_EXTENSION, label: 'Fib Extension', icon: <Hash size={13} /> },
        { id: DrawingType.RISK_REWARD, label: 'Risk/Reward Box', icon: <Info size={13} /> },
        { id: DrawingType.RANGE_MEASURE, label: 'Price Range', icon: <Ruler size={13} /> },
    ],
    [ToolCategory.PRICE_ACTION]: [
        { id: DrawingType.RECTANGLE, label: 'Rectangle', icon: <Square size={13} />, shortcut: 'B' },
        { id: DrawingType.CIRCLE, label: 'Circle', icon: <Minus size={13} /> },
        { id: DrawingType.ELLIPSE, label: 'Ellipse', icon: <Minus size={13} /> },
        { id: DrawingType.PATH, label: 'Path', icon: <Percent size={13} /> },
    ],
    [ToolCategory.QUANT]: [
        { id: DrawingType.AUTO_TREND, label: 'Auto Trend Detection', icon: <Play size={13} /> },
    ],
    [ToolCategory.ANNOTATION]: [
        { id: DrawingType.SMART_LABEL, label: 'Smart Label', icon: <Info size={13} /> },
        { id: DrawingType.ARROW_UP, label: 'Arrow Up', icon: <ArrowUpCircle size={13} /> },
        { id: DrawingType.ARROW_DOWN, label: 'Arrow Down', icon: <ArrowDownCircle size={13} /> },
        { id: DrawingType.TEXT, label: 'Text', icon: <Type size={13} />, shortcut: 'X' },
        { id: DrawingType.EMOJI_MARKER, label: 'Emoji Marker', icon: <Smile size={13} /> },
    ],
};

// ─── Indicators Config ────────────────────────────────────────────────────────
const INDICATOR_GROUPS = [
    {
        label: 'Overlays',
        color: 'text-blue-500',
        items: [
            { id: 'SMA20', label: 'SMA (20)', dotColor: '#f59e0b' },
            { id: 'SMA50', label: 'SMA (50)', dotColor: '#f97316' },
            { id: 'EMA20', label: 'EMA (20)', dotColor: '#8b5cf6' },
            { id: 'EMA50', label: 'EMA (50)', dotColor: '#a78bfa' },
            { id: 'BB', label: 'Bollinger Bands', dotColor: '#06b6d4' },
            { id: 'VWAP', label: 'VWAP', dotColor: '#10b981' },
            { id: 'ICHIMOKU', label: 'Ichimoku Cloud', dotColor: '#6366f1' },
            { id: 'PSAR', label: 'Parabolic SAR', dotColor: '#ec4899' },
        ],
    },
    {
        label: 'Oscillators',
        color: 'text-indigo-400',
        items: [
            { id: 'RSI', label: 'RSI (14)', dotColor: '#f97316' },
            { id: 'MACD', label: 'MACD (12,26,9)', dotColor: '#ec4899' },
            { id: 'STOCH', label: 'Stochastic', dotColor: '#14b8a6' },
            { id: 'CCI', label: 'CCI (20)', dotColor: '#f59e0b' },
            { id: 'ATR', label: 'ATR (14)', dotColor: '#a855f7' },
            { id: 'ADX', label: 'ADX (14)', dotColor: '#0ea5e9' },
            { id: 'OBV', label: 'On-Balance Volume', dotColor: '#22c55e' },
        ],
    },
];

// ─── Chart Types ──────────────────────────────────────────────────────────────
const CHART_TYPES: { id: 'Candle' | 'Line' | 'Area'; label: string; icon: React.ReactNode }[] = [
    { id: 'Candle', label: 'Candlestick', icon: <BarChart2 size={14} /> },
    { id: 'Line', label: 'Line', icon: <TrendingUp size={14} /> },
    { id: 'Area', label: 'Area', icon: <AreaChart size={14} /> },
];

// ─── Timeframes ───────────────────────────────────────────────────────────────
const TIMEFRAMES = ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '2h', '4h', '1d', '1wk', '1mo'];

// ─── JumpToDate Modal ─────────────────────────────────────────────────────────
const JumpToDateModal: React.FC<{
    onClose: () => void;
    onJump: (year: number, month: number) => void;
    isDark: boolean;
}> = ({ onClose, onJump, isDark }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const handleSubmit = () => {
        if (year >= 1990 && year <= new Date().getFullYear() && month >= 1 && month <= 12) {
            onJump(year, month);
            onClose();
        }
    };

    return ReactDOM.createPortal(
        <>
            <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`fixed z-[10001] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 rounded-2xl border shadow-2xl p-5 ${isDark ? 'bg-[#0f1419] border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                    <span className={`text-[12px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Jump to Date</span>
                    <button onClick={onClose} className={`${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors`}><X size={14} /></button>
                </div>
                {/* Year */}
                <div className="mb-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Year</label>
                    <input
                        type="number" value={year} min={1990} max={new Date().getFullYear()}
                        onChange={e => setYear(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border outline-none transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                    />
                </div>
                {/* Month */}
                <div className="mb-5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Month</label>
                    <div className="grid grid-cols-6 gap-1">
                        {MONTHS.map((m, i) => (
                            <button
                                key={m}
                                onClick={() => setMonth(i + 1)}
                                className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${month === i + 1 ? 'bg-blue-500 text-white' : (isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                            >{m}</button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all"
                >
                    Go to {MONTHS[month - 1]} {year}
                </button>
            </div>
        </>,
        document.body
    );
};

// ─── Drawing Style Editor ─────────────────────────────────────────────────────
const DrawingStyleEditor: React.FC<{
    drawing: Drawing;
    onUpdate: (style: Partial<Drawing['style']>) => void;
    onClose: () => void;
    isDark: boolean;
}> = ({ drawing, onUpdate, onClose, isDark }) => {
    const PRESET_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#ffffff', '#94a3b8'];

    return (
        <div className={`absolute right-0 top-6 z-10 w-52 rounded-xl border shadow-2xl p-3 ${isDark ? 'bg-[#0f1419] border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Style</span>
                <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={11} /></button>
            </div>
            {/* Color */}
            <div className="mb-2">
                <div className="text-[9px] text-slate-600 mb-1 uppercase tracking-widest">Color</div>
                <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => onUpdate({ color: c })}
                            style={{ background: c }}
                            className={`w-5 h-5 rounded-full transition-all ${drawing.style.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-110' : 'hover:scale-110'}`}
                        />
                    ))}
                    <input
                        type="color" value={drawing.style.color}
                        onChange={e => onUpdate({ color: e.target.value })}
                        className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent"
                        title="Custom color"
                    />
                </div>
            </div>
            {/* Width */}
            <div className="mb-2">
                <div className="flex justify-between mb-1">
                    <span className="text-[9px] text-slate-600 uppercase tracking-widest">Width</span>
                    <span className="text-[9px] text-blue-400 font-bold">{drawing.style.width}px</span>
                </div>
                <input
                    type="range" min={1} max={6} value={drawing.style.width}
                    onChange={e => onUpdate({ width: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                />
            </div>
            {/* Opacity */}
            <div className="mb-2">
                <div className="flex justify-between mb-1">
                    <span className="text-[9px] text-slate-600 uppercase tracking-widest">Opacity</span>
                    <span className="text-[9px] text-blue-400 font-bold">{Math.round(drawing.style.opacity * 100)}%</span>
                </div>
                <input
                    type="range" min={0.1} max={1} step={0.05} value={drawing.style.opacity}
                    onChange={e => onUpdate({ opacity: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                />
            </div>
            {/* Dashed */}
            <button
                onClick={() => onUpdate({ dashed: !drawing.style.dashed })}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${drawing.style.dashed ? 'bg-blue-500/10 text-blue-400' : (isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}
            >
                <Minus size={11} className={drawing.style.dashed ? 'opacity-100' : 'opacity-40'} />
                Dashed Line
                {drawing.style.dashed && <Check size={11} className="ml-auto" />}
            </button>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ChartToolbar: React.FC<ChartToolbarProps> = ({
    onToggleIndicator, activeIndicators,
    onChartTypeChange, currentChartType,
    interval, onIntervalChange,
    onReset, onSnapshot,
    isCompact = false, onOptionChainClick,
    onJumpToDate, onAnalyzeClick,
    onSettingsChange, chartSettings,
    onDrawingToolChange, activeDrawingTool = 'none',
    drawings = [], onToggleDrawing, onDeleteDrawing,
    onUpdateDrawingStyle, onSelectDrawing, selectedId,
    magnetMode = MagnetMode.NONE, onMagnetModeChange,
}) => {
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');

    // ── Refs ────────────────────────────────────────────────────────────────────
    const drawingRef = useRef<HTMLButtonElement>(null);
    const drawingsLibRef = useRef<HTMLButtonElement>(null);
    const intervalRef = useRef<HTMLButtonElement>(null);
    const typeRef = useRef<HTMLButtonElement>(null);
    const indicatorsRef = useRef<HTMLButtonElement>(null);
    const settingsRef = useRef<HTMLButtonElement>(null);

    // ── Local state ─────────────────────────────────────────────────────────────
    const [activeDrawingCat, setActiveDrawingCat] = useState<ToolCategory>(ToolCategory.STRUCTURE);
    const [indicatorSearch, setIndicatorSearch] = useState('');
    const [showJumpToDate, setShowJumpToDate] = useState(false);
    const [editingDrawingId, setEditingDrawingId] = useState<string | null>(null);

    // ── Helpers ─────────────────────────────────────────────────────────────────
    const close = useCallback(() => setOpenMenu(null), []);
    const toggle = useCallback((name: string) => setOpenMenu(prev => prev === name ? null : name), []);

    const updateSetting = useCallback((key: keyof ChartSettings, value: any) => {
        if (chartSettings && onSettingsChange) {
            onSettingsChange({ ...chartSettings, [key]: value });
        }
    }, [chartSettings, onSettingsChange]);

    // ── Escape key handler ──────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                close();
                setShowJumpToDate(false);
                setEditingDrawingId(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [close]);

    // ── Active tool label ───────────────────────────────────────────────────────
    const activeToolLabel = React.useMemo(() => {
        if (activeDrawingTool === 'none') return null;
        for (const tools of Object.values(DRAW_TOOLS_MAP)) {
            const found = tools.find(t => t.id === activeDrawingTool);
            if (found) return found.label;
        }
        return null;
    }, [activeDrawingTool]);

    // ── Filtered indicators ─────────────────────────────────────────────────────
    const filteredGroups = React.useMemo(() => {
        if (!indicatorSearch.trim()) return INDICATOR_GROUPS;
        const q = indicatorSearch.toLowerCase();
        return INDICATOR_GROUPS.map(g => ({
            ...g,
            items: g.items.filter(i => i.label.toLowerCase().includes(q)),
        })).filter(g => g.items.length > 0);
    }, [indicatorSearch]);

    // ── Style classes ───────────────────────────────────────────────────────────
    const btn = `flex items-center justify-center gap-1.5 ${isCompact ? 'text-[11px] px-1.5' : 'text-[12px] px-2.5'} py-1.5 font-medium rounded-lg transition-all duration-150 active:scale-95 ${isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'} whitespace-nowrap shrink-0`;
    const toolBtn = `flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100'}`;
    const divV = `h-5 w-px ${isDark ? 'bg-slate-700/80' : 'bg-slate-200'} mx-1 shrink-0`;
    const panel = `${isDark ? 'bg-[#0f1419] border-slate-700/70 shadow-[0_8px_32px_rgba(0,0,0,0.6)]' : 'bg-white border-slate-200 shadow-xl'} border rounded-xl overflow-hidden`;

    const activeToolBtnClass = (active: boolean) =>
        active
            ? (isDark ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/25' : 'bg-blue-50 text-blue-600')
            : '';

    return (
        <>
            <div className={`flex items-center justify-between ${isCompact ? 'px-1' : 'px-3'} py-1 ${isDark ? 'bg-[#0b0f14] border-b border-slate-800' : 'bg-white border-b border-slate-200 shadow-sm'} w-full min-h-[46px] flex-nowrap overflow-x-auto select-none`}>

                {/* ════════════════════ LEFT ════════════════════ */}
                <div className="flex items-center flex-nowrap gap-0.5 shrink-0">

                    {/* ── Drawing Tools Trigger ────────────────────────── */}
                    <div className="flex items-center gap-0.5">
                        <button
                            ref={drawingRef}
                            onClick={() => toggle('drawing')}
                            className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg transition-all text-xs font-semibold ${openMenu === 'drawing' || activeDrawingTool !== 'none'
                                ? (isDark ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30' : 'bg-indigo-50 text-indigo-600')
                                : (isDark ? 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200' : 'text-slate-600 hover:bg-slate-100')
                                }`}
                            title="Drawing Tools"
                        >
                            <PenTool size={14} />
                            <ChevronDown size={10} className="opacity-50" />
                        </button>
                        {activeToolLabel && (
                            <span className="hidden md:inline px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded-md uppercase tracking-wider animate-in fade-in slide-in-from-left-2 outline outline-1 outline-indigo-500/20">
                                {activeToolLabel}
                            </span>
                        )}

                        {/* Magnet toggle — proper icon */}
                        <button
                            onClick={() => onMagnetModeChange?.(magnetMode === MagnetMode.NONE ? MagnetMode.STRONG : MagnetMode.NONE)}
                            title={`Magnet: ${magnetMode === MagnetMode.NONE ? 'OFF' : 'STRONG'} (M)`}
                            className={`${toolBtn} ${magnetMode !== MagnetMode.NONE ? 'text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/25' : ''}`}
                        >
                            <MagnetIcon size={15} className={magnetMode !== MagnetMode.NONE ? 'animate-pulse' : ''} />
                        </button>

                        {/* Drawings Library — shows saved drawings */}
                        <button
                            ref={drawingsLibRef}
                            onClick={() => toggle('drawingsLib')}
                            title="Drawings Library"
                            className={`${toolBtn} ${openMenu === 'drawingsLib' ? activeToolBtnClass(true) : ''} relative`}
                        >
                            <Layers size={15} />
                            {drawings.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-[8px] font-bold text-white">
                                    {drawings.length > 9 ? '9+' : drawings.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className={divV} />

                    {/* ── Interval Buttons ─────────────────────────────── */}
                    <div className="flex items-center gap-0.5">
                        <button
                            ref={intervalRef}
                            onClick={() => toggle('interval')}
                            className={`${toolBtn} px-1.5 h-7 ml-0.5 font-bold text-[11px]`}
                            title="Timeframes"
                        >
                            <span className="mr-0.5">{interval}</span>
                            <ChevronDown size={12} />
                        </button>
                    </div>

                    {/* ── Jump to Date ─────────────────────────────────── */}
                    {onJumpToDate && (
                        <button
                            onClick={() => setShowJumpToDate(true)}
                            title="Jump to Date"
                            className={`${toolBtn} ml-0.5`}
                        >
                            <CalendarDays size={15} />
                        </button>
                    )}

                    {/* ── Analyzer Trigger ─────────────────────────────── */}
                    {onAnalyzeClick && (
                        <button
                            onClick={onAnalyzeClick}
                            title="Deep Dive Analyzer"
                            className={`${toolBtn} ml-0.5 text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 ring-1 ring-indigo-500/30 font-bold px-2 w-auto`}
                        >
                            <Info size={13} className="mr-1" />
                            <span className="text-[10px] hidden sm:inline uppercase tracking-wider">Analyze</span>
                        </button>
                    )}
                </div>

                {/* ════════════════════ RIGHT ════════════════════ */}
                <div className="flex items-center flex-nowrap shrink-0 ml-auto gap-0.5">

                    {/* Chart type button */}
                    <button
                        ref={typeRef}
                        onClick={() => toggle('type')}
                        className={btn}
                        title="Chart Type"
                    >
                        {currentChartType === 'Candle'
                            ? <BarChart2 size={15} />
                            : currentChartType === 'Area'
                                ? <AreaChart size={15} />
                                : <TrendingUp size={15} />
                        }
                        <ChevronDown size={9} />
                    </button>

                    <div className={divV} />

                    {/* Indicators */}
                    <button
                        ref={indicatorsRef}
                        onClick={() => toggle('indicators')}
                        className={`${btn} ${activeIndicators.length > 0
                            ? (isDark ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20' : 'bg-blue-50 text-blue-600')
                            : ''
                            }`}
                        title="Indicators"
                    >
                        <Activity size={15} />
                        {!isCompact && <span className="hidden xl:inline">Indicators</span>}
                        {activeIndicators.length > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'}`}>
                                {activeIndicators.length}
                            </span>
                        )}
                    </button>

                    {/* Options Chain CTA */}
                    {onOptionChainClick && (
                        <button
                            onClick={onOptionChainClick}
                            className="flex items-center gap-1.5 font-bold rounded-lg px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-lg transition-all ml-1"
                        >
                            <LayoutDashboard size={14} />
                            {!isCompact && <span className="hidden lg:inline">Options</span>}
                        </button>
                    )}

                    <div className={divV} />

                    {/* Settings */}
                    <button
                        ref={settingsRef}
                        onClick={() => toggle('settings')}
                        title="Settings"
                        className={`${toolBtn} ${openMenu === 'settings' ? activeToolBtnClass(true) : ''}`}
                    >
                        <Settings size={15} />
                    </button>

                    {/* Reset Scale */}
                    <button onClick={onReset} className={toolBtn} title="Reset Scale (R)">
                        <RotateCcw size={15} />
                    </button>

                    {onSnapshot && (
                        <button onClick={onSnapshot} className={toolBtn} title="Download Chart Image">
                            <Camera size={15} />
                        </button>
                    )}

                </div>
            </div>

            {/* ════════════════════════════════════════════════════════
                DROPDOWN PORTALS
            ════════════════════════════════════════════════════════ */}

            {/* ── Drawing Tools Panel ──────────────────────────────────────────── */}
            {openMenu === 'drawing' && (
                <motion.div 
                    drag 
                    dragMomentum={false} 
                    className={`${panel} fixed z-[9999] top-32 left-32 flex w-[500px] max-h-[480px] cursor-move`}
                >
                    <div className="absolute top-2 right-2 z-50">
                        <button onClick={close} className="p-1 rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
                            <X size={14} />
                        </button>
                    </div>

                    {/* Left sidebar — clickable, filters right panel */}
                    <div 
                        onPointerDown={(e) => e.stopPropagation()} 
                        className={`w-36 border-r ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'} py-3 flex flex-col shrink-0`}
                    >
                        <div className={`px-4 pb-2 mb-1 text-[9px] font-bold uppercase tracking-widest border-b ${isDark ? 'text-slate-600 border-slate-800/60' : 'text-slate-400 border-slate-100'}`}>
                            Categories
                        </div>
                        {Object.values(ToolCategory).map(cat => {
                            const isActive = activeDrawingCat === cat;
                            const hasActive = DRAW_TOOLS_MAP[cat]?.some(t => t.id === activeDrawingTool);
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveDrawingCat(cat)}
                                    className={`text-left px-4 py-2.5 text-[10px] font-semibold transition-all relative flex items-center justify-between ${isActive
                                        ? (isDark ? 'text-indigo-400 bg-indigo-500/10 border-r-2 border-indigo-500' : 'text-indigo-600 bg-indigo-50 border-r-2 border-indigo-500')
                                        : (isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')
                                        }`}
                                >
                                    <span className="truncate">{cat}</span>
                                    {hasActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 ml-1" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right panel — filtered by selected category */}
                    <div 
                        onPointerDown={(e) => e.stopPropagation()} 
                        className="flex-1 overflow-y-auto p-3 custom-scrollbar"
                    >
                        <div className={`text-[9px] font-bold uppercase tracking-widest mb-2 px-1 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>
                            {activeDrawingCat}
                        </div>
                        <div className="space-y-0.5">
                            {(DRAW_TOOLS_MAP[activeDrawingCat] ?? []).map(tool => {
                                const isActive = activeDrawingTool === tool.id;
                                return (
                                    <button
                                        key={tool.id}
                                        onClick={() => {
                                            onDrawingToolChange?.(isActive ? 'none' : tool.id);
                                            close();
                                        }}
                                        className={`flex items-center gap-2.5 w-full px-3 py-2 text-[11px] font-medium rounded-lg transition-all group ${isActive
                                            ? (isDark ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30' : 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200')
                                            : (isDark ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                                            }`}
                                    >
                                        <span className={isActive ? 'text-indigo-400' : (isDark ? 'text-slate-500 group-hover:text-slate-400' : 'text-slate-400')}>
                                            {tool.icon}
                                        </span>
                                        <span className="flex-1 truncate">{tool.label}</span>
                                        {tool.shortcut && (
                                            <kbd className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                                {tool.shortcut}
                                            </kbd>
                                        )}
                                        {isActive && <Check size={12} className="text-indigo-400 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Drawings Library Panel ─────────────────────────────────────── */}
            <DropdownPortal triggerRef={drawingsLibRef} open={openMenu === 'drawingsLib'} align="left" onClose={close}>
                <div className={`${panel} w-64 max-h-[400px] flex flex-col animate-in fade-in slide-in-from-top-2 duration-150`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Active Drawings
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                            {drawings.length}
                        </span>
                    </div>
                    {/* List */}
                    <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                        {drawings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2">
                                <AlertCircle size={20} className="text-slate-600" />
                                <span className="text-[11px] text-slate-600">No drawings on chart</span>
                            </div>
                        ) : (
                            drawings.map(d => {
                                const isSelected = selectedId === d.id;
                                const isEditing = editingDrawingId === d.id;
                                return (
                                    <div key={d.id} className="relative">
                                        <div
                                            onClick={() => { onSelectDrawing?.(d.id); }}
                                            className={`flex items-center gap-2 px-2 py-2 rounded-lg group cursor-pointer transition-all ${isSelected
                                                ? (isDark ? 'bg-blue-500/10 ring-1 ring-blue-500/20' : 'bg-blue-50 ring-1 ring-blue-200')
                                                : (isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50')
                                                }`}
                                        >
                                            {/* Color swatch */}
                                            <button
                                                onClick={e => { e.stopPropagation(); setEditingDrawingId(isEditing ? null : d.id); }}
                                                className="w-3 h-3 rounded-full shrink-0 ring-1 ring-white/20 hover:scale-125 transition-transform"
                                                style={{ background: d.style.color }}
                                                title="Edit style"
                                            />
                                            {/* Label */}
                                            <span className={`flex-1 text-[11px] font-medium truncate ${!d.visible
                                                ? 'line-through text-slate-600'
                                                : isSelected
                                                    ? (isDark ? 'text-blue-300' : 'text-blue-700')
                                                    : (isDark ? 'text-slate-300' : 'text-slate-700')
                                                }`}>
                                                {d.label || d.type}
                                            </span>
                                            {/* Actions */}
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={e => { e.stopPropagation(); onToggleDrawing?.(d.id); }}
                                                    title={d.visible ? 'Hide' : 'Show'}
                                                    className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
                                                >
                                                    {d.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                                                </button>
                                                <button
                                                    onClick={e => { e.stopPropagation(); onDeleteDrawing?.(d.id); }}
                                                    title="Delete"
                                                    className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Inline style editor */}
                                        {isEditing && (
                                            <DrawingStyleEditor
                                                drawing={d}
                                                onUpdate={style => onUpdateDrawingStyle?.(d.id, style)}
                                                onClose={() => setEditingDrawingId(null)}
                                                isDark={isDark}
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {/* Footer actions */}
                    {drawings.length > 0 && (
                        <div className={`px-3 py-2 border-t flex gap-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <button
                                onClick={() => drawings.forEach(d => !d.visible && onToggleDrawing?.(d.id))}
                                className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Show All
                            </button>
                            <button
                                onClick={() => drawings.forEach(d => onDeleteDrawing?.(d.id))}
                                className="flex-1 text-[10px] font-bold py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    )}
                </div>
            </DropdownPortal>

            {/* ── Interval Dropdown ──────────────────────────────────────────── */}
            <DropdownPortal triggerRef={intervalRef} open={openMenu === 'interval'} align="left" onClose={close}>
                <div className={`${panel} w-40 py-1 animate-in fade-in slide-in-from-top-2 duration-150`}>
                    <div className={`px-3 pt-2 pb-1.5 text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        Timeframe
                    </div>
                    {TIMEFRAMES.map(tf => (
                        <button
                            key={tf}
                            onClick={() => { onIntervalChange(tf); close(); }}
                            className={`flex items-center justify-between w-full px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${interval === tf
                                ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600')
                                : (isDark ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white' : 'text-slate-600 hover:bg-slate-50')
                                }`}
                        >
                            {tf}
                            {interval === tf && <Check size={13} />}
                        </button>
                    ))}
                </div>
            </DropdownPortal>

            {/* ── Chart Type Dropdown ────────────────────────────────────────── */}
            <DropdownPortal triggerRef={typeRef} open={openMenu === 'type'} align="left" onClose={close}>
                <div className={`${panel} w-48 py-1 animate-in fade-in slide-in-from-top-2 duration-150`}>
                    <div className={`px-3 pt-2 pb-1.5 text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        Chart Style
                    </div>
                    {CHART_TYPES.map(ct => (
                        <button
                            key={ct.id}
                            onClick={() => { onChartTypeChange(ct.id); close(); }}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors ${currentChartType === ct.id
                                ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600')
                                : (isDark ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white' : 'text-slate-600 hover:bg-slate-50')
                                }`}
                        >
                            <span className="w-5 flex items-center justify-center">
                                {currentChartType === ct.id ? <Check size={14} /> : ct.icon}
                            </span>
                            {ct.label}
                        </button>
                    ))}
                </div>
            </DropdownPortal>

            {/* ── Indicators Dropdown ────────────────────────────────────────── */}
            <DropdownPortal triggerRef={indicatorsRef} open={openMenu === 'indicators'} align="right" onClose={close}>
                <div className={`${panel} w-72 animate-in fade-in slide-in-from-top-2 duration-150`}>
                    {/* Search bar */}
                    <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <Search size={13} className="text-slate-500 shrink-0" />
                        <input
                            type="text"
                            value={indicatorSearch}
                            onChange={e => setIndicatorSearch(e.target.value)}
                            placeholder="Search indicators…"
                            autoFocus
                            className={`flex-1 text-[11px] outline-none bg-transparent font-medium placeholder-slate-600 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
                        />
                        {indicatorSearch && (
                            <button onClick={() => setIndicatorSearch('')} className="text-slate-600 hover:text-slate-300">
                                <X size={11} />
                            </button>
                        )}
                    </div>
                    {/* Groups */}
                    <div className="p-2 overflow-y-auto max-h-[340px] custom-scrollbar">
                        {filteredGroups.length === 0 && (
                            <div className="text-center py-6 text-[11px] text-slate-600">No indicators found</div>
                        )}
                        {filteredGroups.map(group => (
                            <div key={group.label} className="mb-3">
                                <div className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest ${group.color}`}>
                                    {group.label}
                                </div>
                                {group.items.map(ind => (
                                    <button
                                        key={ind.id}
                                        onClick={() => onToggleIndicator(ind.id)}
                                        className={`flex items-center justify-between w-full px-3 py-2 text-xs font-semibold rounded-xl transition-all ${activeIndicators.includes(ind.id)
                                            ? (isDark ? 'text-indigo-400 bg-indigo-500/10' : 'text-indigo-600 bg-indigo-50')
                                            : (isDark ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white' : 'text-slate-600 hover:bg-slate-50')
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ind.dotColor }} />
                                            {ind.label}
                                        </div>
                                        {activeIndicators.includes(ind.id) && (
                                            <Check size={13} className="text-indigo-500 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                    {/* Active count footer */}
                    {activeIndicators.length > 0 && (
                        <div className={`px-3 py-2 border-t ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-100 text-slate-400'} text-[10px] flex items-center justify-between`}>
                            <span>{activeIndicators.length} active</span>
                            <button
                                onClick={() => activeIndicators.forEach(id => onToggleIndicator(id))}
                                className="text-red-400 hover:text-red-300 font-semibold"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            </DropdownPortal>

            {/* ── Settings Panel ─────────────────────────────────────────────── */}
            <DropdownPortal triggerRef={settingsRef} open={openMenu === 'settings'} align="right" onClose={close}>
                <div className={`${panel} w-80 animate-in fade-in slide-in-from-top-2 duration-150`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Terminal Configuration
                        </span>
                        <button onClick={close} className={`${isDark ? 'text-slate-600 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors`}>
                            <X size={13} />
                        </button>
                    </div>

                    <div className="p-4 flex flex-col gap-5">

                        {/* ── Display toggles ─────────────────────────── */}
                        <div>
                            <div className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                Display
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => updateSetting('showGrid', !chartSettings?.showGrid)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${chartSettings?.showGrid
                                        ? (isDark ? 'border-blue-500/40 bg-blue-500/8 text-blue-400' : 'border-blue-400 bg-blue-50 text-blue-600')
                                        : (isDark ? 'border-slate-800 text-slate-500 hover:border-slate-700' : 'border-slate-200 text-slate-400 hover:border-slate-300')
                                        }`}
                                >
                                    <Grid3x3 size={17} />
                                    <span className="text-[10px] font-bold">Grid Lines</span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${chartSettings?.showGrid ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') : (isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400')}`}>
                                        {chartSettings?.showGrid ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                                <button
                                    onClick={() => updateSetting('logScale', !chartSettings?.logScale)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${chartSettings?.logScale
                                        ? (isDark ? 'border-blue-500/40 bg-blue-500/8 text-blue-400' : 'border-blue-400 bg-blue-50 text-blue-600')
                                        : (isDark ? 'border-slate-800 text-slate-500 hover:border-slate-700' : 'border-slate-200 text-slate-400 hover:border-slate-300')
                                        }`}
                                >
                                    <TrendingUp size={17} />
                                    <span className="text-[10px] font-bold">Log Scale</span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${chartSettings?.logScale ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600') : (isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400')}`}>
                                        {chartSettings?.logScale ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* ── Crosshair Mode ──────────────────────────── */}
                        <div>
                            <div className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                Crosshair Mode
                            </div>
                            <div className={`flex rounded-xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                {(['normal', 'magnet'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => updateSetting('crosshairMode', mode)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold capitalize transition-all ${chartSettings?.crosshairMode === mode
                                            ? (isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600')
                                            : (isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50' : 'text-slate-500 hover:bg-slate-50')
                                            }`}
                                    >
                                        {mode === 'normal' ? <Crosshair size={12} /> : <MagnetIcon size={12} />}
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Price Scale Side ─────────────────────────── */}
                        <div>
                            <div className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                Price Scale Position
                            </div>
                            <div className={`flex rounded-xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                {(['left', 'right'] as const).map(side => (
                                    <button
                                        key={side}
                                        onClick={() => updateSetting('priceScaleSide', side)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold capitalize transition-all ${chartSettings?.priceScaleSide === side
                                            ? (isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600')
                                            : (isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50' : 'text-slate-500 hover:bg-slate-50')
                                            }`}
                                    >
                                        {side === 'left' ? <AlignLeft size={12} /> : <AlignRight size={12} />}
                                        {side}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Magnet Snap ──────────────────────────────── */}
                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <div className={`flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                <MagnetIcon size={12} />
                                Magnet Snap Mode
                            </div>
                            <div className="flex gap-2">
                                {[MagnetMode.NONE, MagnetMode.STRONG].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => onMagnetModeChange?.(m)}
                                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all ${magnetMode === m
                                            ? (isDark ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-amber-400 bg-amber-50 text-amber-600')
                                            : (isDark ? 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700' : 'border-slate-200 text-slate-400 hover:border-slate-300')
                                            }`}
                                    >
                                        {m === MagnetMode.NONE ? 'OFF' : 'STRONG'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Jump to Date ─────────────────────────────── */}
                        {onJumpToDate && (
                            <button
                                onClick={() => { close(); setShowJumpToDate(true); }}
                                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${isDark ? 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white hover:bg-slate-800/50' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                <CalendarDays size={13} />
                                Jump to Specific Date…
                                <ChevronRight size={12} className="ml-auto opacity-40" />
                            </button>
                        )}
                    </div>
                </div>
            </DropdownPortal>

            {/* ── Jump to Date Modal ────────────────────────────────────────── */}
            {showJumpToDate && onJumpToDate && (
                <JumpToDateModal
                    onClose={() => setShowJumpToDate(false)}
                    onJump={onJumpToDate}
                    isDark={isDark}
                />
            )}
        </>
    );
};

export default ChartToolbar;