import React, { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, Activity, BarChart3, ChevronLeft, Globe, Cpu } from 'lucide-react';
import ComparisonChart from './ComparisonChart';
import TickerSearch from './TickerSearch';
import axios from 'axios';

interface CompareModalProps {
    stocks: string[];
    onRemove: (symbol: string) => void;
    onUpdateStock: (oldTicker: string, newTicker: string) => void;
    onClose: () => void;
}

interface StockData {
    symbol: string;
    quote?: any;
    analysis?: any;
    loading: boolean;
    error?: string;
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

const MetricBox = ({ label, value, subtext }: { label: string; value: string | undefined; subtext?: string }) => (
    <div className="p-3 bg-surface rounded-lg border border-border-primary/60 shadow-sm">
        <div className="text-[10px] text-text-muted uppercase font-bold mb-0.5 tracking-wider">{label}</div>
        <div className="text-sm font-bold text-text-primary truncate">{value || 'N/A'}</div>
        {subtext && <div className="text-[10px] text-text-muted mt-0.5 opacity-60 italic">{subtext}</div>}
    </div>
);

const TrendBox = ({ label, bullish, value, subtext }: { label: string; bullish: boolean; value: string; subtext?: string }) => (
    <div className={`p-3 rounded-lg border transition-all duration-300 ${bullish ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
        <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight">{label}</span>
            {bullish ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
        </div>
        <div className={`text-sm font-black ${bullish ? 'text-emerald-500' : 'text-rose-500'}`}>{value}</div>
        {subtext && <div className="text-[10px] text-text-muted opacity-60 mt-0.5 font-medium">{subtext}</div>}
    </div>
);

const SmaRow = ({ label, value, price }: { label: string; value: number; price: number }) => {
    if (!value) return null;
    const isBullish = price > value;
    return (
        <tr className="hover:bg-surface/40 transition-colors border-b border-border-primary/20 last:border-0">
            <td className="px-4 py-2.5 font-semibold text-text-secondary text-xs">{label}</td>
            <td className="px-4 py-2.5 text-text-primary font-mono text-xs">₹{value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
            <td className="px-4 py-2.5 text-right">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black tracking-tighter ${isBullish ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
                    {isBullish ? 'BULLISH' : 'BEARISH'}
                </span>
            </td>
        </tr>
    );
};

// Section heading
const SectionHead = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-4 bg-indigo-500/50 rounded-full" />
        <Icon size={12} className="text-indigo-500" />
        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest">{title}</h4>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const CompareModal: React.FC<CompareModalProps> = ({ stocks, onRemove, onUpdateStock, onClose }) => {
    const [data, setData] = useState<Record<string, StockData>>({});

    useEffect(() => {
        const fetchStockData = async (symbol: string) => {
            if (data[symbol] && !data[symbol].loading) return;
            setData(prev => ({ ...prev, [symbol]: { symbol, loading: true } }));
            try {
                const [quoteRes, analyzeRes] = await Promise.all([
                    axios.get(`http://127.0.0.1:8000/api/v1/analyze/${encodeURIComponent(symbol)}/quote`).catch(() =>
                        axios.get(`http://127.0.0.1:8000/api/v1/quote/${encodeURIComponent(symbol)}`).catch(() => null)
                    ),
                    axios.get(`http://127.0.0.1:8000/api/v1/analyze/${encodeURIComponent(symbol)}?interval=1d`).catch(() => null),
                ]);
                setData(prev => ({
                    ...prev,
                    [symbol]: { symbol, quote: quoteRes?.data, analysis: analyzeRes?.data, loading: false },
                }));
            } catch (err) {
                setData(prev => ({ ...prev, [symbol]: { symbol, loading: false, error: 'Failed to load data' } }));
            }
        };
        stocks.forEach(s => { if (!data[s]) fetchStockData(s); });
    }, [stocks]);

    const fmt = (val: number) => {
        if (!val) return 'N/A';
        if (val >= 1e12) return `₹${(val / 1e12).toFixed(2)} T`;
        if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
        if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
        return `₹${val.toLocaleString()}`;
    };

    const fmtVol = (val: number) => {
        if (!val) return 'N/A';
        if (val >= 1e7) return `${(val / 1e7).toFixed(2)} Cr`;
        if (val >= 1e5) return `${(val / 1e5).toFixed(2)} L`;
        if (val >= 1e3) return `${(val / 1e3).toFixed(2)} K`;
        return val.toLocaleString();
    };

    const trendColor = (val: number) => val > 0 ? 'text-emerald-500 dark:text-emerald-400' : val < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-text-muted';
    const rsiColor = (rsi: number) => rsi > 70 ? 'text-rose-500 dark:text-rose-400' : rsi < 30 ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400';

    if (stocks.length === 0) return null;
    const gridCols = stocks.length === 1 ? 'grid-cols-1' : stocks.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
    const COL_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#a855f7'];

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background animate-in fade-in duration-300">
            <div className="relative w-full h-full overflow-hidden flex flex-col bg-background">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary shrink-0 bg-surface/80 backdrop-blur-xl z-[2010]">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface/80 text-text-secondary hover:text-text-primary transition-all border border-border-primary group shadow-sm"
                        >
                            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-widest">Back to Sunburst</span>
                        </button>
                        <div className="h-8 w-px bg-border-primary/50" />
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                <BarChart3 className="text-indigo-500" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-text-primary tracking-tight leading-none">Market Intelligence</h1>
                                <p className="text-[10px] text-text-muted mt-1 uppercase font-bold tracking-widest opacity-60">Comparative Deep-Dive • {stocks.length} Assets</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">

                    {/* Chart Section */}
                    {stocks.length >= 1 && (
                        <div className="shrink-0 p-6 border-b border-border-primary bg-surface/20">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                    <TrendingUp size={16} className="text-indigo-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Global Market Correlation</h3>
                                    <p className="text-[10px] text-text-muted font-bold opacity-60">Comparative Price Action &amp; Dynamics</p>
                                </div>
                            </div>
                            <ComparisonChart
                                dataMap={stocks.reduce((acc, sym) => {
                                    if (data[sym]?.analysis?.data) acc[sym] = data[sym].analysis.data;
                                    return acc;
                                }, {} as Record<string, any[]>)}
                            />
                        </div>
                    )}

                    {/* Per-stock columns */}
                    <div className={`grid ${gridCols} divide-x divide-border-primary/40`}>
                        {stocks.map((symbol, idx) => {
                            const stock = data[symbol] || { loading: true };
                            // Quote can be nested under .data or directly on the object
                            const q = stock.quote?.data ?? stock.quote ?? {};
                            const analysis = stock.analysis || {};
                            const lastCandle = analysis.data?.length > 0 ? analysis.data[analysis.data.length - 1] : null;

                            return (
                                <div key={symbol} className="flex flex-col min-w-[380px] bg-background">

                                    {/* ── Column Header ── */}
                                    <div className="p-5 border-b border-border-primary bg-surface sticky top-0 z-10 backdrop-blur-xl">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                {stock.loading ? (
                                                    <div className="space-y-2">
                                                        <div className="h-6 w-24 animate-pulse bg-surface/80 rounded-lg" />
                                                        <div className="h-3 w-32 animate-pulse bg-surface/60 rounded-lg" />
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-3 mb-1.5">
                                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COL_COLORS[idx % 4] }} />
                                                            <h3 className="text-2xl font-black text-text-primary tracking-tighter leading-none">{symbol}</h3>
                                                            {q.changePercent !== undefined && (
                                                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tighter border ${q.changePercent > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : q.changePercent < 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-surface border-border-primary text-text-muted'}`}>
                                                                    {q.changePercent > 0 ? '+' : ''}{q.changePercent?.toFixed(2)}%
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-text-muted font-black uppercase tracking-widest truncate pr-4 opacity-70" title={q.name}>{q.name || symbol}</p>
                                                        {q.sector && q.sector !== 'N/A' && <p className="text-[9px] text-indigo-500/80 font-bold uppercase tracking-widest mt-0.5">{q.sector} · {q.industry}</p>}
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <TickerSearch
                                                    initialValue=""
                                                    onSelect={(newSymbol) => onUpdateStock(symbol, newSymbol)}
                                                    compact={true}
                                                    placeholder="Replace"
                                                    className="w-28 text-[11px] h-8 bg-surface border-border-primary/60 focus:border-indigo-500/50 rounded-xl"
                                                />
                                                <button
                                                    onClick={() => onRemove(symbol)}
                                                    className="p-2 rounded-xl bg-surface hover:bg-rose-500/10 text-text-muted hover:text-rose-500 transition-all border border-border-primary/60"
                                                    title="Remove Asset"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── Price Overview ── */}
                                    <div className="p-6 bg-surface/30 border-b border-border-primary/40">
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="text-4xl font-black text-text-primary tracking-tighter font-mono leading-none">
                                                {q.ltp ? `₹${q.ltp?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                                            </div>
                                            {q.change !== undefined && (
                                                <>
                                                    <div className="h-8 w-px bg-border-primary/40" />
                                                    <div className="flex flex-col">
                                                        <div className={`text-xs font-black ${trendColor(q.change)}`}>
                                                            {q.change > 0 ? '+' : ''}{q.change?.toFixed(2)}
                                                        </div>
                                                        <div className="text-[9px] text-text-muted font-bold uppercase tracking-tighter">Day Change</div>
                                                    </div>
                                                </>
                                            )}
                                            {q.prevClose && (
                                                <>
                                                    <div className="h-8 w-px bg-border-primary/40" />
                                                    <div className="flex flex-col">
                                                        <div className="text-xs font-bold text-text-primary font-mono">₹{q.prevClose?.toFixed(2)}</div>
                                                        <div className="text-[9px] text-text-muted font-bold uppercase tracking-tighter">Prev Close</div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Fundamental Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <MetricBox label="Market Cap" value={fmt(q.marketCap)} />
                                            <MetricBox label="P/E Ratio" value={q.peRatio && q.peRatio > 0 ? q.peRatio?.toFixed(2) : undefined} subtext="Trailing 12M" />
                                            <MetricBox label="Forward P/E" value={q.forwardPE && q.forwardPE > 0 ? q.forwardPE?.toFixed(2) : undefined} />
                                            <MetricBox label="P/B Ratio" value={q.priceToBook && q.priceToBook > 0 ? q.priceToBook?.toFixed(2) : undefined} />
                                            <MetricBox label="EPS (TTM)" value={q.eps && q.eps !== 0 ? `₹${q.eps?.toFixed(2)}` : undefined} />
                                            <MetricBox label="Beta" value={q.beta && q.beta !== 0 ? q.beta?.toFixed(2) : undefined} subtext="Market Sensitivity" />
                                            <MetricBox label="Dividend Yield" value={q.dividendYield ? `${q.dividendYield?.toFixed(2)}%` : '0%'} />
                                            <MetricBox label="Employees" value={q.employees ? q.employees.toLocaleString() : undefined} />
                                        </div>

                                        {/* 52W Range */}
                                        {(q.fiftyTwoWeekHigh || q.fiftyTwoWeekLow) && (
                                            <div className="mt-3 p-3 bg-surface rounded-lg border border-border-primary/60">
                                                <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">52-Week Range</div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono text-rose-500 dark:text-rose-400">₹{q.fiftyTwoWeekLow?.toFixed(0)}</span>
                                                    <div className="flex-1 h-1.5 bg-border-primary/40 rounded-full relative overflow-hidden">
                                                        {q.ltp && q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && (
                                                            <div
                                                                className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full"
                                                                style={{ width: `${Math.min(100, Math.max(0, ((q.ltp - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow)) * 100))}%` }}
                                                            />
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-mono text-emerald-500 dark:text-emerald-400">₹{q.fiftyTwoWeekHigh?.toFixed(0)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Volume */}
                                        {(q.volume || q.averageVolume) && (
                                            <div className="mt-2 grid grid-cols-2 gap-2.5">
                                                <MetricBox label="Today Volume" value={fmtVol(q.volume)} />
                                                <MetricBox label="Avg Volume" value={fmtVol(q.averageVolume)} />
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Technical Analytics ── */}
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-background">
                                        {lastCandle ? (
                                            <>
                                                {/* RSI */}
                                                <section>
                                                    <SectionHead icon={Activity} title="Momentum Sentiment" />
                                                    <div className="bg-surface p-4 rounded-2xl border border-border-primary/60 shadow-sm mb-3">
                                                        <div className="flex justify-between items-end mb-3">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">RSI (14)</span>
                                                                <span className={`text-2xl font-black ${rsiColor(lastCandle.rsi)} tracking-tighter`}>{lastCandle.rsi?.toFixed(1)}</span>
                                                            </div>
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${rsiColor(lastCandle.rsi)} ${lastCandle.rsi > 70 ? 'bg-rose-500/10 border-rose-500/20' : lastCandle.rsi < 30 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                                                                {lastCandle.rsi > 70 ? 'OVERBOUGHT' : lastCandle.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL'}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-border-primary/30 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ${lastCandle.rsi > 70 ? 'bg-rose-500' : lastCandle.rsi < 30 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                                style={{ width: `${Math.min(100, Math.max(0, lastCandle.rsi))}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <TrendBox
                                                            label="MACD Histogram"
                                                            bullish={lastCandle.MACDh_12_26_9 > 0}
                                                            value={lastCandle.MACDh_12_26_9?.toFixed(2)}
                                                            subtext={lastCandle.MACDh_12_26_9 > 0 ? 'Momentum Up' : 'Momentum Down'}
                                                        />
                                                        <TrendBox
                                                            label="vs SMA200"
                                                            bullish={lastCandle.close > lastCandle.sma200}
                                                            value={lastCandle.sma200 > 0 ? ((lastCandle.close - lastCandle.sma200) / lastCandle.sma200 * 100).toFixed(1) + '%' : 'N/A'}
                                                            subtext="Long-Term Trend"
                                                        />
                                                        <TrendBox
                                                            label="vs VWAP"
                                                            bullish={lastCandle.close >= lastCandle.vwap}
                                                            value={lastCandle.vwap > 0 ? `₹${lastCandle.vwap?.toFixed(1)}` : 'N/A'}
                                                            subtext={lastCandle.close >= lastCandle.vwap ? 'Above VWAP' : 'Below VWAP'}
                                                        />
                                                        <TrendBox
                                                            label="vs SMA50"
                                                            bullish={lastCandle.close > lastCandle.sma50}
                                                            value={lastCandle.sma50 > 0 ? ((lastCandle.close - lastCandle.sma50) / lastCandle.sma50 * 100).toFixed(1) + '%' : 'N/A'}
                                                            subtext="Mid-Term Trend"
                                                        />
                                                    </div>
                                                </section>

                                                {/* Moving Averages Table */}
                                                <section className="bg-surface rounded-2xl border border-border-primary/60 overflow-hidden shadow-sm">
                                                    <div className="p-4 border-b border-border-primary/40 bg-surface/80 flex items-center gap-2">
                                                        <Cpu size={14} className="text-indigo-500" />
                                                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Moving Averages</h4>
                                                    </div>
                                                    <table className="w-full">
                                                        <tbody>
                                                            <SmaRow label="SMA 20 (Short)" value={lastCandle.sma20} price={lastCandle.close} />
                                                            <SmaRow label="SMA 50 (Mid)" value={lastCandle.sma50} price={lastCandle.close} />
                                                            <SmaRow label="SMA 200 (Long)" value={lastCandle.sma200} price={lastCandle.close} />
                                                        </tbody>
                                                    </table>
                                                    <div className="border-t border-border-primary/40">
                                                        <table className="w-full">
                                                            <tbody>
                                                                <tr className="hover:bg-surface/40 border-b border-border-primary/20">
                                                                    <td className="px-4 py-2.5 font-semibold text-text-secondary text-xs">VWAP (Period)</td>
                                                                    <td className="px-4 py-2.5 text-text-primary font-mono text-xs">₹{lastCandle.vwap?.toFixed(1) || 'N/A'}</td>
                                                                    <td className="px-4 py-2.5 text-right">
                                                                        {lastCandle.vwap > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${lastCandle.close >= lastCandle.vwap ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'}`}>{lastCandle.close >= lastCandle.vwap ? 'ABOVE' : 'BELOW'}</span>}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </section>

                                                {/* Company Brief */}
                                                {q.description && q.description !== 'No description available.' && (
                                                    <section>
                                                        <SectionHead icon={Globe} title="Company Brief" />
                                                        <p className="text-xs text-text-secondary leading-relaxed bg-surface p-4 rounded-xl border border-border-primary/60 line-clamp-5">{q.description}</p>
                                                    </section>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border-primary/30 rounded-3xl text-center p-8">
                                                <Activity className="text-text-muted opacity-20 mb-4 animate-pulse" size={48} />
                                                <h5 className="text-text-muted font-bold text-sm tracking-tight">Signal Analysis Loading</h5>
                                                <p className="text-[10px] text-text-muted opacity-60 mt-2 leading-relaxed">Fetching technical indicators from market data engine…</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompareModal;
