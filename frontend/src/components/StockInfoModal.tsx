import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import ChartComponent from './ChartComponent';
import { X, TrendingUp, TrendingDown, Activity, Users, BarChart3, GitCompare, Loader2, ExternalLink } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { stockDomains } from '../data/stockDomains';

interface StockInfoModalProps {
    symbol: string;
    onClose: () => void;
}

type AnalysisTab = 'holders' | 'returns' | 'volume' | 'relative';

const StockInfoModal: React.FC<StockInfoModalProps> = ({ symbol, onClose }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AnalysisTab | null>(null);
    const [analysisData, setAnalysisData] = useState<any>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const analysisPanelRef = useRef<HTMLDivElement>(null);
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark') || (themeMode as string) === 'high-contrast';

    // Fetch main quote data
    useEffect(() => {
        const fetchStockData = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`http://localhost:8000/api/v1/quote/${symbol}`);
                setData(response.data);
            } catch (error) {
                console.error("Error fetching stock quote", error);
            } finally {
                setLoading(false);
            }
        };
        if (symbol) fetchStockData();
    }, [symbol]);

    // Fetch analysis data when tab changes
    useEffect(() => {
        if (!activeTab) return;
        const fetchAnalysis = async () => {
            setAnalysisLoading(true);
            try {
                const res = await axios.get(`http://localhost:8000/api/v1/stock/${symbol}/analysis?category=${activeTab}`);
                setAnalysisData(res.data?.data || null);
            } catch (e) {
                console.error("Analysis fetch error", e);
                setAnalysisData(null);
            } finally {
                setAnalysisLoading(false);
            }
        };
        fetchAnalysis();
    }, [activeTab, symbol]);

    // Logo URL logic: API logoUrl > stockDomains > Google favicon > ui-avatars fallback
    const getLogoUrl = () => {
        if (data?.logoUrl) return data.logoUrl;
        const cleanSym = symbol.replace('.NS', '').replace('.BO', '');
        const domain = stockDomains[cleanSym];
        if (domain) return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        return `https://ui-avatars.com/api/?name=${cleanSym}&background=0f172a&color=10b981&size=128&bold=true`;
    };

    const formatNumber = (num: number) => {
        if (!num || num === 0) return '0';
        if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toLocaleString();
    };

    const analysisTabs: { key: AnalysisTab; label: string; icon: any }[] = [
        { key: 'holders', label: 'Stockholders', icon: Users },
        { key: 'returns', label: 'Returns', icon: TrendingUp },
        { key: 'volume', label: 'Volume', icon: BarChart3 },
        { key: 'relative', label: 'Relative', icon: GitCompare },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`
                relative w-full max-w-6xl h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col
                ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}
            `}>
                {/* Header */}
                <div className={`
                    px-5 py-3 flex justify-between items-center border-b shrink-0
                    ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}
                `}>
                    <div className="flex items-center gap-3">
                        {/* Company Logo */}
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center p-1.5 border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <img
                                src={getLogoUrl()}
                                alt={symbol}
                                className="w-full h-full object-contain rounded"
                                onError={(e) => {
                                    const cleanSym = symbol.replace('.NS', '').replace('.BO', '');
                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${cleanSym}&background=0f172a&color=10b981&size=128&bold=true`;
                                }}
                            />
                        </div>
                        {/* Name + Exchange + Sector */}
                        <div>
                            <h2 className={`text-xl font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {data?.name || symbol}
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                                    NSE
                                </span>
                            </h2>
                            <div className={`flex items-center gap-2 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                <span>{symbol}</span>
                                {data?.sector && data.sector !== 'N/A' && (
                                    <>
                                        <span>•</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                            {data.sector}
                                        </span>
                                    </>
                                )}
                                {data?.industry && data.industry !== 'N/A' && (
                                    <>
                                        <span>•</span>
                                        <span className="text-slate-500">{data.industry}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* External Link */}
                        {data?.website && (
                            <a
                                href={data.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                            >
                                <ExternalLink size={16} />
                            </a>
                        )}
                        {/* Close */}
                        <button
                            onClick={onClose}
                            className={`
                                p-1.5 rounded-full transition-colors
                                ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}
                            `}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Chart Section */}
                    <div className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar border-r ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                        {/* Analysis Tab Bar — Always Visible Above Chart */}
                        <div className={`flex items-center px-3 py-1.5 gap-1 border-b shrink-0 sticky top-0 z-10 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                            <Activity size={13} className={isDark ? 'text-violet-400 mr-1' : 'text-violet-500 mr-1'} />
                            {analysisTabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => {
                                            const next = activeTab === tab.key ? null : tab.key;
                                            setActiveTab(next);
                                            if (next) {
                                                setTimeout(() => analysisPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
                                            }
                                        }}
                                        className={`
                                            flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all
                                            ${activeTab === tab.key
                                                ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/30'
                                                : isDark
                                                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                            }
                                        `}
                                    >
                                        <Icon size={12} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Chart */}
                        <div className="min-h-[400px] p-2">
                            <ChartComponent ticker={symbol} />
                        </div>

                        {/* Analysis Content Panel (Below Chart, shown when tab active) */}
                        {activeTab && (
                            <div ref={analysisPanelRef} className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                <div className={`h-[200px] overflow-y-auto custom-scrollbar p-3 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
                                    {analysisLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="animate-spin text-violet-400" size={24} />
                                        </div>
                                    ) : analysisData ? (
                                        <AnalysisContent tab={activeTab} data={analysisData} isDark={isDark} formatNumber={formatNumber} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-sm text-slate-500">No data available</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Details Section */}
                    <div className={`w-[300px] flex-none overflow-y-auto custom-scrollbar p-5 space-y-5 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="animate-spin text-emerald-500" size={28} />
                            </div>
                        ) : data ? (
                            <>
                                {/* Price Card */}
                                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Current Price</div>
                                    <div className={`text-3xl font-mono font-bold ${(data.changePercent ?? data.change) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        ₹{(data.ltp ?? data.price?.current)?.toLocaleString()}
                                    </div>
                                    <div className={`text-sm font-semibold flex items-center gap-1 mt-1 ${(data.changePercent ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {(data.changePercent ?? 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        {data.change > 0 ? '+' : ''}{data.change?.toFixed(2)} ({data.changePercent?.toFixed(2)}%)
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-2">
                                    <StatBox label="Open" value={data.open?.toLocaleString()} isDark={isDark} />
                                    <StatBox label="Prev Close" value={data.prevClose?.toLocaleString()} isDark={isDark} />
                                    <StatBox label="High" value={data.high?.toLocaleString()} className="text-emerald-500" isDark={isDark} />
                                    <StatBox label="Low" value={data.low?.toLocaleString()} className="text-red-500" isDark={isDark} />
                                    <StatBox label="52W High" value={data.fiftyTwoWeekHigh?.toLocaleString()} isDark={isDark} />
                                    <StatBox label="52W Low" value={data.fiftyTwoWeekLow?.toLocaleString()} isDark={isDark} />
                                </div>

                                {/* Fundamentals */}
                                <div className={`space-y-2.5 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                    <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Fundamentals
                                    </h3>
                                    <div className="space-y-1.5">
                                        <FundRow label="Market Cap" value={data.marketCap ? formatNumber(data.marketCap) : 'N/A'} isDark={isDark} />
                                        <FundRow label="P/E Ratio" value={data.peRatio ? data.peRatio.toFixed(2) : (data.peButton ? data.peButton.toFixed(2) : 'N/A')} isDark={isDark} />
                                        <FundRow label="P/B Ratio" value={data.priceToBook ? data.priceToBook.toFixed(2) : 'N/A'} isDark={isDark} />
                                        <FundRow label="EPS" value={data.eps ? `₹${data.eps.toFixed(2)}` : 'N/A'} isDark={isDark} />
                                        <FundRow label="Div Yield" value={data.dividendYield ? `${data.dividendYield}%` : 'N/A'} isDark={isDark} />
                                        <FundRow label="Beta" value={data.beta ? data.beta.toFixed(2) : 'N/A'} isDark={isDark} />
                                        <FundRow label="Volume" value={data.volume ? formatNumber(data.volume) : 'N/A'} isDark={isDark} />
                                        <FundRow label="Avg Volume" value={data.averageVolume ? formatNumber(data.averageVolume) : 'N/A'} isDark={isDark} />
                                    </div>
                                </div>

                                {/* About */}
                                {data.description && data.description !== 'No description available.' && data.description !== 'Data unavailable (Lite Mode).' && (
                                    <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            About
                                        </h3>
                                        <p className={`text-[11px] leading-relaxed max-h-28 overflow-y-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {data.description}
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-red-500 py-10">
                                Failed to load data
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ───── Analysis Content Renderer ───── */
const AnalysisContent: React.FC<{ tab: AnalysisTab; data: any; isDark: boolean; formatNumber: (n: number) => string }> = ({ tab, data, isDark, formatNumber }) => {
    if (tab === 'holders') {
        return (
            <div className="grid grid-cols-3 gap-3">
                {/* Breakdown */}
                <div className={`col-span-1 p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="text-xs font-bold mb-2 text-violet-400">Ownership Split</div>
                    <div className="space-y-2">
                        <HolderBar label="Promoters" value={data.insiders ?? 0} color="bg-emerald-500" isDark={isDark} />
                        <HolderBar label="Institutions" value={data.institutions ?? 0} color="bg-blue-500" isDark={isDark} />
                        <HolderBar label="Public" value={data.public ?? 0} color="bg-amber-500" isDark={isDark} />
                    </div>
                </div>
                {/* Major Holders */}
                <div className={`col-span-2 p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="text-xs font-bold mb-2 text-violet-400">Top Institutional Holders</div>
                    {data.institutionalHolders?.length > 0 ? (
                        <div className="space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                            {data.institutionalHolders.map((h: any, i: number) => (
                                <div key={i} className={`flex justify-between text-[11px] px-2 py-1 rounded ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{h.holder}</span>
                                    <span className="text-slate-500 font-mono">{h.shares?.toLocaleString()} shares</span>
                                </div>
                            ))}
                        </div>
                    ) : data.majorHolders?.length > 0 ? (
                        <div className="space-y-1">
                            {data.majorHolders.map((h: any, i: number) => (
                                <div key={i} className={`flex justify-between text-[11px] px-2 py-1 rounded ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{h.label}</span>
                                    <span className="text-violet-400 font-mono font-semibold">{h.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500">No holder data available</div>
                    )}
                </div>
            </div>
        );
    }

    if (tab === 'returns') {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                    {data.periods?.map((p: any) => (
                        <div key={p.label} className={`p-3 rounded-lg border text-center ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className="text-[10px] text-slate-500 font-semibold mb-1">{p.label}</div>
                            <div className={`text-lg font-mono font-bold ${p.returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {p.returnPct >= 0 ? '+' : ''}{p.returnPct?.toFixed(1)}%
                            </div>
                        </div>
                    ))}
                </div>
                {(data.sma50 || data.sma200) && (
                    <div className="flex gap-3">
                        {data.sma50 > 0 && (
                            <div className={`flex-1 p-2 rounded-lg border text-xs ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <span className="text-slate-500">SMA 50: </span>
                                <span className={`font-mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>₹{data.sma50?.toLocaleString()}</span>
                            </div>
                        )}
                        {data.sma200 > 0 && (
                            <div className={`flex-1 p-2 rounded-lg border text-xs ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <span className="text-slate-500">SMA 200: </span>
                                <span className={`font-mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>₹{data.sma200?.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (tab === 'volume') {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">Today</div>
                        <div className={`text-sm font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{formatNumber(data.current)}</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">Avg (3M)</div>
                        <div className={`text-sm font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{formatNumber(data.average)}</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">Avg (10D)</div>
                        <div className={`text-sm font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{formatNumber(data.averageVolume10d)}</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className="text-[10px] text-slate-500 font-semibold">Vol/Avg</div>
                        <div className={`text-sm font-mono font-bold ${data.ratio > 1.2 ? 'text-emerald-400' : data.ratio < 0.8 ? 'text-red-400' : isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {data.ratio?.toFixed(2)}x
                        </div>
                    </div>
                </div>
                {/* Volume bars */}
                {data.trend?.length > 0 && (
                    <div className="flex items-end gap-[2px] h-[80px] px-1">
                        {data.trend.map((t: any, i: number) => {
                            const maxVol = Math.max(...data.trend.map((x: any) => x.volume));
                            const h = maxVol > 0 ? (t.volume / maxVol * 100) : 0;
                            return (
                                <div
                                    key={i}
                                    className={`flex-1 rounded-t-sm transition-all ${t.aboveAvg ? 'bg-emerald-500/60' : 'bg-slate-600/40'}`}
                                    style={{ height: `${h}%`, minHeight: '2px' }}
                                    title={`${t.date}: ${t.volume.toLocaleString()}`}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    if (tab === 'relative') {
        return (
            <div className="space-y-2">
                {data.sector && (
                    <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Sector: <span className="text-violet-400">{data.sector}</span> — Peer Performance
                    </div>
                )}
                {data.peers?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                        {data.peers.map((p: any) => (
                            <div key={p.symbol} className={`flex justify-between items-center p-2 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <div>
                                    <div className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{p.symbol}</div>
                                    <div className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>₹{p.price?.toLocaleString()}</div>
                                </div>
                                <div className={`text-xs font-mono font-bold ${p.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {p.changePct >= 0 ? '+' : ''}{p.changePct?.toFixed(2)}%
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-slate-500">No peer data available</div>
                )}
            </div>
        );
    }

    return null;
};

/* ───── Helper Components ───── */
const HolderBar: React.FC<{ label: string; value: number; color: string; isDark: boolean }> = ({ label, value, color, isDark }) => (
    <div>
        <div className="flex justify-between text-[10px] mb-0.5">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{label}</span>
            <span className={`font-mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{value.toFixed(1)}%</span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
    </div>
);

const StatBox = ({ label, value, className = '', isDark }: { label: string; value: any; className?: string; isDark: boolean }) => (
    <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
        <div className={`text-sm font-mono font-semibold ${className || (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
            {value || '—'}
        </div>
    </div>
);

const FundRow = ({ label, value, isDark }: { label: string; value: string; isDark: boolean }) => (
    <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={`font-mono font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{value}</span>
    </div>
);

export default StockInfoModal;
