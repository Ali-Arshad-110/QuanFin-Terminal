import React, { useEffect, useState } from 'react';
import { useMarketStore } from '../store';
import { X, Minimize2, Maximize2, ExternalLink, Globe, Award, TrendingUp, TrendingDown, RefreshCw, BarChart2, Layout, Search, ArrowRight } from 'lucide-react';
import ChartComponent from './ChartComponent';
import OptionChain from './OptionChain';
import { stockUniverse } from '../data/stockUniverse';

interface StockDetails {
    symbol: string;
    name: string;
    shortName: string;
    logoUrl?: string;
    industry: string;
    sector: string;
    description: string;
    website: string;
    employees: number;
    price: {
        current: number;
        change: number;
        changePercent: number;
        open: number;
        high: number;
        low: number;
        prevClose: number;
        fiftyTwoWeekHigh: number;
        fiftyTwoWeekLow: number;
        volume: number;
        averageVolume: number;
    };
    valuation: {
        marketCap: number;
        trailingPE: number;
        forwardPE: number;
        priceToBook: number;
        dividendYield: number;
        eps: number;
        beta: number;
    };
    financials: {
        revenue: number;
        netIncome: number;
        profitMargin: number;
        operatingMargin: number;
        roe: number;
        debtToEquity: number;
    };
    shareholding: {
        insiders: number;
        institutions: number;
    };
}

