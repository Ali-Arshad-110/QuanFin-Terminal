import React, { useMemo, useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Info, PieChart, BarChart2, Activity, Zap, Users, Shield } from 'lucide-react';
import type { WatchlistItem } from '../../../store';
import Plot from 'react-plotly.js';
import StockLogo from '../../StockLogo';
import { useTheme } from '../../../theme/ThemeProvider';
import { extractErrorMessage } from '../../../utils/errorUtils';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { useMarketStore } from '../../../store';

interface ExpandedViewProps {
    isOpen: boolean;
    onClose: () => void;
    watchlist: WatchlistItem[];
    activeTicker: string;
    onSelectTicker: (symbol: string) => void;
}

const WatchlistExpandedView: React.FC<ExpandedViewProps> = ({
    isOpen,
    onClose,
    watchlist,
    activeTicker,
    onSelectTicker
}) => {
    const { themeMode, currentTheme } = useTheme();
    const [selectedSymbol, setSelectedSymbol] = useState<string>(activeTicker);
    const { subscribe, unsubscribe, lastMessage, isConnected } = useWebSocket();
    const updateWatchlistPrice = useMarketStore(s => s.updateWatchlistPrice);
    const activeWatchlistName = useMarketStore(s => s.activeWatchlist);

    // Sync state with prop
    useEffect(() => {
        if (activeTicker) setSelectedSymbol(activeTicker);
    }, [activeTicker]);

    // --- State for Dynamic Data ---
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [holdersLoading, setHoldersLoading] = useState(false);
    const [volumeLoading, setVolumeLoading] = useState(false);
    const [returnsLoading, setReturnsLoading] = useState(false);

    const [stockDetails, setStockDetails] = useState<any>(null);
    const [holdersData, setHoldersData] = useState<any>(null);
    const [volumeHistory, setVolumeHistory] = useState<any[]>([]);
    const [returnsData, setReturnsData] = useState<any>(null);
    const [peersData, setPeersData] = useState<any>(null);
    const [peersLoading, setPeersLoading] = useState(false);
    const [intradayData, setIntradayData] = useState<any[]>([]);
    const [intradayLoading, setIntradayLoading] = useState(false);
    const [sharesOutstanding, setSharesOutstanding] = useState<number>(0);

    const handleSelect = (symbol: string) => {
        setSelectedSymbol(symbol);
        onSelectTicker(symbol);
    };

    const selectedData = useMemo(() =>
        watchlist.find(w => w.symbol === selectedSymbol),
        [watchlist, selectedSymbol]);

    // Real-time: subscribe to all watchlist symbols while expanded
    useEffect(() => {
        if (!isOpen) return;
        const symbols = Array.from(new Set((watchlist || []).map(w => w.symbol).filter(Boolean)));
        if (symbols.length > 0) subscribe(symbols);
        return () => {
            if (symbols.length > 0) unsubscribe(symbols);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeWatchlistName]);

    // Real-time: apply last tick into store (updates every watchlist component)
    useEffect(() => {
        if (!isOpen || !lastMessage?.symbol) return;
        const sym = String(lastMessage.symbol);
        const ltp = Number(lastMessage.ltp ?? lastMessage.price ?? 0);
        if (!sym || !ltp) return;

        // Best-effort change calculation if backend doesn't provide it
        const prev = watchlist.find(w => w.symbol === sym)?.price ?? ltp;
        const chg = Number(lastMessage.change ?? (ltp - prev));
        const pct = Number(lastMessage.changePercent ?? (prev ? (chg / prev) * 100 : 0));
        const vol = Number(lastMessage.volume ?? lastMessage.v ?? lastMessage.vqi ?? 0) || undefined;

        updateWatchlistPrice(sym, ltp, chg, pct, vol);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage, isOpen]);

    // Fetch Dynamic Data
    useEffect(() => {
        if (!selectedSymbol || !isOpen) return;

        const fetchData = async () => {
            // Only show loading indicators on initial fetch for a search/select
            const isInitial = !stockDetails || stockDetails.symbol !== selectedSymbol;
            if (isInitial) {
                setDetailsLoading(true);
                setHoldersLoading(true);
                setVolumeLoading(true);
                setReturnsLoading(true);
                setPeersLoading(true);
                setIntradayLoading(true);
            }

            try {
                // Fetch everything in parallel
                const [dRes, hRes, vRes, rRes, relRes, iRes] = await Promise.all([
                    fetch(`http://localhost:8000/api/v1/stock/${selectedSymbol}/details`).catch(() => null),
                    fetch(`http://localhost:8000/api/v1/stock/${selectedSymbol}/analysis?category=holders`).catch(() => null),
                    fetch(`http://localhost:8000/api/v1/volume/${selectedSymbol}`).catch(() => null),
                    fetch(`http://localhost:8000/api/v1/stock/${selectedSymbol}/analysis?category=returns`).catch(() => null),
                    fetch(`http://localhost:8000/api/v1/stock/${selectedSymbol}/analysis?category=relative`).catch(() => null),
                    fetch(`http://localhost:8000/api/v1/analyze/${selectedSymbol}?interval=5m`).catch(() => null)
                ]);

                const dJson = dRes && dRes.ok ? await dRes.json().catch(() => null) : null;
                const hJson = hRes && hRes.ok ? await hRes.json().catch(() => null) : null;
                const vJson = vRes && vRes.ok ? await vRes.json().catch(() => null) : null;
                const rJson = rRes && rRes.ok ? await rRes.json().catch(() => null) : null;
                const relJson = relRes && relRes.ok ? await relRes.json().catch(() => null) : null;
                const iJson = iRes && iRes.ok ? await iRes.json().catch(() => null) : null;

                if (dJson) {
                    setStockDetails(dJson);
                    // Calculate shares outstanding for real-time mcap
                    const mcap = dJson.valuation?.marketCap || 0;
                    const price = dJson.price?.current || 1;
                    if (mcap > 0) setSharesOutstanding(mcap / price);
                }
                if (hJson?.status === 'success') setHoldersData(hJson.data);
                if (Array.isArray(vJson?.history)) {
                    const hist = [...vJson.history].slice(0, 10).reverse();
                    setVolumeHistory(hist);
                }
                if (rJson?.status === 'success') setReturnsData(rJson.data);
                if (relJson?.status === 'success') setPeersData(relJson.data);
                if (iJson?.data) setIntradayData(iJson.data);
            } catch (err) {
                console.error("Failed to fetch expanded analytics:", extractErrorMessage(err));
            } finally {
                setDetailsLoading(false);
                setHoldersLoading(false);
                setVolumeLoading(false);
                setReturnsLoading(false);
                setPeersLoading(false);
                setIntradayLoading(false);
            }
        };

        fetchData();
        // Remove setInterval to keep the view stable once loaded
        // Real-time price updates still happen via WebSocket
    }, [selectedSymbol, isOpen]);

    // Process Shareholding Data for Chart
    const shareholdingChartData = useMemo(() => {
        const labels = ['Promoters', 'Institutions', 'Public'];
        const colors = ['#636efa', '#00cc96', '#ab63fa'];
        
        if (!holdersData) return { labels, values: [0, 0, 0], colors };

        return {
            labels,
            values: [
                Number(holdersData?.insiders || 0),
                Number(holdersData?.institutions || 0),
                Number(holdersData?.public || 0)
            ],
            colors
        };
    }, [holdersData]);
    
    // Process Sunburst Data
    const sunburstData = useMemo(() => {
        const safeWatchlist = watchlist || [];
        const ids = ['watchlist-root'];
        const labels = ['Watchlist'];
        const parents = [''];
        const values = [safeWatchlist.length || 1];
        const colors = ['#636efa'];

        const sectors = [...new Set(safeWatchlist.map(w => w?.sector || 'Other'))];
        
        const sectorCounts: Record<string, number> = {};
        safeWatchlist.forEach(w => {
            const s = w?.sector || 'Other';
            sectorCounts[s] = (sectorCounts[s] || 0) + 1;
        });

        sectors.forEach(s => {
            ids.push(`sector-${s}`);
            labels.push(s);
            parents.push('watchlist-root');
            values.push(sectorCounts[s] || 0);
            colors.push('#94a3b8');
        });

        safeWatchlist.forEach(w => {
            const symbol = w?.symbol || 'UNKNOWN';
            const sector = w?.sector || 'Other';
            ids.push(`stock-${symbol}-${Math.random().toString(36).substr(2, 4)}`); // Unique ID to prevent Plotly crash
            labels.push(symbol);
            parents.push(`sector-${sector}`);
            values.push(1);
            const cp = w?.changePercent || 0;
            colors.push(cp >= 2 ? '#02c076' : cp > 0 ? '#10B98180' : cp > -2 ? '#f8496080' : '#f84960');
        });

        return { ids, labels, parents, values, colors };
    }, [watchlist]);

    // Process Volume/Delivery Data for Chart
    const volumeDeliveryChartData = useMemo(() => {
        const history = Array.isArray(volumeHistory) ? volumeHistory : [];
        if (history.length === 0) return { days: [], volumes: [], delivery: [] };

        return {
            days: history.map(h => String(h?.date || '')),
            volumes: history.map(h => Number(h?.traded || 0)),
            delivery: history.map(h => Number(h?.delivery || 0))
        };
    }, [volumeHistory]);

    const intradayChartData = useMemo(() => {
        const data = Array.isArray(intradayData) ? intradayData : [];
        if (data.length === 0) return { times: [], prices: [] };
        return {
            times: data.map(d => d?.date || ''),
            prices: data.map(d => Number(d?.close || 0))
        };
    }, [intradayData]);

    // Top Movers Logic
    const topGainers = useMemo(() =>
        [...(watchlist || [])]
            .filter(w => typeof w?.changePercent === 'number')
            .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
            .slice(0, 3)
        , [watchlist]);

    const topLosers = useMemo(() =>
        [...(watchlist || [])]
            .filter(w => typeof w?.changePercent === 'number')
            .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))
            .slice(0, 3)
        , [watchlist]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-background/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-[95vw] h-[90vh] bg-surface border border-border-primary rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border-opacity-30">
                {/* ── HEADER ──────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-widest text-text-primary">Terminal Insights</h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-0.5">Expanded Analytics Dashboard</p>
                        </div>
                        <div className={`ml-4 flex items-center gap-2 px-2 py-1 rounded-lg border ${isConnected ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isConnected ? 'Live' : 'Offline'}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface/50 rounded-full transition-colors text-text-muted hover:text-text-primary">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* ── LEFT PANE: WATCHLIST HEATMAP & MOVERS ─────────────── */}
                    <div className="w-1/3 border-r border-border-primary/20 flex flex-col p-6 overflow-y-auto bg-background/30">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-surface/50 p-4 rounded-xl border border-border-primary/10">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1">Avg Change</span>
                                <span className={`text-xl font-black ${(watchlist || []).reduce((a, b) => a + (b.changePercent || 0), 0) >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
                                    {((watchlist || []).reduce((a, b) => a + (b.changePercent || 0), 0) / (watchlist?.length || 1)).toFixed(2)}%
                                </span>
                            </div>
                            <div className="bg-surface/50 p-4 rounded-xl border border-border-primary/10">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest block mb-1">Total Tickers</span>
                                <span className="text-xl font-black text-text-primary">{watchlist.length}</span>
                            </div>
                        </div>

                        {/* Top Movers */}
                        <div className="space-y-6 mb-8">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500 flex items-center gap-2">
                                <TrendingUp size={14} /> Market Leaders
                            </h3>
                             <div className="space-y-3">
                                {topGainers?.map(item => (
                                    <div
                                        key={item?.symbol || Math.random().toString()}
                                        className={`flex items-center justify-between p-3 rounded-xl border border-teal-500/20 bg-teal-500/5 cursor-pointer hover:bg-teal-500/10 transition-all ${selectedSymbol === item?.symbol ? 'ring-1 ring-teal-500' : ''}`}
                                        onClick={() => item?.symbol && handleSelect(item.symbol)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <StockLogo symbol={item?.symbol || ''} size={4} />
                                            <span className="text-xs font-black text-text-primary">{item?.symbol || '---'}</span>
                                        </div>
                                        <span className="text-xs font-black text-teal-500">+{(item?.changePercent || 0).toFixed(2)}%</span>
                                    </div>
                                ))}
                            </div>

                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-rose-500 flex items-center gap-2 mt-8">
                                <TrendingDown size={14} /> Underperformers
                            </h3>
                             <div className="space-y-3">
                                {topLosers?.map(item => (
                                    <div
                                        key={item?.symbol || Math.random().toString()}
                                        className={`flex items-center justify-between p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 cursor-pointer hover:bg-rose-500/10 transition-all ${selectedSymbol === item?.symbol ? 'ring-1 ring-rose-500' : ''}`}
                                        onClick={() => item?.symbol && handleSelect(item.symbol)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <StockLogo symbol={item?.symbol || ''} size={4} />
                                            <span className="text-xs font-black text-text-primary">{item?.symbol || '---'}</span>
                                        </div>
                                        <span className="text-xs font-black text-rose-500">{(item?.changePercent || 0).toFixed(2)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sunburst Navigator */}
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted mb-4">Hierarchical Navigator</h3>
                        <div className="flex-1 min-h-[300px]">
                             <Plot
                                 data={[{
                                     type: "sunburst",
                                     ids: sunburstData.ids,
                                     labels: sunburstData.labels,
                                     parents: sunburstData.parents,
                                     values: sunburstData.values,
                                     marker: { colors: sunburstData.colors },
                                     hoverinfo: "label+percent parent",
                                     leaf: { opacity: 0.9 },
                                     branchvalues: "total"
                                 }]}
                                 layout={{
                                     margin: { l: 0, r: 0, b: 0, t: 0 },
                                     extendsunburstcolors: true,
                                     paper_bgcolor: 'rgba(0,0,0,0)',
                                     plot_bgcolor: 'rgba(0,0,0,0)',
                                     font: { family: 'Inter, sans-serif', size: 10, color: currentTheme?.colors?.text?.muted || '#cbd5e1' }
                                 }}
                                 config={{ displayModeBar: false, responsive: true }}
                                 style={{ width: '100%', height: '100%' }}
                                 onClick={(data: any) => {
                                     const clickedId = data.points[0]?.id;
                                     if (clickedId?.includes('stock-')) {
                                         const parts = clickedId.split('-');
                                         if (parts.length >= 2) handleSelect(parts[1]);
                                     }
                                 }}
                             />
                        </div>
                    </div>

                    {/* ── RIGHT PANE: DEEP STOCK INSPECTOR ────────────────── */}
                    <div className="flex-1 bg-surface/30 p-8 overflow-y-auto">
                        {!selectedData ? (
                            <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-30">
                                <Info size={64} strokeWidth={1} />
                                <p className="mt-4 font-black uppercase tracking-widest">Select a symbol to inspect</p>
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-right-4 duration-500">
                                {/* Ticker Header */}
                                <div className="flex items-end justify-between border-b border-border-primary/20 pb-6">
                                    <div className="flex items-center gap-6">
                                        <StockLogo symbol={selectedSymbol} size={16} className="rounded-2xl shadow-xl ring-4 ring-indigo-500/10" />
                                        <div>
                                            <h1 className="text-4xl font-black text-text-primary tracking-tighter uppercase">{selectedSymbol}</h1>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">{selectedData?.sector || 'Energy'}</span>
                                                <span className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Global Asset Terminal • BSE/NSE</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-4xl font-black text-text-primary tracking-tighter tabular-nums">₹{selectedData?.price?.toLocaleString('en-IN') || '0.00'}</div>
                                        <div className={`text-sm font-black mt-1 ${(selectedData?.change || 0) >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
                                            {(selectedData?.change || 0) >= 0 ? '+' : ''}{(selectedData?.change || 0).toFixed(2)} ({(selectedData?.changePercent || 0).toFixed(2)}%)
                                        </div>
                                    </div>
                                </div>

                                {/* Intraday Performance Chart */}
                                <div className="bg-surface/50 rounded-2xl border border-border-primary/10 p-6 relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted">Intraday Performance (1D)</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xl font-black text-text-primary">₹{selectedData?.price?.toLocaleString('en-IN') || '0.00'}</span>
                                                <span className={`text-xs font-black ${(selectedData?.change || 0) >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
                                                    {(selectedData?.change || 0) >= 0 ? '+' : ''}{(selectedData?.changePercent || 0).toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">5M Interval</span>
                                        </div>
                                    </div>
                                    
                                    <div className="h-[200px] w-full relative">
                                        {intradayLoading ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-surface/20 backdrop-blur-[2px] z-10">
                                                <Activity className="w-6 h-6 text-indigo-500 animate-spin" />
                                            </div>
                                        ) : intradayChartData.times.length === 0 ? (
                                            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-[10px] font-black uppercase tracking-widest">
                                                No Intraday Data Available
                                            </div>
                                        ) : (
                                            <Plot
                                                data={[{
                                                    x: intradayChartData.times,
                                                    y: intradayChartData.prices,
                                                    type: 'scatter',
                                                    mode: 'lines',
                                                    fill: 'tozeroy',
                                                    line: { 
                                                        color: (selectedData?.changePercent || 0) >= 0 ? '#10B981' : '#F43F5E',
                                                        width: 2,
                                                        shape: 'spline'
                                                    },
                                                    fillcolor: (selectedData?.changePercent || 0) >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                    hoverinfo: 'x+y',
                                                    hovertemplate: '₹%{y:.2f}<extra></extra>'
                                                }]}
                                                layout={{
                                                    autosize: true,
                                                    height: 200,
                                                    margin: { l: 40, r: 10, t: 10, b: 20 },
                                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                                    xaxis: { 
                                                        showgrid: false, 
                                                        zeroline: false, 
                                                        showticklabels: true, 
                                                        fixedrange: true,
                                                        tickfont: { color: currentTheme?.colors?.text?.muted || '#cbd5e1', size: 8 },
                                                        nticks: 5
                                                    },
                                                    yaxis: { 
                                                        showgrid: true, 
                                                        gridcolor: 'rgba(255,255,255,0.05)',
                                                        zeroline: false, 
                                                        showticklabels: true, 
                                                        fixedrange: true,
                                                        tickfont: { color: currentTheme?.colors?.text?.muted || '#cbd5e1', size: 8 },
                                                        tickprefix: '₹',
                                                        side: 'left'
                                                    },
                                                    hovermode: 'x unified',
                                                    hoverlabel: {
                                                        bgcolor: '#1e293b',
                                                        bordercolor: '#334155',
                                                        font: { color: '#f8fafc', size: 10, family: 'Inter, sans-serif' }
                                                    }
                                                }}
                                                config={{ displayModeBar: false, responsive: true }}
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Summary Grid: Fundamentals & Performance */}
                                <div className="grid grid-cols-2 gap-8">
                                    {/* Fundamentals */}
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted flex items-center gap-2">
                                            <Info size={14} className="text-indigo-500" /> Key Fundamentals
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 relative min-h-[160px]">
                                            {detailsLoading && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/30 backdrop-blur-sm rounded-xl">
                                                    <Activity className="w-5 h-5 text-indigo-500 animate-spin" />
                                                </div>
                                            )}
                                            {[
                                                {
                                                    label: 'Market Cap',
                                                    value: (() => {
                                                        const price = selectedData?.price || 0;
                                                        const mcap = sharesOutstanding > 0 ? (sharesOutstanding * price) : (stockDetails?.valuation?.marketCap || 0);
                                                        if (!mcap) return '₹0.00 Lakh Cr';
                                                        return `₹${(mcap / 1000000000000).toFixed(2)} Lakh Cr`;
                                                    })(),
                                                    sub: 'Real-time Valuation'
                                                },
                                                { label: 'P/E Ratio', value: stockDetails?.valuation?.trailingPE || stockDetails?.valuation?.peRatio || '0.0', sub: 'Earnings' },
                                                { label: 'Dividend', value: (stockDetails?.valuation?.dividendYield || 0).toFixed(2) + '%', sub: 'Yield' },
                                                { label: '52W High', value: `₹${(stockDetails?.price?.fiftyTwoWeekHigh || 0).toLocaleString('en-IN')}`, sub: 'Resistance' },
                                            ].map((f, i) => (
                                                <div key={i} className="bg-surface p-4 rounded-xl border border-border-primary/20 shadow-sm group hover:border-indigo-500/30 transition-colors">
                                                    <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em] block mb-1">{f.label}</span>
                                                    <div className="text-base font-black text-text-primary tracking-tight">{f.value}</div>
                                                    <div className="text-[9px] font-bold text-indigo-500 uppercase mt-0.5 opacity-70">{f.sub}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Performance / Technicals */}
                                    <div className="space-y-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted flex items-center gap-2">
                                            <Zap size={14} className="text-indigo-500" /> Performance Profile
                                        </h3>
                                        <div className="grid grid-cols-3 gap-3 relative min-h-[160px]">
                                            {returnsLoading && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/30 backdrop-blur-sm rounded-xl">
                                                    <Activity className="w-5 h-5 text-indigo-500 animate-spin" />
                                                </div>
                                            )}
                                            {returnsData?.periods?.map((p: any, i: number) => {
                                                const label = typeof p === 'string' ? p : p?.label || `P${i}`;
                                                const val = typeof p === 'object' ? (p.returnPct ?? 0) : (returnsData.returnPct?.[i] ?? 0);
                                                return (
                                                    <div key={label} className="bg-surface p-4 rounded-xl border border-border-primary/20 shadow-sm flex flex-col items-center justify-center text-center">
                                                        <span className="text-[9px] font-black text-text-muted uppercase mb-1">{label}</span>
                                                        <div className={`text-sm font-black ${val >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
                                                            {val >= 0 ? '+' : ''}{Number(val).toFixed(1)}%
                                                        </div>
                                                    </div>
                                                );
                                            }) || (
                                                <div className="col-span-3 flex items-center justify-center h-full text-[10px] text-text-muted italic opacity-50">
                                                    Analysing technical performance...
                                                </div>
                                            )}
                                        </div>

                                        {/* Technical Indicators Summary */}
                                        {(returnsData?.sma50 || returnsData?.sma200) && (
                                            <div className="mt-6 pt-6 border-t border-border-primary/10 grid grid-cols-2 gap-4">
                                                {returnsData?.sma50 > 0 && (
                                                    <div className="flex items-center justify-between p-3 bg-surface/30 rounded-xl border border-border-primary/10 hover:border-indigo-500/20 transition-all">
                                                        <div>
                                                            <span className="text-[9px] font-black text-text-muted uppercase block mb-0.5">SMA (50D)</span>
                                                            <span className="text-sm font-black text-text-primary">₹{returnsData.sma50?.toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${(selectedData?.price || 0) > (returnsData?.sma50 || 0) ? 'bg-teal-500/10 text-teal-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                            {(selectedData?.price || 0) > (returnsData?.sma50 || 0) ? 'Bullish' : 'Bearish'}
                                                        </div>
                                                    </div>
                                                )}
                                                {returnsData?.sma200 > 0 && (
                                                    <div className="flex items-center justify-between p-3 bg-surface/30 rounded-xl border border-border-primary/10 hover:border-indigo-500/20 transition-all">
                                                        <div>
                                                            <span className="text-[9px] font-black text-text-muted uppercase block mb-0.5">SMA (200D)</span>
                                                            <span className="text-sm font-black text-text-primary">₹{returnsData.sma200?.toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${(selectedData?.price || 0) > (returnsData?.sma200 || 0) ? 'bg-teal-500/10 text-teal-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                            {(selectedData?.price || 0) > (returnsData?.sma200 || 0) ? 'Golden' : 'Death'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 52-Week Range Visualizer */}
                                <div className="bg-surface/50 p-6 rounded-2xl border border-border-primary/20 shadow-sm relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted flex items-center gap-2">
                                            <TrendingUp size={14} className="text-indigo-500" /> 52-Week Price Spectrum
                                        </h3>
                                        {stockDetails?.price?.fiftyTwoWeekLow != null && stockDetails?.price?.fiftyTwoWeekHigh != null && (
                                            <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                {(( (selectedData?.price || 0) - stockDetails.price.fiftyTwoWeekLow) / (stockDetails.price.fiftyTwoWeekHigh - stockDetails.price.fiftyTwoWeekLow) * 100).toFixed(1)}% from Low
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative h-2 bg-background/50 rounded-full overflow-hidden border border-border-primary/10">
                                        <div 
                                            className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-500 via-indigo-500 to-teal-500 opacity-30"
                                            style={{ width: '100%' }}
                                        />
                                        {stockDetails?.price && (
                                            <div 
                                                className="absolute top-0 bottom-0 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out"
                                                style={{ 
                                                    left: `${Math.max(0, Math.min(100, (((selectedData?.price || 0) - (stockDetails?.price?.fiftyTwoWeekLow || 0)) / ((stockDetails?.price?.fiftyTwoWeekHigh || 1) - (stockDetails?.price?.fiftyTwoWeekLow || 0))) * 100))}%`,
                                                    width: '2px'
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-between mt-3">
                                        <div>
                                            <span className="text-[9px] font-black text-text-muted uppercase block">52W Low</span>
                                            <span className="text-xs font-black text-text-primary">₹{stockDetails?.price?.fiftyTwoWeekLow?.toLocaleString('en-IN') || '0.00'}</span>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[9px] font-black text-text-muted uppercase block">Current</span>
                                            <span className="text-xs font-black text-indigo-500">₹{selectedData?.price?.toLocaleString('en-IN') || '0.00'}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] font-black text-text-muted uppercase block">52W High</span>
                                            <span className="text-xs font-black text-text-primary">₹{stockDetails?.price?.fiftyTwoWeekHigh?.toLocaleString('en-IN') || '0.00'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Intermediate Analytics: Peer Comparison & Shareholding Table */}
                                <div className="grid grid-cols-2 gap-8">
                                    {/* Sector Peers Comparison */}
                                    <div className="bg-surface/50 p-6 rounded-2xl border border-border-primary/20 shadow-sm relative overflow-hidden flex flex-col min-h-[300px]">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted flex items-center gap-2">
                                                <Users size={14} className="text-indigo-500" /> Sector Peer Intensity
                                            </h3>
                                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">Relative Analysis</span>
                                        </div>
                                        
                                        <div className="flex-1 space-y-3">
                                            {peersLoading ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <Activity className="w-5 h-5 text-indigo-500 animate-spin" />
                                                </div>
                                            ) : (peersData?.peers?.length || 0) > 0 ? (
                                                <div className="space-y-3">
                                                    {peersData.peers.slice(0, 5).map((peer: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border-primary/10 hover:border-indigo-500/20 transition-all group">
                                                            <div className="flex items-center gap-3">
                                                                <StockLogo symbol={peer?.symbol || ''} size={8} className="rounded-lg shadow-sm border border-border-primary/10" />
                                                                <div>
                                                                    <div className="text-xs font-black text-text-primary uppercase tracking-tight">{peer.name || peer.symbol}</div>
                                                                    {peer?.marketCap ? (
                                                                        <div className="text-[9px] font-bold text-text-muted uppercase">MCap: ₹{(peer.marketCap / 1000000000000).toFixed(2)}L Cr</div>
                                                                    ) : (
                                                                        <div className="text-[9px] font-bold text-text-muted uppercase">Price: ₹{(peer?.price || 0).toLocaleString('en-IN')}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                {peer.peRatio && (
                                                                    <div className="text-xs font-black text-text-primary tracking-tight">P/E: {peer.peRatio.toFixed(1)}</div>
                                                                )}
                                                                <div className={`text-[9px] font-black uppercase ${(peer?.changePercent || 0) >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
                                                                    {(peer?.changePercent || 0) >= 0 ? '+' : ''}{(peer?.changePercent || 0).toFixed(2)}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-[10px] text-text-muted italic opacity-50 uppercase tracking-widest">
                                                    No peer data available for this segment
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Shareholding Distribution Table */}
                                    <div className="bg-surface/50 p-6 rounded-2xl border border-border-primary/20 shadow-sm relative overflow-hidden flex flex-col min-h-[300px]">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted flex items-center gap-2">
                                                <Shield size={14} className="text-indigo-500" /> Shareholding Distribution
                                            </h3>
                                            <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest bg-teal-500/10 px-2 py-0.5 rounded">Institutional View</span>
                                        </div>

                                        <div className="flex-1">
                                            {holdersLoading ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <Activity className="w-5 h-5 text-indigo-500 animate-spin" />
                                                </div>
                                            ) : holdersData ? (
                                                <div className="space-y-1">
                                                    <div className="grid grid-cols-2 px-3 py-2 text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-border-primary/10">
                                                        <span>Category</span>
                                                        <span className="text-right">Holding %</span>
                                                    </div>
                                                    {[
                                                        { key: 'Promoters', val: holdersData.insiders },
                                                        { key: 'Institutions', val: holdersData.institutions },
                                                        { key: 'Public', val: holdersData.public }
                                                    ].map((item, idx) => (
                                                        <div key={idx} className="grid grid-cols-2 items-center px-3 py-3 hover:bg-surface/80 rounded-lg transition-colors group">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                                    item.key === 'Promoters' ? 'bg-indigo-500' :
                                                                    item.key === 'Institutions' ? 'bg-teal-500' : 'bg-slate-500'
                                                                }`} />
                                                                <span className="text-xs font-bold text-text-primary capitalize">{item.key}</span>
                                                            </div>
                                                            <div className="flex items-center justify-end gap-3 px-1">
                                                                <div className="flex-1 h-1 bg-background rounded-full overflow-hidden w-20 hidden md:block">
                                                                    <div 
                                                                        className={`h-full rounded-full ${
                                                                            item.key === 'Promoters' ? 'bg-indigo-500' :
                                                                            item.key === 'Institutions' ? 'bg-teal-500' : 'bg-slate-500'
                                                                        }`}
                                                                        style={{ width: `${item.val}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-black text-text-primary w-12 text-right">{Number(item?.val || 0).toFixed(2)}%</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-[10px] text-text-muted italic opacity-50 uppercase tracking-widest">
                                                    Shareholding data unavailable
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Deep Visuals: Shareholding & Volume/Delivery */}
                                <div className="grid grid-cols-2 gap-8">
                                    {/* Shareholding Pie */}
                                    <div className="bg-surface p-6 rounded-2xl border border-border-primary/20 shadow-sm h-[400px] flex flex-col group relative">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted mb-6 flex items-center gap-2">
                                            <PieChart size={14} className="text-indigo-500" /> Shareholding Pattern
                                        </h3>
                                        <div className="flex-1 relative">
                                            {holdersLoading && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/50 backdrop-blur-sm rounded-xl">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Activity className="w-5 h-5 text-indigo-500 animate-spin" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Loading Patterns...</span>
                                                    </div>
                                                </div>
                                            )}
                                            <Plot
                                                data={[{
                                                    values: shareholdingChartData.values,
                                                    labels: shareholdingChartData.labels,
                                                    type: 'pie',
                                                    hole: 0.5,
                                                    marker: { colors: shareholdingChartData.colors },
                                                    textinfo: 'label+percent',
                                                    textposition: 'outside',
                                                    automargin: true
                                                }]}
                                                layout={{
                                                    autosize: true,
                                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                                    showlegend: false,
                                                    margin: { l: 40, r: 40, t: 0, b: 0 },
                                                    font: {
                                                        family: 'Inter, sans-serif',
                                                        size: 10,
                                                        color: currentTheme.colors.text.muted
                                                    }
                                                }}
                                                config={{ displayModeBar: false, responsive: true }}
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Volume & Delivery Bar Chart */}
                                    <div className="bg-surface p-6 rounded-2xl border border-border-primary/20 shadow-sm h-[400px] flex flex-col group relative">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted mb-6 flex items-center gap-2">
                                            <BarChart2 size={14} className="text-indigo-500" /> 10-Day Vol & Delivery Analysis
                                        </h3>
                                        <div className="flex-1 relative">
                                            {volumeLoading && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/50 backdrop-blur-sm rounded-xl">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <Activity className="w-5 h-5 text-indigo-500 animate-spin" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Syncing Volume...</span>
                                                    </div>
                                                </div>
                                            )}
                                            <Plot
                                                data={[
                                                    {
                                                        x: volumeDeliveryChartData.days,
                                                        y: volumeDeliveryChartData.volumes,
                                                        name: 'Total Volume',
                                                        type: 'bar',
                                                        marker: { color: 'rgba(99, 110, 250, 0.3)' }
                                                    },
                                                    {
                                                        x: volumeDeliveryChartData.days,
                                                        y: volumeDeliveryChartData.delivery,
                                                        name: 'Delivery',
                                                        type: 'bar',
                                                        marker: { color: 'rgba(99, 110, 250, 1)' }
                                                    }
                                                ]}
                                                layout={{
                                                    barmode: 'overlay',
                                                    autosize: true,
                                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                                    showlegend: true,
                                                    legend: {
                                                        orientation: 'h',
                                                        y: -0.2,
                                                        font: { size: 10, color: currentTheme.colors.text.muted }
                                                    },
                                                    margin: { l: 40, r: 10, t: 10, b: 40 },
                                                    xaxis: {
                                                        showgrid: false,
                                                        tickfont: { size: 9, color: currentTheme.colors.text.muted },
                                                        linecolor: 'rgba(148, 163, 184, 0.1)'
                                                    },
                                                    yaxis: {
                                                        showgrid: true,
                                                        gridcolor: themeMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                                        tickfont: { size: 9, color: currentTheme.colors.text.muted }
                                                    }
                                                }}
                                                config={{ displayModeBar: false, responsive: true }}
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(WatchlistExpandedView);
