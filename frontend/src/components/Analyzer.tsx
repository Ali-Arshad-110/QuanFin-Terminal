import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, Briefcase, ShieldAlert, Award, Globe, ChevronLeft, ChevronRight, Filter, Check, List, LayoutGrid, ExternalLink
} from 'lucide-react';
import { useMarketStore } from '../store';
import { stockUniverse } from '../data/stockUniverse';
import ChartComponent from './ChartComponent';
import PieChart from './PieChart';
import SunburstChart from './analyzer/SunburstChart';
import PeersList from './analyzer/PeersList';
import { useTheme } from '../theme/ThemeProvider';

interface Peer {
    symbol: string;
    name: string;
    price?: number;
    marketCap?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    logoUrl?: string;
}

interface InstitutionalHolder {
    holder: string;
    shares: number;
    pctOut: number;
    value: number;
}

interface HoldersData {
    insiders: number;
    institutions: number;
    public: number;
    majorHolders: { value: string; label: string }[];
    institutionalHolders: InstitutionalHolder[];
}

interface StockDetails {
    symbol: string;
    name: string;
    description: string;
    industry: string;
    shareholding: { insiders: number; institutions: number; public?: number };
    valuation: {
        marketCap: number; trailingPE: number; priceToBook: number;
        bookValue: number; dividendYield: number; beta: number; faceValue: number
    };
    financials: {
        revenue: number; netIncome: number; profitMargin: number;
        roe: number; roce: number
    };
    price: {
        current: number; change: number; changePercent: number; volume: number;
        open: number; high: number; low: number;
        fiftyTwoWeekHigh: number; fiftyTwoWeekLow: number
    };
    logoUrl?: string;
    altLogo?: string;
    sector?: string;
    website?: string;
    peers?: Peer[];
}