const StockDetailPanel: React.FC = () => {
    const { selectedStock, setSelectedStock, setTicker } = useMarketStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAnalysisMode, setIsAnalysisMode] = useState(false);
    const [isOptionChainMode, setIsOptionChainMode] = useState(false);
    const [inputTicker, setInputTicker] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter suggestions
    const filteredSuggestions = React.useMemo(() => {
        if (!inputTicker) return [];
        return stockUniverse.filter(s =>
            s.symbol.toLowerCase().includes(inputTicker.toLowerCase()) ||
            s.name.toLowerCase().includes(inputTicker.toLowerCase())
        ).slice(0, 10);
    }, [inputTicker]);

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<StockDetails | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedStock) {
            setData(null);
            return;
        }

        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`http://localhost:8000/api/v1/stock/${encodeURIComponent(selectedStock)}/details`);
                if (res.ok) {
                    const result = await res.json();
                    setData(result);
                } else {
                    throw new Error("Failed to fetch details");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load stock details.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [selectedStock]);

    if (!selectedStock) return null;



    const formatLargeVal = (num: number) => {
        if (!num) return "-";
        return (num / 10000000).toFixed(0) + "Cr";
    };

    return (
        <div className={`fixed inset-x-0 bottom-0 z-[110] bg-background border-t-2 border-border-primary shadow-2xl transition-all duration-300 ease-in-out flex flex-col
            ${isExpanded ? 'h-full top-0' : 'h-[500px]'}
        `}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-surface border-b border-border-secondary">
                <div className="flex items-center gap-4">
                    {/* Logo */}
                    {data?.logoUrl ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white p-1 flex items-center justify-center shadow-md">
                            <img src={data.logoUrl} alt={data.name} className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                            {data?.shortName?.substring(0, 1) || (selectedStock ? selectedStock[0] : '')}
                        </div>
                    )}

                    <div>
                        <h2 className="text-xl font-bold text-text-primary leading-tight">{data?.name || selectedStock}</h2>
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                            <span className="font-mono bg-card px-1.5 rounded text-xs border border-border-primary">{selectedStock}</span>
                            {data?.sector && <span>• {data.sector}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {data && (
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <div className={`text-2xl font-mono font-bold ${data.price.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {data.price.current.toFixed(2)}
                                </div>
                                <div className={`text-sm font-mono flex items-center justify-end gap-1 ${data.price.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {data.price.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {Math.abs(data.price.change).toFixed(2)} ({Math.abs(data.price.changePercent).toFixed(2)}%)
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setTicker(selectedStock!);
                                    setIsAnalysisMode(true);
                                    setIsOptionChainMode(false);
                                    setIsExpanded(true);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg ${isAnalysisMode
                                    ? 'bg-emerald-600 text-white shadow-emerald-900/20'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                            >
                                {isAnalysisMode ? <Layout size={16} /> : <BarChart2 size={16} />}
                                {isAnalysisMode ? 'Analysis View' : 'Analysis View'}
                            </button>

                            <button
                                onClick={() => {
                                    setTicker(selectedStock!);
                                    setIsAnalysisMode(false);
                                    setIsOptionChainMode(true);
                                    setIsExpanded(true);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg ${isOptionChainMode
                                    ? 'bg-amber-600 text-white shadow-amber-900/20'
                                    : 'bg-card hover:bg-background text-text-secondary border border-border-primary'}`}
                            >
                                <Layout size={16} />
                                Option Chain
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
                        {/* Quick Ticker Switch */}
                        <div className="relative group mr-2">
                            <input
                                type="text"
                                value={inputTicker}
                                onChange={(e) => {
                                    setInputTicker(e.target.value.toUpperCase());
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && inputTicker.trim()) {
                                        const newTicker = inputTicker.trim();
                                        setSelectedStock(newTicker);
                                        setTicker(newTicker);
                                        setInputTicker('');
                                        setShowSuggestions(false);
                                    }
                                }}
                                placeholder="Another Ticker..."
                                className="bg-background border border-border-primary text-text-primary text-xs rounded-full py-1.5 pl-3 pr-8 w-32 focus:w-40 transition-all focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-text-muted"
                            />
                            <button
                                onClick={() => {
                                    if (inputTicker.trim()) {
                                        const newTicker = inputTicker.trim();
                                        setSelectedStock(newTicker);
                                        setTicker(newTicker);
                                        setInputTicker('');
                                        setShowSuggestions(false);
                                    }
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-indigo-400"
                            >
                                {inputTicker ? <ArrowRight size={14} /> : <Search size={14} />}
                            </button>

                            {/* Dropdown Suggestions */}
                            {showSuggestions && inputTicker && filteredSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 mt-1 bg-card border border-border-primary rounded-lg shadow-xl max-h-60 overflow-y-auto w-64 z-[120]">
                                    {filteredSuggestions.map((stock) => (
                                        <div
                                            key={stock.symbol}
                                            className="px-3 py-2 hover:bg-surface cursor-pointer border-b border-border-secondary last:border-0"
                                            onClick={() => {
                                                setSelectedStock(stock.symbol);
                                                setTicker(stock.symbol);
                                                setInputTicker('');
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-text-primary text-xs">{stock.symbol}</span>
                                                <span className="text-[10px] text-text-muted truncate max-w-[100px]">{stock.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={() => {
                            if (isAnalysisMode) setIsAnalysisMode(false);
                            if (isOptionChainMode) setIsOptionChainMode(false);
                            setIsExpanded(!isExpanded);
                        }} className="p-2 hover:bg-surface rounded-full text-text-secondary transition-colors">
                            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                        </button>
                        <button onClick={() => setSelectedStock(null)} className="p-2 hover:bg-rose-900/50 hover:text-rose-400 rounded-full text-text-secondary transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0 bg-background">
                {isAnalysisMode && (
                    <div className="h-[85%] border-b border-border-secondary relative z-0 shrink-0">
                        <ChartComponent ticker={selectedStock} />
                    </div>
                )}

                {isOptionChainMode && (
                    <div className="h-[85%] border-b border-border-secondary relative z-0 shrink-0">
                        <OptionChain symbol={selectedStock} />
                    </div>
                )}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <RefreshCw className="animate-spin text-emerald-500" size={40} />
                        </div>
                    ) : error ? (
                        <div className="flex h-full items-center justify-center flex-col gap-2">
                            <span className="text-rose-400 font-bold">{error}</span>
                            <button onClick={() => setSelectedStock(null)} className="text-text-muted underline hover:text-text-primary transition-colors">Close</button>
                        </div>
                    ) : data ? (
                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Column 1: Overview & Price */}
                            <div className="space-y-6">
                                <div className="bg-surface/50 rounded-xl p-5 border border-border-secondary/50">
                                    <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <BarChart2 size={16} /> Price Performance
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-background/80 p-3 rounded border border-border-primary/50">
                                            <span className="block text-xs text-text-muted mb-1">Today's High</span>
                                            <span className="font-mono text-emerald-500 font-bold">{data.price.high.toFixed(2)}</span>
                                        </div>
                                        <div className="bg-background/80 p-3 rounded border border-border-primary/50">
                                            <span className="block text-xs text-text-muted mb-1">Today's Low</span>
                                            <span className="font-mono text-rose-500 font-bold">{data.price.low.toFixed(2)}</span>
                                        </div>
                                        <div className="bg-background/80 p-3 rounded border border-border-primary/50">
                                            <span className="block text-xs text-text-muted mb-1">52W High</span>
                                            <span className="font-mono text-emerald-500 font-bold">{data.price.fiftyTwoWeekHigh.toFixed(2)}</span>
                                        </div>
                                        <div className="bg-background/80 p-3 rounded border border-border-primary/50">
                                            <span className="block text-xs text-text-muted mb-1">52W Low</span>
                                            <span className="font-mono text-rose-500 font-bold">{data.price.fiftyTwoWeekLow.toFixed(2)}</span>
                                        </div>
                                        <div className="bg-background/80 p-3 rounded border border-border-primary/50">
                                            <span className="block text-xs text-text-muted mb-1">Open</span>
                                            <span className="font-mono text-text-secondary">{data.price.open.toFixed(2)}</span>
                                        </div>
                                        <div className="bg-background/80 p-3 rounded border border-border-primary/50">
                                            <span className="block text-xs text-text-muted mb-1">Prev. Close</span>
                                            <span className="font-mono text-text-secondary">{data.price.prevClose.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-surface/50 rounded-xl p-5 border border-border-secondary/50">
                                    <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <Award size={16} /> Valuation & Ratios
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center border-b border-border-secondary/50 pb-2">
                                            <span className="text-sm text-text-muted">Market Cap</span>
                                            <span className="font-mono text-text-primary font-bold">{formatLargeVal(data.valuation.marketCap)}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-border-secondary/50 pb-2">
                                            <span className="text-sm text-text-muted">P/E Ratio</span>
                                            <span className="font-mono text-text-primary font-bold">{data.valuation.trailingPE?.toFixed(2) || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-border-secondary/50 pb-2">
                                            <span className="text-sm text-text-muted">P/B Ratio</span>
                                            <span className="font-mono text-text-primary font-bold">{data.valuation.priceToBook?.toFixed(2) || '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-border-secondary/50 pb-2">
                                            <span className="text-sm text-text-muted">Div. Yield</span>
                                            <span className="font-mono text-emerald-500 font-bold">{data.valuation.dividendYield?.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-border-secondary/50 pb-2">
                                            <span className="text-sm text-text-muted">Beta</span>
                                            <span className="font-mono text-text-primary font-bold">{data.valuation.beta?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Profile & About */}
                            <div className="space-y-6">
                                <div className="bg-surface/50 rounded-xl p-5 border border-border-secondary/50 h-full">
                                    <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider flex items-center gap-2">
                                        <Globe size={16} /> Company Profile
                                    </h3>
                                    <p className="text-sm text-text-secondary leading-relaxed max-h-[250px] overflow-y-auto mb-4 pr-2 custom-scrollbar">
                                        {data.description}
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div>
                                            <span className="block text-xs text-text-muted">Industry</span>
                                            <span className="text-sm text-text-primary font-bold">{data.industry}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs text-text-muted">Employees</span>
                                            <span className="text-sm text-text-primary font-bold">{data.employees?.toLocaleString() || 'N/A'}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="block text-xs text-text-muted">Website</span>
                                            <a href={data.website} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-500 hover:underline flex items-center gap-1 font-bold">
                                                {data.website} <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 3: Stats & Financials */}
                            <div className="space-y-6">
                                <div className="bg-surface/50 rounded-xl p-5 border border-border-secondary/50">
                                    <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider flex items-center gap-2">
                                        Financial Health
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-text-muted">Revenue (TTM)</span>
                                                <span className="text-text-primary font-bold">{formatLargeVal(data.financials.revenue)}</span>
                                            </div>
                                            <div className="w-full bg-card/50 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-blue-500 h-full w-[80%] rounded-full opacity-80"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-text-muted">Net Income</span>
                                                <span className="text-text-primary font-bold">{formatLargeVal(data.financials.netIncome)}</span>
                                            </div>
                                            <div className="w-full bg-card/50 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full w-[40%] rounded-full opacity-80"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-text-muted">Profit Margin</span>
                                                <span className="text-emerald-500 font-bold">{data.financials.profitMargin?.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-text-muted">Return on Equity (ROE)</span>
                                                <span className="text-emerald-500 font-bold">{data.financials.roe?.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-surface/50 rounded-xl p-5 border border-border-secondary/50">
                                    <h3 className="text-sm font-semibold text-text-muted mb-4 uppercase tracking-wider flex items-center gap-2">
                                        Shareholding
                                    </h3>
                                    <div className="flex gap-4">
                                        <div className="flex-1 text-center bg-background/50 p-3 rounded border border-border-primary/40">
                                            <span className="block text-2xl font-bold text-text-secondary">{data.shareholding.insiders?.toFixed(1)}%</span>
                                            <span className="text-xs text-text-muted">Insiders</span>
                                        </div>
                                        <div className="flex-1 text-center bg-background/50 p-3 rounded border border-border-primary/40">
                                            <span className="block text-2xl font-bold text-text-secondary">{data.shareholding.institutions?.toFixed(1)}%</span>
                                            <span className="text-xs text-text-muted">Institutions</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default StockDetailPanel;
