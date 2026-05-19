import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, TrendingUp, TrendingDown, Filter, X, BarChart3, Search, RefreshCw, AlertCircle, Minimize2 } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { API_BASE } from '../config/api';

interface VolumeData {
    period: string;
    delivery: number;
    traded: number;
}

interface VolumeHistory {
    date: string;
    traded: number;
    delivery: number;
    deliveryPercent: number;
    price: number;
    change: number;
    insight: string;
}

interface VolumeAnalysisProps {
    ticker?: string;
    stockName?: string;
}

const VolumeAnalysis: React.FC<VolumeAnalysisProps> = ({ ticker = "NIFTY", stockName = "Nifty 50" }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [hoveredData, setHoveredData] = useState<number | null>(null);
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');

    // Data State
    const [overviewData, setOverviewData] = useState<VolumeData[]>([]);
    const [historyData, setHistoryData] = useState<VolumeHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Table Filters
    const [filterDate, setFilterDate] = useState('');
    const [filterInsight, setFilterInsight] = useState('');
    const [filterTrend, setFilterTrend] = useState<string>('All');

    // Fetch Data
    useEffect(() => {
        const fetchVolumeData = async () => {
            if (!ticker) return;

            setLoading(true);
            setError(null);

            try {
                // Using backend API which uses yfinance for real data
                const response = await fetch(`${API_BASE}/api/v1/volume/${encodeURIComponent(ticker)}`);

                if (!response.ok) {
                    throw new Error("Failed to fetch volume data");
                }

                const data = await response.json();

                if (data.period_overview) {
                    setOverviewData(data.period_overview);
                }

                if (data.history) {
                    setHistoryData(data.history);
                }

            } catch (err) {
                console.error("Volume fetch error:", err);
                setError("Unable to load real-time volume data.");
                // Fallback to empty or keep previous state? Better to show error state.
                setOverviewData([]);
                setHistoryData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchVolumeData();
    }, [ticker]);

    // Filtered History
    const filteredHistory = useMemo(() => {
        return historyData.filter(item =>
            item.date.toLowerCase().includes(filterDate.toLowerCase()) &&
            item.insight.toLowerCase().includes(filterInsight.toLowerCase()) &&
            (filterTrend === 'All' ? true : filterTrend === 'Positive' ? item.change >= 0 : item.change < 0)
        );
    }, [historyData, filterDate, filterInsight, filterTrend]);



    const renderInsight = (insight: string) => {
        if (insight.includes('Rising') || insight.includes('Jump') || insight.includes('Strong') || insight.includes('Breakout')) return <span className="text-emerald-400 flex items-center gap-1 font-semibold"><TrendingUp size={12} /> {insight}</span>;
        if (insight.includes('Drop') || insight.includes('Falling') || insight.includes('Selling')) return <span className="text-rose-400 flex items-center gap-1 font-semibold"><TrendingDown size={12} /> {insight}</span>;
        if (insight.includes('High Delivery')) return <span className="text-blue-400 flex items-center gap-1 font-semibold"><TrendingUp size={12} /> {insight}</span>;
        return <span className="text-slate-500">-</span>;
    };

    // Helper to format large numbers

    const formatVol = (num: number) => {
        return Math.floor(num).toLocaleString('en-IN');
    };

    return (
        <React.Fragment>
            {/* Main Widget View */}
            <div className={`flex flex-col h-full w-full ${isDark ? 'bg-[#0B0E14] text-white border-slate-800/50' : 'bg-white text-slate-800 border-slate-200 shadow-sm'} p-3 rounded-xl relative overflow-hidden group border`}>
                {/* Header / Title Bar */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex flex-col">
                        <span className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            <BarChart3 size={14} /> Volume Analysis
                        </span>
                        <span className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{ticker}</span>
                    </div>

                    <button
                        onClick={() => setShowDetails(true)}
                        className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-blue-400"
                        title="Open Advanced Panel"
                    >
                        <ExternalLink size={16} />
                    </button>
                </div>

                <div className="flex-1 w-full flex flex-col justify-center gap-4 relative z-10">
                    {/* Loading / Error States */}
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-slate-500 text-xs gap-2">
                            <RefreshCw size={14} className="animate-spin" /> Loading Data...
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-rose-500 text-xs gap-2">
                            <AlertCircle size={14} /> {error}
                        </div>
                    ) : (
                        /* Horizontal Bar Chart View */
                        overviewData.length > 0 ? overviewData.map((item, i) => {
                            const delPercent = item.traded > 0 ? (item.delivery / item.traded) * 100 : 0;

                            return (
                                <div key={i} className="flex flex-col gap-1 group/bar w-full">
                                    <div className="flex justify-between items-end text-xs mb-1">
                                        <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.period}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Vol: {formatVol(item.traded)}</span>
                                            {hoveredData === i && (
                                                <span className="text-[10px] text-blue-300 animate-fadeIn font-bold">Del: {delPercent.toFixed(1)}%</span>
                                            )}
                                        </div>
                                    </div>
                                    <div
                                        className="relative h-8 w-full bg-slate-800 rounded-md overflow-hidden flex items-center cursor-crosshair border border-slate-700/50"
                                        onMouseEnter={() => setHoveredData(i)}
                                        onMouseLeave={() => setHoveredData(null)}
                                    >
                                        {/* Traded Volume Channel (Background) */}
                                        <div className={`absolute inset-0 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}></div>

                                        {/* Delivery Volume Bar (Foreground - Glowing) */}
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600 to-sky-400 opacity-90 transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                                            style={{ width: `${delPercent}%` }}
                                        ></div>

                                        {/* Glossy Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

                                        {/* Label */}
                                        <span className="relative z-10 ml-2 text-[10px] font-bold text-white drop-shadow-md">
                                            {delPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                                No Volume Data Available
                            </div>
                        )
                    )}

                    {/* Explanatory Text */}
                    <div className="absolute right-0 bottom-[-4px] max-w-[200px] pointer-events-none">
                        <p className="text-[9px] text-slate-600/80 text-right leading-tight italic">
                            *Combined NSE & BSE delivery stats (Est.)
                        </p>
                    </div>
                </div>
            </div>

            {/* Advanced Modal View (Portaled to document.body to break out of overflow-hidden parent) */}
            {showDetails && typeof document !== 'undefined' && createPortal(
                <div className={`fixed inset-0 z-[9999] flex items-center justify-center ${isDark ? 'bg-black/90' : 'bg-slate-900/60'} backdrop-blur-sm p-4 animate-in fade-in duration-200`} onClick={() => setShowDetails(false)}>
                    <div className={`w-full max-w-6xl h-[85vh] ${isDark ? 'bg-[#0F1115] border-slate-800' : 'bg-white border-slate-200 shadow-[0_10px_50px_rgba(0,0,0,0.5)]'} border rounded-2xl shadow-2xl flex flex-col overflow-hidden relative`} onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className={`flex items-center justify-between px-6 py-4 ${isDark ? 'bg-[#14181F] border-slate-800' : 'bg-slate-50 border-slate-200'} border-b`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-100 border-blue-200 text-blue-600'} border flex items-center justify-center font-bold text-lg`}>
                                    {ticker.slice(0, 1)}
                                </div>
                                <div>
                                    <h2 className={`text-xl font-bold leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{stockName}</h2>
                                    <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{ticker} • NSE</span>
                                </div>
                                <div className={`h-6 w-[1px] mx-2 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                                <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <TrendingUp size={16} className={isDark ? "text-blue-400" : "text-blue-600"} />
                                    Volume Analysis Full View
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowDetails(false)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-300 shadow-sm'}`}
                                title="Minimize Panel"
                            >
                                <Minimize2 size={16} /> Minimize
                            </button>
                        </div>

                        {/* Detail Content */}
                        <div className={`flex-1 flex flex-col p-6 overflow-hidden ${isDark ? 'bg-[#0B0E14]' : 'bg-slate-50'}`}>
                            {/* Filter Bar */}
                            <div className={`flex flex-wrap items-center gap-3 mb-4 p-2 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <span className={`flex items-center gap-2 text-xs font-semibold px-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><Filter size={14} /> Filters:</span>

                                <select
                                    value={filterTrend}
                                    onChange={(e) => setFilterTrend(e.target.value)}
                                    className={`text-xs px-3 py-2 rounded border outline-none cursor-pointer transition-colors ${isDark ? 'bg-slate-800 text-white border-slate-700 focus:border-blue-500 hover:bg-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200 focus:border-blue-500 hover:bg-slate-100'}`}
                                >
                                    <option value="All">All Trends</option>
                                    <option value="Positive">Positive Price Change</option>
                                    <option value="Negative">Negative Price Change</option>
                                </select>

                                <div className="relative">
                                    <Search size={12} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                    <input
                                        type="text"
                                        placeholder="Date..."
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className={`text-xs pl-8 pr-3 py-2 rounded border w-32 outline-none ${isDark ? 'bg-slate-800 text-white border-slate-700 focus:border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 focus:border-blue-500'}`}
                                    />
                                </div>
                                <div className="relative">
                                    <Search size={12} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                    <input
                                        type="text"
                                        placeholder="Search Insight..."
                                        value={filterInsight}
                                        onChange={(e) => setFilterInsight(e.target.value)}
                                        className={`text-xs pl-8 pr-3 py-2 rounded border w-48 outline-none ${isDark ? 'bg-slate-800 text-white border-slate-700 focus:border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 focus:border-blue-500'}`}
                                    />
                                </div>

                                {(filterDate || filterInsight || filterTrend !== 'All') && (
                                    <button onClick={() => { setFilterDate(''); setFilterInsight(''); setFilterTrend('All'); }} className="text-slate-500 hover:text-rose-400 transition-colors p-2 text-xs font-semibold flex items-center gap-1">
                                        <X size={14} /> Clear
                                    </button>
                                )}
                            </div>

                            <div className={`flex-1 overflow-y-auto custom-scrollbar rounded-xl border ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <table className={`w-full text-sm text-left ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <thead className={`font-bold uppercase sticky top-0 z-10 shadow-sm text-xs ${isDark ? 'bg-[#14181F] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                        <tr>
                                            <th className="p-3 pl-4 min-w-[100px]">Date</th>
                                            <th className="p-3 text-right">Traded Volume</th>
                                            <th className="p-3 text-right">Delivery Vol</th>
                                            <th className="p-3 text-right">Price Change</th>
                                            <th className="p-3 text-right">Delivery %</th>
                                            <th className="p-3">Insight / Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {loading ? (
                                            <tr><td colSpan={6} className="p-8 text-center"><RefreshCw className="animate-spin inline mr-2" /> Loading History...</td></tr>
                                        ) : filteredHistory.length > 0 ? (
                                            filteredHistory.map((row, index) => {
                                                const prevRow = historyData[index + 1];
                                                const isDelHigher = prevRow ? row.deliveryPercent > prevRow.deliveryPercent : true;

                                                return (
                                                    <tr key={index} className={`transition-colors group/row text-xs border-b ${isDark ? 'hover:bg-slate-800/40 border-slate-800/30' : 'hover:bg-slate-50 border-slate-100'}`}>
                                                        <td className={`p-3 pl-4 font-mono border-r ${isDark ? 'text-slate-300 border-slate-800/50' : 'text-slate-600 border-slate-100'}`}>{row.date}</td>
                                                        <td className={`p-3 text-right font-mono ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{formatVol(row.traded)}</td>
                                                        <td className="p-3 text-right font-mono text-blue-400 font-semibold">{formatVol(row.delivery)}</td>
                                                        <td className={`p-3 text-right font-bold`}>
                                                            <div className="flex flex-col items-end">
                                                                <span className={`${row.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {row.change > 0 ? '+' : ''}{row.change}%
                                                                </span>
                                                                <span className="text-[10px] text-slate-600 block">{row.price.toFixed(2)}</span>
                                                            </div>
                                                        </td>
                                                        <td className={`p-3 text-right font-bold`}>
                                                            <span className={`${isDelHigher ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'} px-2 py-1 rounded border`}>
                                                                {row.deliveryPercent}%
                                                            </span>
                                                        </td>
                                                        <td className="p-3 opacity-80 group-hover/row:opacity-100 transition-opacity">
                                                            {renderInsight(row.insight)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan={6} className="p-8 text-center text-slate-500">No records match filter</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}
        </React.Fragment>
    );
};

export default VolumeAnalysis;