const Analyzer: React.FC = () => {
    const { ticker, setTicker, marketStats, setMarketStats } = useMarketStore();
    const [inputTicker, setInputTicker] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [details, setDetails] = useState<StockDetails | null>(null);
    const [activeTab, setActiveTab] = useState('CHART');
    const [isChartMaximized, setIsChartMaximized] = useState(false);
    const [holdersData, setHoldersData] = useState<HoldersData | null>(null);
    const [holdersLoading, setHoldersLoading] = useState(false);
    const [showUniverseOverlay, setShowUniverseOverlay] = useState(false);
    const [universeSearch, setUniverseSearch] = useState('');
    const [universeTypeFilter, setUniverseTypeFilter] = useState<'ALL' | 'FPI' | 'DII'>('ALL');
    const [universeViewMode, setUniverseViewMode] = useState<'GRID' | 'LIST'>('GRID');
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');

    // Helper: Localized Market Cap Formatter (Removed unused for now)

    // Fetch detail data when ticker changes
    useEffect(() => {
        if (!ticker) return;

        const fetchDetails = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/v1/stock/${encodeURIComponent(ticker)}/details`);
                if (res.ok) {
                    const data = await res.json();
                    setDetails(data);
                }

                const quoteRes = await fetch(`http://localhost:8000/api/v1/quote/${encodeURIComponent(ticker)}`);
                if (quoteRes.ok) {
                    const quoteData = await quoteRes.json();
                    setMarketStats({
                        open: quoteData.open || 0,
                        high: quoteData.high || 0,
                        low: quoteData.low || 0,
                        close: quoteData.current || quoteData.ltp || 0,
                        volume: quoteData.volume || 0,
                    });
                }
            } catch (e) {
                console.error("Failed to fetch analyzer details or stats", e);
            }
        };
        fetchDetails();
        // Reset holders when ticker changes
        setHoldersData(null);
    }, [ticker, setMarketStats]);

    // Fetch institutional holders when INVESTORS tab is activated
    useEffect(() => {
        if (activeTab !== 'INVESTORS' || !ticker || holdersData) return;
        const fetchHolders = async () => {
            setHoldersLoading(true);
            try {
                const res = await fetch(`http://localhost:8000/api/v1/stock/${encodeURIComponent(ticker)}/analysis?category=holders`);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.data) setHoldersData(data.data as HoldersData);
                }
            } catch (e) {
                console.error('Failed to fetch institutional holders', e);
            } finally {
                setHoldersLoading(false);
            }
        };
        fetchHolders();
    }, [activeTab, ticker, holdersData]);

    const filteredUniverse = useMemo(() => {
        const allKnown = [
            ...((holdersData as any)?.knownFPIs || []),
            ...((holdersData as any)?.knownDIIs || [])
        ];

        return allKnown.filter((inst: any) => {
            const matchesSearch = inst.name.toLowerCase().includes(universeSearch.toLowerCase()) ||
                (inst.short_name && inst.short_name.toLowerCase().includes(universeSearch.toLowerCase())) ||
                (inst.country && inst.country.toLowerCase().includes(universeSearch.toLowerCase()));

            const matchesType = universeTypeFilter === 'ALL' || inst.category === universeTypeFilter;

            return matchesSearch && matchesType;
        });
    }, [holdersData, universeSearch, universeTypeFilter]);

    const handleSearch = (newTicker: string) => {
        setTicker(newTicker);
        setInputTicker('');
        setShowSuggestions(false);
    };

    const filteredSuggestions = useMemo(() => {
        if (!inputTicker) return [];
        return stockUniverse.filter(s =>
            s.symbol.toLowerCase().includes(inputTicker.toLowerCase()) ||
            s.name.toLowerCase().includes(inputTicker.toLowerCase())
        ).slice(0, 10);
    }, [inputTicker]);


    // Prepare Shareholding Data
    const shareholdingData = useMemo(() => {
        if (!details?.shareholding) return [];
        const { insiders, institutions } = details.shareholding;
        const publicFloat = 100 - (insiders + institutions);
        return [
            { label: 'Promoters', value: Number(insiders.toFixed(2)), color: '#3b82f6' },
            { label: 'Institutions', value: Number(institutions.toFixed(2)), color: '#8b5cf6' },
            { label: 'Public', value: Number(Math.max(0, publicFloat).toFixed(2)), color: '#10b981' },
        ];
    }, [details]);

    // Generic Widget Wrapper
    const Widget = ({ title, icon: Icon, children, className = "" }: { title: string, icon: any, children: React.ReactNode, className?: string }) => (
        <div className={`flex flex-col rounded-xl border p-4 shadow-lg transition-all duration-300 ${isDark ? 'bg-[#0f1419]/60 border-slate-800/80 hover:border-slate-700 shadow-black/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-slate-200/50'} ${className}`}>
            <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon size={14} />
                </div>
                <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{title}</h3>
            </div>
            <div className="flex-1 min-h-0">
                {children}
            </div>
        </div>
    );

    return (
        <div className={`flex flex-col h-full bg-background overflow-hidden relative transition-colors duration-300 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>

            {/* 1. Institutional Multi-Info Header */}
            <div className={`mx-4 mt-1.5 mb-0 rounded-t-2xl flex flex-col md:flex-row items-center justify-between px-4 py-1.5 border border-b-0 shadow-sm relative z-[100] ${isDark ? 'bg-[#0b0f14] border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-6 w-full md:w-auto">
                    {/* Ticker Identity */}
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shadow-inner border bg-white ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <img
                                src={details?.logoUrl || details?.altLogo || `https://www.google.com/s2/favicons?domain=${ticker.toLowerCase()}.com&sz=128`}
                                alt={ticker}
                                className="w-6 h-6 object-contain"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const symbolDomain = `${ticker.toLowerCase()}.com`;
                                    if (target.src.includes('clearbit')) {
                                        target.src = details?.altLogo || `https://www.google.com/s2/favicons?domain=${symbolDomain}&sz=128`;
                                    } else if (target.src.includes('google.com')) {
                                        target.src = `https://ui-avatars.com/api/?name=${ticker}&background=0D9488&color=fff&bold=true`;
                                    }
                                }}
                            />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <h1 className="text-lg font-black tracking-tighter uppercase leading-none">{details?.name || ticker}</h1>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                {details?.website && (
                                    <a href={details.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:underline">
                                        <Globe size={10} /> {details.website.replace('https://', '').replace('www.', '').split('/')[0]}
                                    </a>
                                )}
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                    <Briefcase size={10} /> BSE: 500325
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                    <Award size={10} /> NSE: {ticker}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Unified Search */}
                    <div className="relative group w-40 lg:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={14} />
                        <input
                            type="text"
                            value={inputTicker}
                            onChange={(e) => { setInputTicker(e.target.value.toUpperCase()); setShowSuggestions(true); }}
                            onFocus={() => setShowSuggestions(true)}
                            onKeyDown={(e) => e.key === 'Enter' && inputTicker.trim() && handleSearch(inputTicker.trim())}
                            placeholder="Find Ticker..."
                            className={`text-xs rounded-xl py-2 pl-9 pr-4 w-full transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500/30 border ${isDark ? 'bg-slate-950/50 border-slate-700/50 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                        />
                        {showSuggestions && inputTicker && (
                            <div className={`absolute top-full left-0 mt-2 border rounded-xl shadow-2xl max-h-60 overflow-y-auto w-72 backdrop-blur-xl z-[200] ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'}`}>
                                {filteredSuggestions.map((stock) => (
                                    <div key={stock.symbol} className={`px-4 py-2 hover:bg-emerald-500/10 cursor-pointer border-b last:border-0 border-slate-800/20 text-xs`} onClick={() => handleSearch(stock.symbol)}>
                                        <span className="font-bold text-emerald-400 mr-2">{stock.symbol}</span>
                                        <span className="text-text-muted">{stock.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end min-w-[120px]">
                    <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Live Terminal Pulse
                    </div>
                    <div className={`text-lg font-black tracking-tighter shadow-sm ${(marketStats?.close ?? 0) >= (marketStats?.open ?? 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{marketStats?.close?.toFixed(2) || '0.00'}
                    </div>
                </div>
            </div>

            {/* 1.1 Screener-style Sub-Header Navigation */}
            <div className={`mx-4 px-6 border-x border-b sticky top-0 z-[90] ${isDark ? 'bg-[#0f1419] border-slate-800' : 'bg-slate-50/80 border-slate-200 backdrop-blur-md'}`}>
                <div className="flex items-center gap-5 overflow-x-auto no-scrollbar py-0.5">
                    {['Chart', 'Analysis', 'Peers', 'Quarters', 'Profit & Loss', 'Balance Sheet', 'Cash Flow', 'Ratios', 'Investors'].map((item) => (
                        <button
                            key={item}
                            onClick={() => setActiveTab(item.toUpperCase())}
                            className={`text-[10px] font-black uppercase whitespace-nowrap transition-all pb-1 px-1 border-b-2 ${activeTab === item.toUpperCase() ? 'text-indigo-500 border-indigo-500' : 'text-slate-500 hover:text-indigo-400 border-transparent'}`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. High-Density Layout Wrapper */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
                {activeTab === 'CHART' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-0">
                        {/* LEFT COLUMN (8/12 or 12/12) - Charts & Volume */}
                        <div className={`${isChartMaximized ? 'md:col-span-12' : 'md:col-span-8'} flex flex-col gap-4 h-full`}>
                            <div className={`flex-1 rounded-2xl border shadow-lg overflow-hidden flex flex-col transition-all duration-500 ${isDark ? 'bg-[#0b0f14] border-slate-800 shadow-black/40' : 'bg-white border-slate-200'}`}>
                                <ChartComponent
                                    ticker={ticker}
                                    isMaximized={isChartMaximized}
                                    onToggleMaximize={() => setIsChartMaximized(!isChartMaximized)}
                                />
                            </div>
                        </div>

                        {/* RIGHT COLUMN (4/12) - Intelligence Sidebar */}
                        {!isChartMaximized && (
                            <div className="md:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1 h-full">
                                {/* Stock-Index Relationship (Sunburst) */}
                                <Widget title="index / Stock" icon={ShieldAlert}>
                                    <SunburstChart
                                        symbol={ticker || ''}
                                        name={details?.name || ticker}
                                        sector={details?.sector || 'Broad Market'}
                                        industry={details?.industry || 'N/A'}
                                        peers={details?.peers || []}
                                    />
                                </Widget>


                                {/* Institutional Summary */}
                                <Widget title="Corporate Intel" icon={Briefcase} className="flex-1">
                                    <div className={`text-[10px] font-bold leading-relaxed line-clamp-5 mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {details?.description || 'Deep-tier fundamental data currently being indexed for this security...'}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/40">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Revenue</span>
                                            <span className="text-[11px] font-black">₹{((details?.financials?.revenue || 0) / 10000000).toFixed(0)} Cr</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Margins</span>
                                            <span className="text-[11px] font-black text-emerald-400">{details?.financials?.profitMargin?.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Market Cap</span>
                                            <span className="text-[11px] font-black text-indigo-400">₹{((details?.valuation?.marketCap || 0) / 10000000).toFixed(0)} Cr</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">ROE</span>
                                            <span className="text-[11px] font-black text-rose-400">{details?.financials?.roe?.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </Widget>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'PEERS' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <PeersList
                            peers={details?.peers || []}
                            currentTicker={ticker}
                            onSelect={(newTicker) => { setTicker(newTicker); setActiveTab('CHART'); }}
                        />
                    </div>
                )}

                {activeTab === 'INVESTORS' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-2">

                        {/* Loading State */}
                        {holdersLoading && (
                            <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-60">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Fetching Institutional Data...</p>
                            </div>
                        )}

                        {!holdersLoading && (
                            <div className="flex flex-col gap-6">
                                {/* Section 1: Ownership Breakdown */}
                                <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#0f1419]/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center gap-2 mb-6">
                                        <h2 className="text-sm font-black uppercase tracking-widest text-indigo-500">Ownership Pattern</h2>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>SEBI Disclosed • Yahoo Finance</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                        <PieChart data={shareholdingData} size={220} />
                                        <div className="flex flex-col gap-5">
                                            {[
                                                { label: 'Promoters / Insiders', value: (holdersData as any)?.insiders ?? shareholdingData.find(s => s.label === 'Promoters')?.value ?? 0, color: '#3b82f6' },
                                                { label: 'Institutions (FII + DII)', value: (holdersData as any)?.institutions ?? shareholdingData.find(s => s.label === 'Institutions')?.value ?? 0, color: '#8b5cf6' },
                                                { label: 'Public Float', value: (holdersData as any)?.public ?? shareholdingData.find(s => s.label === 'Public')?.value ?? 0, color: '#10b981' },
                                            ].map(d => (
                                                <div key={d.label} className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                                            <span className="text-xs font-bold">{d.label}</span>
                                                        </div>
                                                        <span className="text-sm font-black tracking-tighter" style={{ color: d.color }}>{Number(d.value).toFixed(2)}%</span>
                                                    </div>
                                                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, Number(d.value))}%`, backgroundColor: d.color }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Institutional Holders Table */}
                                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#0f1419]/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                                    <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-sm font-black uppercase tracking-widest text-indigo-500">Top Institutional Holders</h2>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Enriched Data • SEBI Category I/II</span>
                                        </div>
                                    </div>

                                    {(holdersData as any)?.institutionalHolders && (holdersData as any).institutionalHolders.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className={`${isDark ? 'bg-slate-900/50 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
                                                        <th className="px-6 py-3 text-left font-black uppercase tracking-widest text-[9px]">#</th>
                                                        <th className="px-6 py-3 text-left font-black uppercase tracking-widest text-[9px]">Institution</th>
                                                        <th className="px-6 py-3 text-left font-black uppercase tracking-widest text-[9px]">Origin</th>
                                                        <th className="px-6 py-3 text-left font-black uppercase tracking-widest text-[9px]">Type</th>
                                                        <th className="px-6 py-3 text-right font-black uppercase tracking-widest text-[9px]">Shares</th>
                                                        <th className="px-6 py-3 text-right font-black uppercase tracking-widest text-[9px]">% Stake</th>
                                                        <th className="px-6 py-3 text-right font-black uppercase tracking-widest text-[9px]">AUM (Est)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(holdersData as any).institutionalHolders.map((h: any, i: number) => (
                                                        <tr key={h.holder} className={`border-t transition-colors ${isDark ? 'border-slate-800/60 hover:bg-slate-800/30' : 'border-slate-100 hover:bg-slate-50'}`}>
                                                            <td className="px-6 py-3 text-slate-500 font-black">{i + 1}</td>
                                                            <td className="px-6 py-3">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-[11px]">{h.holder}</span>
                                                                    {h.sebi_category && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">{h.sebi_category}</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                {h.country ? (
                                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{h.country}</span>
                                                                ) : <span className="text-slate-600">—</span>}
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                <span className="text-[10px] font-medium text-slate-500 italic">{h.type || 'Institutional'}</span>
                                                            </td>
                                                            <td className="px-6 py-3 text-right font-mono text-slate-400">{(h.shares / 1e6).toFixed(1)}M</td>
                                                            <td className="px-6 py-3 text-right">
                                                                <span className="font-black text-indigo-400">{Number(h.pctOut).toFixed(2)}%</span>
                                                            </td>
                                                            <td className="px-6 py-3 text-right font-mono text-emerald-400">
                                                                {h.aum_usd_bn ? `$${h.aum_usd_bn}B` : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-50">
                                            <Award size={32} />
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                                Detailed FPI/DII metadata table currently indexing for this security...
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Section 3: Institutional Universe Mapping */}
                                <div className={`rounded-xl border border-dashed px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 ${isDark ? 'border-slate-800 bg-slate-900/20' : 'border-slate-200 bg-slate-50/50'}`}>
                                    <div
                                        className="flex items-center gap-4 cursor-pointer group"
                                        onClick={() => { setUniverseTypeFilter('ALL'); setShowUniverseOverlay(true); }}
                                    >
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className={`w-6 h-6 rounded-full border-2 ${isDark ? 'border-slate-800 text-slate-200' : 'border-white bg-slate-100'} flex items-center justify-center text-[8px] font-black group-hover:scale-110 transition-transform`}>
                                                    {['US', 'SG', 'UK', 'IN'][i - 1]}
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                                                Institutional Universe Active <ChevronRight size={10} />
                                            </p>
                                            <p className="text-[9px] text-slate-500">System tracking 50+ major FII/FPI & 20+ DII Global Entities</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div
                                            className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
                                            onClick={() => { setUniverseTypeFilter('FPI'); setShowUniverseOverlay(true); }}
                                        >
                                            <span className="text-lg font-black tracking-tighter text-emerald-400">{(holdersData as any)?.knownFPIs?.length || 0}</span>
                                            <span className="text-[8px] font-black uppercase text-slate-600">Global FPIs</span>
                                        </div>
                                        <div className="w-px h-6 bg-slate-800 shadow-inner" />
                                        <div
                                            className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
                                            onClick={() => { setUniverseTypeFilter('DII'); setShowUniverseOverlay(true); }}
                                        >
                                            <span className="text-lg font-black tracking-tighter text-indigo-400">{(holdersData as any)?.knownDIIs?.length || 0}</span>
                                            <span className="text-[8px] font-black uppercase text-slate-600">Domestic DIIs</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab !== 'CHART' && activeTab !== 'PEERS' && activeTab !== 'INVESTORS' && (
                    <div className="flex flex-col items-center justify-center py-40 text-slate-500 italic opacity-40">
                        <Award size={48} className="mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">{activeTab} section currently under development by AI agents.</p>
                    </div>
                )}
            </div>

            {/* Institutional Explorer Overlay */}
            {showUniverseOverlay && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:px-12 md:pb-12 md:pt-24 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowUniverseOverlay(false)} />

                    <div className={`relative w-full max-w-6xl h-full flex flex-col rounded-3xl overflow-hidden border shadow-2xl ${isDark ? 'bg-[#0b0f13] border-slate-800' : 'bg-white border-slate-200'}`}>
                        {/* Header */}
                        <div className={`px-8 py-6 border-b flex items-center justify-between gap-6 relative z-[310] ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-100 bg-slate-50'}`}>
                            <div className="flex items-center gap-6 flex-1">
                                <button
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-indigo-400' : 'hover:bg-slate-100 text-slate-500 hover:text-indigo-600'}`}
                                    onClick={() => setShowUniverseOverlay(false)}
                                >
                                    <ChevronLeft size={16} /> Back to Analysis
                                </button>
                                <div className="w-px h-6 bg-slate-800 shadow-inner hidden md:block" />
                                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                                    <Globe size={24} />
                                </div>
                                <div className="flex-1 max-w-sm relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Search Explorer..."
                                        className={`w-full h-10 pl-10 pr-4 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 border'}`}
                                        value={universeSearch}
                                        onChange={(e) => setUniverseSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* View Toggle */}
                                <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-100 border-slate-200'}`}>
                                    <button 
                                        className={`p-1.5 rounded-lg transition-all ${universeViewMode === 'GRID' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        onClick={() => setUniverseViewMode('GRID')}
                                        title="Grid View"
                                    >
                                        <LayoutGrid size={14} />
                                    </button>
                                    <button 
                                        className={`p-1.5 rounded-lg transition-all ${universeViewMode === 'LIST' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                        onClick={() => setUniverseViewMode('LIST')}
                                        title="Table View"
                                    >
                                        <List size={14} />
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-slate-800 shadow-inner" />

                                <div className={`flex rounded-xl p-1 ${isDark ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}>
                                    {(['ALL', 'FPI', 'DII'] as const).map(t => (
                                        <button
                                            key={t}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${universeTypeFilter === t ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                            onClick={() => setUniverseTypeFilter(t)}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Explorer Content */}
                        <div className="flex-1 overflow-y-auto p-8 pt-12 pb-20 custom-scrollbar">
                            {universeViewMode === 'GRID' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredUniverse.map((inst: any) => (
                                        <div
                                            key={inst.id || inst.name}
                                            className={`group p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${isDark ? 'bg-[#0f1419] border-slate-800 hover:border-indigo-500/50 hover:shadow-indigo-500/10 hover:shadow-2xl' : 'bg-white border-slate-200 hover:border-indigo-500/30 hover:shadow-lg'}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex flex-col gap-1">
                                                    <h3 className="text-sm font-black tracking-tight leading-tight group-hover:text-indigo-400 transition-colors">{inst.name}</h3>
                                                    {inst.website ? (
                                                        <a 
                                                            href={inst.website.startsWith('http') ? inst.website : `https://${inst.website}`} 
                                                            target="_blank" rel="noopener noreferrer"
                                                            className={`text-[9px] font-black flex items-center gap-1 transition-all ${isDark ? 'text-indigo-400/80 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink size={10} /> {inst.website.replace('https://', '').replace('www.', '')}
                                                        </a>
                                                    ) : (
                                                        <a 
                                                            href={`https://www.google.com/search?q=${encodeURIComponent(inst.name)}+official+website`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className={`text-[8px] font-bold flex items-center gap-1 opacity-40 hover:opacity-100 transition-all ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Search size={8} /> Find Official Channel
                                                        </a>
                                                    )}
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                                            {inst.country || 'Global'}
                                                        </span>
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                            {inst.category || 'Institutional'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {inst.aum_usd_bn && (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] font-black text-emerald-400">${inst.aum_usd_bn}B</span>
                                                        <span className="text-[7px] font-black uppercase text-slate-600 tracking-tighter">EST AUM</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest mb-1.5 flex items-center gap-1.5">
                                                        <Filter size={8} /> Entity Profile
                                                    </p>
                                                    <p className="text-[10px] font-medium text-slate-400 italic line-clamp-1">{inst.type || 'Institutional Portfolio Investor'}</p>
                                                </div>

                                                {inst.known_holdings_india && inst.known_holdings_india.length > 0 && (
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase text-indigo-400 tracking-widest mb-2 flex items-center gap-1.5">
                                                            <Briefcase size={8} /> Major Public Holdings (India)
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {inst.known_holdings_india.slice(0, 5).map((h: string) => (
                                                                <span
                                                                    key={h}
                                                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${isDark ? 'border-slate-800 bg-slate-900/50 text-slate-500' : 'border-slate-100 bg-slate-50 text-slate-600'}`}
                                                                >
                                                                    {h}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={`mt-2 pt-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                                        <ShieldAlert size={8} /> {inst.sebi_category || 'Cat-I FPI'}
                                                    </span>
                                                    <button className="text-[10px] font-black text-indigo-400 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                                                        View Full Analysis <ChevronRight size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={`rounded-2xl border ${isDark ? 'bg-[#0f1419]/50 border-slate-800' : 'bg-white border-slate-200'} overflow-hidden`}>
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead>
                                                <tr className={`border-b ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-100 bg-slate-50/50'}`}>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Institutional Entity</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Origin</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Class</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Est. AUM</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Major Holdings (India)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {filteredUniverse.map((inst: any) => (
                                                    <tr key={inst.id || inst.name} className={`group hover:bg-indigo-500/5 transition-colors cursor-pointer`}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-black group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{inst.name}</span>
                                                                {inst.website ? (
                                                                    <a 
                                                                        href={inst.website.startsWith('http') ? inst.website : `https://${inst.website}`} 
                                                                        target="_blank" rel="noopener noreferrer"
                                                                        className={`text-[9px] font-black flex items-center gap-1 w-fit transition-all ${isDark ? 'text-indigo-400/80 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <ExternalLink size={7} /> {inst.website.replace('https://', '').replace('www.', '')}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[7px] text-slate-500 italic opacity-40">Website Unverified</span>
                                                                )}
                                                                <span className="text-[9px] text-slate-500 font-medium italic mt-0.5">{inst.type || 'Global Portfolio Management'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                                                {inst.country || 'Global'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${inst.category === 'FPI' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                                {inst.category || 'Cat-I'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="text-xs font-black text-emerald-400">{inst.aum_usd_bn ? `$${inst.aum_usd_bn}B` : '—'}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-1.5 overflow-hidden">
                                                                {inst.known_holdings_india?.slice(0, 3).map((h: string) => (
                                                                    <span key={h} className="text-[9px] font-bold text-slate-500 whitespace-nowrap bg-slate-800/30 px-2 py-0.5 rounded-full border border-slate-800/50">
                                                                        {h}
                                                                    </span>
                                                                ))}
                                                                {inst.known_holdings_india?.length > 3 && (
                                                                    <span className="text-[9px] font-black text-slate-700">+{inst.known_holdings_india.length - 3}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analyzer;
