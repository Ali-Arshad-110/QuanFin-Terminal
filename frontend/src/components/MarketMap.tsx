import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import { Loader2, Home, GitCompare, ChevronRight, ChevronDown, Palette, Workflow, RotateCcw, ArrowUpDown } from 'lucide-react';
import StockInfoModal from './StockInfoModal';
import CompareModal from './CompareModal';
import { useMarketStore } from '../store';
import { useTheme } from '../theme/ThemeProvider';

// ─── Component ───

interface MarketMapProps {
    onNavigate?: (view: any) => void;
}

// ─── New Type Definition for Tree Structure ───
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
    originalId?: string; // Add this to type
}

const MarketMap: React.FC<MarketMapProps> = ({ onNavigate }) => {
    // ─── State ───
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [graphData, setGraphData] = useState<MarketNode | null>(null); // Full Tree
    const [chartData, setChartData] = useState<any[]>([]); // Plotly Data
    const [loading, setLoading] = useState(true);
    const [selectedStock, setSelectedStock] = useState<string | null>(null);
    const { setTicker } = useMarketStore();
    const { themeMode, currentTheme } = useTheme();
    const [plotRevision, setPlotRevision] = useState(0);

    const COLORS = {
        bullish: currentTheme.colors.chart.candleUp,
        bearish: currentTheme.colors.chart.candleDown,
        neutral: '#71717a', // Zinc 500 (more neutral for both)
        text: currentTheme.colors.text.muted,
        background: currentTheme.colors.background,
        border: currentTheme.colors.border.primary
    };

    // ─── Heatmap Gradient Function ───
    const getHeatmapColor = (changePercent: number | undefined): string => {
        if (changePercent === undefined || changePercent === null) return themeMode === 'dark' ? '#334155' : '#e2e8f0';
        // Clamp to ±5%
        const clamped = Math.max(-5, Math.min(5, changePercent));
        const t = (clamped + 5) / 10; // normalize 0..1

        // Red channel
        const r = Math.round(t < 0.5
            ? 127 + (1 - t * 2) * 128
            : 30 + (1 - (t - 0.5) * 2) * 97
        );
        // Green channel
        const g = Math.round(t < 0.5
            ? 29 + t * 2 * 60
            : 89 + (t - 0.5) * 2 * 90
        );
        // Blue channel
        const b = Math.round(t < 0.5
            ? 29 + t * 2 * 30
            : 59 + (t - 0.5) * 2 * 0
        );

        return `rgb(${r},${g},${b})`;
    };

    const getFlatColor = (changePercent: number | undefined): string => {
        if (changePercent === undefined || changePercent === null) return COLORS.text;
        return changePercent >= 0 ? COLORS.bullish : COLORS.bearish;
    };

    // Feature toggles
    const [heatmapMode, setHeatmapMode] = useState(true);
    const [sortMode, setSortMode] = useState<'value' | 'performance'>('value'); // New Sort Mode

    // Zoom State
    const [currentLevel, setCurrentLevel] = useState<string>(''); // Persist zoom level

    // Comparison & Nav
    const [compareStocks, setCompareStocks] = useState<string[]>([]);
    const [showCompare, setShowCompare] = useState(false);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; label: string }[]>([
        { id: '', label: '🏠 Market' }
    ]);

    const getStockColor = heatmapMode ? getHeatmapColor : getFlatColor;

    // ─── Reset ───
    const handleReset = () => {
        setBreadcrumbs([{ id: '', label: '🏠 Market' }]);
        setCurrentLevel(''); // Reset Zoom
        setChartData(prev => {
            if (prev.length === 0) return prev;
            return [{ ...prev[0], level: '' }];
        });
        setPlotRevision(r => r + 1);
    };

    // ─── Initial Fetch ───
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get('http://127.0.0.1:8000/api/v1/network-map');
                const root = res.data.graph;
                setGraphData(root); // Store Tree
                setLoading(false);

                // Auto-Expand Indices
                const indices: MarketNode[] = [];
                const findIndices = (n: MarketNode) => {
                    if (n.type === 'index') indices.push(n);
                    if (n.children) n.children.forEach(findIndices);
                };
                findIndices(root);

                for (const indexNode of indices) {
                    await fetchAndMergeConstituents(indexNode);
                }
            } catch (err) {
                console.error("Failed to fetch map data", err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ─── Transform Tree to Plotly Arrays (with Sorting) ───
    const updateChartFromTree = () => {
        if (!graphData) return;

        // 1. Sort Tree (Deep Clone + Sort)
        // We do this dynamically on every render/mode change without mutating original state if possible
        // But for performance, we can just process it recursively.
        const processNode = (node: MarketNode, parentId = ""): { ids: string[], labels: string[], parents: string[], values: number[], colors: string[], customdata: any[] } => {

            let ids: string[] = [node.id];
            let labels: string[] = [];
            let parents: string[] = [parentId];
            let values: number[] = [];
            let colors: string[] = [];
            let customdata: any[] = [];

            // Label Logic
            let label = node.name || node.id;
            if (node.type === 'stock') label = node.id;
            if (label.length > 15 && node.type !== 'root') label = label.substring(0, 12) + '..';
            labels.push(label);

            // Value Logic
            const val = node.val || (node.marketCap ? Math.sqrt(node.marketCap) : 10);
            values.push(val);

            // Color Logic
            let color = COLORS.neutral;
            let changeLabel = "";
            let hoverDetail = "";

            const formatMarketCap = (mcap: number) => {
                if (!mcap) return "N/A";
                const val = mcap / 1000000000000;
                return `₹${val.toFixed(2)} LCr`;
            };

            if (node.type === 'stock') {
                color = getStockColor(node.changePercent);
                const chg = node.changePercent ? node.changePercent.toFixed(2) + "%" : "";
                changeLabel = `<span style='color:${(node.changePercent || 0) >= 0 ? "#10b981" : "#ef4444"}'>${chg}</span>`;
                const mcapStr = formatMarketCap(node.marketCap || 0);
                hoverDetail = `Price: ₹${node.ltp || 'N/A'}<br>Change: ${chg}<br>M.Cap: ${mcapStr}<br>Sector: ${node.sector || 'N/A'}`;
            } else if (node.type === 'sector') {
                color = themeMode === 'dark' ? '#334155' : '#e2e8f0';
                hoverDetail = `Sector Node<br>Children: ${node.children ? node.children.length : 0}`;
            } else if (node.type === 'index') {
                color = themeMode === 'dark' ? '#1e293b' : '#f1f5f9';
                hoverDetail = `Index: ${node.name}<br>Click to Expand`;
            } else if (node.type === 'root') {
                color = 'transparent';
            }
            if (node.color) color = node.color;
            colors.push(color);
            customdata.push({ ...node, changeLabel, hoverDetail });

            // Process Children with Sorting
            if (node.children && node.children.length > 0) {
                // Sorting Logic
                const sortedChildren = [...node.children].sort((a, b) => {
                    const getVal = (n: MarketNode) => n.val || (n.marketCap ? Math.sqrt(n.marketCap) : 0);
                    const getPerf = (n: MarketNode) => n.changePercent || 0;

                    if (sortMode === 'value') {
                        return getVal(b) - getVal(a); // Descending Value
                    } else {
                        // Performance: Bullish (High Positive) -> Bearish (High Negative)
                        // Or Bullish -> Neutral -> Bearish
                        return getPerf(b) - getPerf(a); // Descending Change %
                    }
                });

                sortedChildren.forEach(child => {
                    const result = processNode(child, node.id);
                    ids = ids.concat(result.ids);
                    labels = labels.concat(result.labels);
                    parents = parents.concat(result.parents);
                    values = values.concat(result.values);
                    colors = colors.concat(result.colors);
                    customdata = customdata.concat(result.customdata);
                });
            }

            return { ids, labels, parents, values, colors, customdata };
        };

        const data = processNode(graphData);

        setChartData([{
            type: "sunburst",
            ids: data.ids,
            labels: data.labels,
            parents: data.parents,
            values: data.values, // Plotly uses this for size
            sort: false, // CRITICAL: Disable Plotly's auto-sort to respect our array order
            level: currentLevel, // CRITICAL: Persist Zoom Level on Update
            marker: {
                colors: data.colors,
                line: { width: 1, color: COLORS.background }
            },
            texttemplate: "%{label}<br>%{customdata.changeLabel}",
            textinfo: "label+text",
            hovertemplate:
                "<b>%{label}</b><br>" +
                "Value: %{value}<br>" +
                "%{customdata.hoverDetail}" +
                "<extra></extra>",
            outsidetextfont: { size: 12, color: COLORS.text },
            leaf: { opacity: 0.95 },
            customdata: data.customdata
        }]);
        setPlotRevision(r => r + 1);
    };

    // Re-run transformation when Data, SortMode, or ColorMode changes
    useEffect(() => {
        updateChartFromTree();
    }, [graphData, sortMode, heatmapMode]);

    // ─── Fetch & Merge Logic ───
    const fetchAndMergeConstituents = async (node: MarketNode) => {
        if (node.type !== 'index') return;
        try {
            const symbol = node.id === 'INDIA_MARKET' ? '^NSEI' : node.id;
            const res = await axios.get(`http://127.0.0.1:8000/api/v1/network-map/constituents/${encodeURIComponent(symbol)}`);

            if (res.data && res.data.constituents) {
                const stocks = res.data.constituents;
                if (stocks.length === 0) return;

                // Update Tree State
                setGraphData(prevRoot => {
                    if (!prevRoot) return null;

                    // Deep clone to avoid mutation issues
                    const newRoot = JSON.parse(JSON.stringify(prevRoot));

                    // Helper to find and update node
                    const updateNode = (n: MarketNode) => {
                        if (n.id === node.id) {
                            // Map constituents to MarketNode format
                            const childrenNodes: MarketNode[] = stocks.map((s: any) => ({
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
                            n.children = childrenNodes;
                        } else if (n.children) {
                            n.children.forEach(updateNode);
                        }
                    };
                    updateNode(newRoot);
                    return newRoot;
                });
            }
        } catch (e) {
            console.error("Fetch failed for", node.id, e);
        }
    };

    // ─── Click Handling ───
    const handleClick = async (data: any) => {
        if (!data.points || data.points.length === 0) return;
        const point = data.points[0];
        const node = point.customdata;
        if (!node) return;

        // 1. Update Zoom Level immediately (for both sectors and indices)
        // Root is empty string usually? plot ID matches node ID.
        if (node.id) {
            setCurrentLevel(node.id);
        }

        if (node.type === 'stock') {
            // Clean ticker: use originalId if exists, or strip the context suffix (e.g. _INDIA_MARKET)
            let ticker = node.originalId || node.id;
            if (!node.originalId && node.id.includes('_')) {
                const parts = node.id.split('_');
                // Usually it's TICKER_CONTEXT
                ticker = parts.slice(0, -1).join('_');
            }

            if ((data.event as any)?.ctrlKey || (data.event as any)?.metaKey) {
                setCompareStocks(prev => {
                    if (prev.includes(ticker)) return prev.filter(s => s !== ticker);
                    if (prev.length >= 3) return prev;
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

        if (node.type === 'index') {
            // Fetch logic
            await fetchAndMergeConstituents(node);
        }
        updateBreadcrumbs(node);
    };

    // ─── Breadcrumbs ───
    const updateBreadcrumbs = (node: any) => {
        const existingIdx = breadcrumbs.findIndex(b => b.id === node.id);
        if (existingIdx !== -1) {
            setBreadcrumbs(prev => prev.slice(0, existingIdx + 1));
        } else {
            const trimmed = breadcrumbs.filter(b => b.id === '' || true); // keep root
            setBreadcrumbs([...trimmed, {
                id: node.id,
                label: node.type === 'sector' ? `📂 ${node.name || node.id}` :
                    node.type === 'index' ? `📊 ${node.name || node.id}` :
                        node.name || node.id
            }]);
        }
    };

    const navigateToBreadcrumb = (crumb: { id: string; label: string }, idx: number) => {
        setBreadcrumbs(prev => prev.slice(0, idx + 1));
        setCurrentLevel(crumb.id); // Set zoom level

        setChartData(prev => {
            if (prev.length === 0) return prev;
            return [{ ...prev[0], level: crumb.id }];
        });
        setPlotRevision(r => r + 1);
    };

    const handleRemoveCompare = (symbol: string) => setCompareStocks(prev => prev.filter(s => s !== symbol));
    const handleUpdateCompareStock = (oldTicker: string, newTicker: string) => {
        setCompareStocks(prev => {
            const idx = prev.indexOf(oldTicker);
            if (idx !== -1) {
                const newStocks = [...prev];
                newStocks[idx] = newTicker;
                return newStocks;
            }
            return prev;
        });
    };

    return (
        <div className="relative w-full h-full bg-background overflow-hidden flex flex-col transition-colors duration-300">
            {/* Header / Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap items-center">

                {/* View Header (New simplified Header) */}
                <div className="bg-surface/90 backdrop-blur-md border border-border-primary px-3 py-1.5 rounded-lg flex items-center shadow-xl text-xs font-bold text-indigo-500 gap-1.5">
                    <Workflow size={14} /> <span>MARKET FLOW MAP</span>
                </div>

                {/* Heatmap Toggle */}
                <button onClick={() => setHeatmapMode(!heatmapMode)} className={`bg-surface/90 backdrop-blur-md border px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all shadow-xl ${heatmapMode ? 'border-emerald-500/40 text-emerald-500 shadow-emerald-500/10' : 'border-border-primary text-text-muted hover:text-text-primary hover:bg-surface'}`}>
                    <Palette size={14} />
                    <span className="hidden sm:inline">Heatmap</span>
                </button>

                {/* --- Sort Dropdown (NEW) --- */}
                <div className="relative">
                    <button
                        onClick={() => setIsSortOpen(!isSortOpen)}
                        className={`bg-surface/90 backdrop-blur-md border border-border-primary px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xl flex items-center gap-1.5
                            ${isSortOpen ? 'ring-2 ring-indigo-500/50 border-indigo-500/50 text-indigo-500' : 'text-text-muted hover:text-text-primary hover:bg-surface'}`}
                    >
                        <ArrowUpDown size={14} />
                        <span className="hidden sm:inline">Sort: {sortMode === 'value' ? 'Size' : 'Perf'}</span>
                        <ChevronDown size={12} className={`transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSortOpen && (
                        <div className="absolute top-full left-0 mt-2 w-40 bg-card border border-border-primary rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-1">
                                <button
                                    onClick={() => { setSortMode('value'); setIsSortOpen(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between group transition-colors ${sortMode === 'value' ? 'bg-indigo-500/20 text-indigo-500' : 'text-text-muted hover:bg-surface hover:text-text-primary'}`}
                                >
                                    <span>Size (Market Cap)</span>
                                    {sortMode === 'value' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                                </button>
                                <button
                                    onClick={() => { setSortMode('performance'); setIsSortOpen(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center justify-between group transition-colors ${sortMode === 'performance' ? 'bg-amber-500/20 text-amber-500' : 'text-text-muted hover:bg-surface hover:text-text-primary'}`}
                                >
                                    <span>Performance</span>
                                    {sortMode === 'performance' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reset Button */}
                <button onClick={handleReset} className="bg-surface/90 backdrop-blur-md border border-border-primary px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface transition-all shadow-xl flex items-center gap-1.5">
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline">Reset</span>
                </button>
            </div>

            {/* Breadcrumb Navigation */}
            {breadcrumbs.length > 1 && (
                <div className="absolute top-[3.75rem] left-4 z-10 animate-in slide-in-from-top-2 duration-300">
                    <div className="bg-surface/90 backdrop-blur border border-border-primary rounded-lg px-3 py-1.5 flex items-center gap-1 text-xs shadow-lg">
                        {breadcrumbs.map((crumb, idx) => (
                            <React.Fragment key={crumb.id + idx}>
                                {idx > 0 && <ChevronRight size={12} className="text-text-muted shrink-0" />}
                                <button onClick={() => navigateToBreadcrumb(crumb, idx)} className={`px-1.5 py-0.5 rounded transition-colors whitespace-nowrap ${idx === breadcrumbs.length - 1 ? 'text-indigo-500 font-semibold' : 'text-text-muted hover:text-text-primary hover:bg-surface'}`}>
                                    {crumb.label}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            {/* Compare Floating Button */}
            {compareStocks.length > 0 && (
                <div className="absolute bottom-6 right-6 z-10 flex gap-2">
                    <button onClick={() => setShowCompare(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-xl shadow-indigo-500/30 flex items-center gap-2 text-sm font-semibold transition-all animate-in slide-in-from-bottom-4 hover:scale-105 active:scale-95">
                        <GitCompare size={16} /> Compare <span className="bg-white/20 px-1.5 rounded text-xs">{compareStocks.length}</span>
                    </button>
                    <button onClick={() => setCompareStocks([])} className="bg-surface/90 hover:bg-background text-text-muted px-3 py-2.5 rounded-xl border border-border-primary text-xs font-medium transition-all backdrop-blur-sm">Clear</button>

                </div>
            )}

            {/* Ctrl+Click hint */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                <div className="text-[11px] text-text-muted bg-surface/80 backdrop-blur px-3 py-1.5 rounded-full border border-border-primary/50 shadow-lg flex items-center gap-2">
                    <span className="bg-background px-1 rounded border border-border-primary text-text-muted">Ctrl</span> + Click to compare stocks
                </div>
            </div>

            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted z-50 bg-background">
                    <div className="relative">
                        <Loader2 className="animate-spin text-indigo-500" size={48} />
                    </div>
                    <p className="mt-4 text-sm font-medium animate-pulse">Loading Market Map...</p>
                </div>
            )}

            <div className="flex-1 w-full h-full">
                {chartData.length > 0 ? (
                    <Plot
                        data={chartData}
                        layout={{
                            margin: { l: 0, r: 0, b: 0, t: 0 },
                            paper_bgcolor: COLORS.background,
                            plot_bgcolor: COLORS.background,
                            autosize: true,
                            sunburstcolorway: ["#636efa", "#ef553b", "#00cc96"],
                            extendsunburstcolors: true,
                            font: { family: 'Inter, sans-serif', color: COLORS.text }
                        }}
                        style={{ width: "100%", height: "100%" }}
                        useResizeHandler={true}
                        onClick={handleClick}
                        revision={plotRevision}
                    />
                ) : !loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <Home size={48} className="text-slate-700 mb-4 opacity-50" />
                        <p>No market data available</p>
                    </div>
                ) : null}
            </div>

            {selectedStock && <StockInfoModal symbol={selectedStock} onClose={() => setSelectedStock(null)} />}
            {showCompare && compareStocks.length > 0 && <CompareModal stocks={compareStocks} onRemove={handleRemoveCompare} onUpdateStock={handleUpdateCompareStock} onClose={() => setShowCompare(false)} />}
        </div>
    );
};

export default MarketMap;
