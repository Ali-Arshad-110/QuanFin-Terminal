import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import { 
    Loader2, 
    GitCompare, 
    ChevronRight, 
    ArrowUpDown, 
    RotateCcw, 
    Activity,
    Zap,
    PieChart as PieIcon
} from 'lucide-react';
import { useMarketStore } from '../store';
import { useTheme } from '../theme/ThemeProvider';
import StockInfoModal from './StockInfoModal';
import CompareModal from './CompareModal';

// --- Types ---
interface MarketNode {
    id: string;
    type: 'root' | 'sector' | 'index' | 'stock';
    name?: string;
    val?: number;
    marketCap?: number;
    changePercent?: number;
    ltp?: number;
    sector?: string;
    color?: string;
    children?: MarketNode[];
    originalId?: string;
}

interface MarketSunburstProps {
    onNavigate?: (view: string) => void;
}

const MarketSunburst: React.FC<MarketSunburstProps> = ({ onNavigate }) => {
    const { themeMode, currentTheme } = useTheme();
    const { setTicker } = useMarketStore();
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [graphData, setGraphData] = useState<MarketNode | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [plotRevision, setPlotRevision] = useState(0);
    const [currentLevel, setCurrentLevel] = useState<string>('');
    const [sortMode, setSortMode] = useState<'value' | 'performance'>('value');
    const [isSortOpen, setIsSortOpen] = useState(false);
    
    // Comparison & Selection
    const [compareStocks, setCompareStocks] = useState<string[]>([]);
    const [showCompare, setShowCompare] = useState(false);
    const [selectedStock, setSelectedStock] = useState<string | null>(null);
    
    // Breadcrumbs
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; label: string }[]>([
        { id: '', label: 'Market' }
    ]);

    const COLORS = {
        bullish: currentTheme.colors.chart.candleUp,
        bearish: currentTheme.colors.chart.candleDown,
        neutral: '#71717a',
        background: currentTheme.colors.background,
        surface: currentTheme.colors.surface,
        border: currentTheme.colors.border.primary,
        text: currentTheme.colors.text.primary,
        textMuted: currentTheme.colors.text.muted
    };

    // --- Heatmap Logic ---
    const getHeatmapColor = (changePercent: number | undefined): string => {
        if (changePercent === undefined || changePercent === null) return themeMode === 'dark' ? '#334155' : '#e2e8f0';
        const clamped = Math.max(-5, Math.min(5, changePercent));
        const t = (clamped + 5) / 10; 

        // Deep rich colors
        const r = Math.round(t < 0.5 ? 127 + (1 - t * 2) * 128 : 16 + (1 - (t - 0.5) * 2) * 20);
        const g = Math.round(t < 0.5 ? 29 + t * 2 * 60 : 185 + (t - 0.5) * 2 * 40);
        const b = Math.round(t < 0.5 ? 29 + t * 2 * 30 : 129 + (t - 0.5) * 2 * 20);

        return `rgb(${r},${g},${b})`;
    };

    // --- Data Fetching ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/v1/network-map');
            const root = res.data.graph;
            setGraphData(root);
            
            // Auto-fetch major indices constituents
            const indices: MarketNode[] = [];
            const findIndices = (n: MarketNode) => {
                if (n.type === 'index') indices.push(n);
                if (n.children) n.children.forEach(findIndices);
            };
            findIndices(root);

            // Fetch the first 5 major indices to populate the map
            for (const indexNode of indices.slice(0, 8)) {
                await fetchAndMergeConstituents(indexNode);
            }
        } catch (err) {
            console.error("Market Sunburst: Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAndMergeConstituents = async (node: MarketNode) => {
        try {
            const sym = node.id === 'INDIA_MARKET' ? '^NSEI' : node.id;
            const res = await axios.get(`http://127.0.0.1:8000/api/v1/network-map/constituents/${encodeURIComponent(sym)}`);
            
            if (res.data && res.data.constituents) {
                const stocks = res.data.constituents;
                setGraphData(prevRoot => {
                    if (!prevRoot) return null;
                    const newRoot = JSON.parse(JSON.stringify(prevRoot));
                    const updateNode = (n: MarketNode) => {
                        if (n.id === node.id) {
                            n.children = stocks.map((s: any) => ({
                                id: `${s.symbol}_${node.id}`,
                                type: 'stock',
                                name: s.symbol,
                                marketCap: s.marketCap,
                                changePercent: s.changePercent,
                                val: 10,
                                ltp: s.ltp,
                                sector: s.sector,
                                originalId: s.symbol
                            }));
                        } else if (n.children) {
                            n.children.forEach(updateNode);
                        }
                    };
                    updateNode(newRoot);
                    return newRoot;
                });
            }
        } catch (e) {
            console.error(`Sunburst: Fetch failed for ${node.id}`, e);
        }
    };

    // --- Chart Transformation ---
    const updateChart = () => {
        if (!graphData) return;

        const processNode = (node: MarketNode, parentId = ""): any => {
            let ids: string[] = [node.id];
            let labels: string[] = [node.name || node.id];
            let parents: string[] = [parentId];
            let rawValue = node.val || (node.marketCap ? Math.sqrt(node.marketCap) : 10);
            let values: number[] = [Math.max(0.1, Math.abs(rawValue))]; // Ensure strictly positive
            let colors: string[] = [];
            let customdata: any[] = [];

            // Label Formatting: Not needed anymore but kept for structure
            // if (node.type === 'stock') label = node.id;
            
            // Color & Hover Info
            let color = COLORS.neutral;
            let hoverDetail = "";
            let changeLabel = "";

            if (node.type === 'stock') {
                color = getHeatmapColor(node.changePercent);
                const chg = node.changePercent ? node.changePercent.toFixed(2) + "%" : "0.00%";
                changeLabel = `<span style='color:${(node.changePercent || 0) >= 0 ? "#10b981" : "#ef4444"}'>${chg}</span>`;
                hoverDetail = `Price: ₹${node.ltp?.toFixed(2) || 'N/A'}<br>Change: ${chg}<br>Sector: ${node.sector || 'N/A'}`;
            } else if (node.type === 'sector') {
                color = themeMode === 'dark' ? '#1e293b' : '#f1f5f9';
                hoverDetail = `Sector View<br>Items: ${node.children?.length || 0}`;
            } else if (node.type === 'index') {
                color = themeMode === 'dark' ? '#0f172a' : '#e2e8f0';
                hoverDetail = `Index: ${node.name}<br>Explore Constituents`;
            } else if (node.type === 'root') {
                color = 'transparent';
                hoverDetail = "Market Overview";
            }

            colors.push(color);
            customdata.push({ ...node, changeLabel, hoverDetail });

            if (node.children && node.children.length > 0) {
                // Sorting
                const sorted = [...node.children].sort((a, b) => {
                    if (sortMode === 'value') return (b.marketCap || 0) - (a.marketCap || 0);
                    return (b.changePercent || 0) - (a.changePercent || 0);
                });

                sorted.forEach(child => {
                    const res = processNode(child, node.id);
                    ids = ids.concat(res.ids);
                    labels = labels.concat(res.labels);
                    parents = parents.concat(res.parents);
                    values = values.concat(res.values);
                    colors = colors.concat(res.colors);
                    customdata = customdata.concat(res.customdata);
                });
            }

            return { ids, labels, parents, values, colors, customdata };
        };

        const result = processNode(graphData);
        setChartData([{
            type: "sunburst",
            ids: result.ids,
            labels: result.labels,
            parents: result.parents,
            values: result.values,
            sort: false,
            level: currentLevel,
            marker: { colors: result.colors, line: { width: 1, color: COLORS.background } },
            texttemplate: "%{label}<br>%{customdata.changeLabel}",
            textinfo: "label+text",
            hovertemplate: "<b>%{label}</b><br>%{customdata.hoverDetail}<extra></extra>",
            customdata: result.customdata,
            leaf: { opacity: 0.95 }
        }]);
        setPlotRevision(r => r + 1);
    };

    useEffect(() => {
        updateChart();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphData, sortMode, themeMode]);

    // --- Interaction Handlers ---
    const handleClick = async (data: any) => {
        if (!data.points || data.points.length === 0) return;
        const node = data.points[0].customdata;
        if (!node) return;

        // Zoom Level
        if (node.id) setCurrentLevel(node.id);

        if (node.type === 'stock') {
            const ticker = node.originalId || node.id.split('_')[0];
            
            // Compare logic: Ctrl/Meta + Click
            const event = data.event as MouseEvent;
            if (event.ctrlKey || event.metaKey) {
                setCompareStocks(prev => {
                    if (prev.includes(ticker)) return prev.filter(s => s !== ticker);
                    if (prev.length >= 4) return prev;
                    return [...prev, ticker];
                });
                return;
            }

            setTicker(ticker);
            if (onNavigate) {
                onNavigate('dashboard');
            } else {
                setSelectedStock(ticker);
            }
            return;
        }

        if (node.type === 'index' && (!node.children || node.children.length === 0)) {
            await fetchAndMergeConstituents(node);
        }

        updateBreadcrumbs(node);
    };

    const updateBreadcrumbs = (node: any) => {
        const idx = breadcrumbs.findIndex(b => b.id === node.id);
        if (idx !== -1) {
            setBreadcrumbs(prev => prev.slice(0, idx + 1));
        } else {
            const label = node.name || node.id;
            setBreadcrumbs(prev => [...prev, { id: node.id, label }]);
        }
    };

    const handleBreadcrumbClick = (id: string, idx: number) => {
        setCurrentLevel(id);
        setBreadcrumbs(prev => prev.slice(0, idx + 1));
        setChartData(prev => [{ ...prev[0], level: id }]);
        setPlotRevision(r => r + 1);
    };

    const handleReset = () => {
        setCurrentLevel('');
        setBreadcrumbs([{ id: '', label: 'Market' }]);
        setChartData(prev => [{ ...prev[0], level: '' }]);
        setPlotRevision(r => r + 1);
    };

    return (
        <div className="flex flex-col h-full w-full bg-background animate-in fade-in duration-500 overflow-hidden">
            {/* --- Control Bar --- */}
            <div className="relative z-20 flex items-center justify-between px-6 py-3 border-b border-border-primary/50 bg-surface/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                        <PieIcon size={16} className="text-indigo-500" />
                        <span className="text-xs font-black uppercase tracking-widest text-text-primary">Market Sunburst Dashboard</span>
                    </div>

                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 bg-background/50 px-3 py-1.5 rounded-xl border border-border-primary/30">
                        {breadcrumbs.map((crumb, i) => (
                            <React.Fragment key={crumb.id}>
                                {i > 0 && <ChevronRight size={12} className="text-text-muted" />}
                                <button 
                                    onClick={() => handleBreadcrumbClick(crumb.id, i)}
                                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${i === breadcrumbs.length - 1 ? 'text-indigo-400' : 'text-text-muted hover:text-text-primary'}`}
                                >
                                    {crumb.label === 'INDIA_MARKET' ? 'Market' : crumb.label}
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-emerald-500/5 px-3 py-1.5 border border-emerald-500/20 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Flow</span>
                    </div>

                    <div className="h-6 w-px bg-border-primary" />

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${isSortOpen ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-surface border-border-primary text-text-muted hover:text-text-primary'}`}
                        >
                            <ArrowUpDown size={14} />
                            Sort: {sortMode === 'value' ? 'Size' : 'Perf'}
                        </button>
                        {isSortOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-surface/95 backdrop-blur-2xl border border-border-primary rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button 
                                    onClick={() => { setSortMode('value'); setIsSortOpen(false); }}
                                    className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/10 transition-colors ${sortMode === 'value' ? 'text-indigo-400' : 'text-text-muted'}`}
                                >
                                    Size (Mkt Cap)
                                </button>
                                <button 
                                    onClick={() => { setSortMode('performance'); setIsSortOpen(false); }}
                                    className={`w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/10 transition-colors ${sortMode === 'performance' ? 'text-indigo-400' : 'text-text-muted'}`}
                                >
                                    Performance (%)
                                </button>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border-primary rounded-lg text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-primary transition-all"
                    >
                        <RotateCcw size={14} /> Reset
                    </button>
                </div>
            </div>

            {/* --- Main Chart Area --- */}
            <div className="flex-1 relative bg-background flex flex-col items-center justify-center">
                {loading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
                        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-text-muted animate-pulse">Syncing Market Hierarchy...</span>
                    </div>
                )}

                <div className="w-full h-full p-4 lg:p-8">
                    {chartData.length > 0 ? (
                        <Plot
                            data={chartData}
                            layout={{
                                margin: { l: 0, r: 0, b: 0, t: 0 },
                                paper_bgcolor: 'transparent',
                                plot_bgcolor: 'transparent',
                                autosize: true,
                                font: { family: 'JetBrains Mono, Inter, sans-serif', color: COLORS.textMuted },
                                sunburstcolorway: ["#636efa", "#ef553b", "#00cc96", "#ab63fa", "#19d3f3"],
                                extendsunburstcolors: true
                            }}
                            style={{ width: "100%", height: "100%" }}
                            useResizeHandler={true}
                            onClick={handleClick}
                            revision={plotRevision}
                            config={{ displayModeBar: false, responsive: true }}
                        />
                    ) : !loading && (
                        <div className="flex flex-col items-center justify-center gap-6 opacity-30">
                            <Activity size={80} strokeWidth={1} />
                            <p className="text-xl font-black uppercase tracking-widest">No Flow Data Available</p>
                        </div>
                    )}
                </div>

                {/* Legend / Info Panels */}
                <div className="absolute bottom-6 left-6 flex flex-col gap-3 pointer-events-none">
                    <div className="bg-surface/80 backdrop-blur-md p-3 rounded-2xl border border-border-primary/30 shadow-2xl flex items-center gap-4">
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Bullish Intensity</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-rose-500" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Bearish Intensity</span>
                        </div>
                    </div>
                    
                    <div className="bg-indigo-600 p-3 rounded-2xl shadow-2xl shadow-indigo-600/20 border border-white/10 flex items-center gap-3">
                        <Zap size={14} className="text-white" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Ctrl + Click to Compare Multiple Stocks</span>
                    </div>
                </div>

                {/* Compare Floating Button */}
                {compareStocks.length > 0 && (
                    <div className="absolute bottom-6 right-6 z-50 flex gap-2 animate-in slide-in-from-bottom-6">
                        <button 
                            onClick={() => setShowCompare(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl shadow-2xl shadow-indigo-600/40 flex items-center gap-3 text-sm font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                        >
                            <GitCompare size={18} /> Compare ({compareStocks.length})
                        </button>
                        <button 
                            onClick={() => setCompareStocks([])}
                            className="bg-surface/80 hover:bg-card text-text-muted px-4 py-3 rounded-2xl border border-border-primary text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-xl"
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {selectedStock && <StockInfoModal symbol={selectedStock} onClose={() => setSelectedStock(null)} />}
            {showCompare && compareStocks.length > 0 && (
                <CompareModal 
                    stocks={compareStocks} 
                    onRemove={(s) => setCompareStocks(prev => prev.filter(x => x !== s))} 
                    onUpdateStock={(oldT, newT) => setCompareStocks(prev => prev.map(s => s === oldT ? newT : s))}
                    onClose={() => setShowCompare(false)} 
                />
            )}
        </div>
    );
};

export default MarketSunburst;
