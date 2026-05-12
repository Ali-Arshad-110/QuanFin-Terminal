
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useMarketStore } from '../store';
import { useWebSocket } from '../contexts/WebSocketContext';

// Categorized Commodities List (MCX Futures)
const COMMODITY_CATEGORIES = {
    "Bullion": [
        'GOLD', 'GOLDM', 'GOLDPETAL', 'GOLDGUINEA',
        'SILVER', 'SILVERM', 'SILVERMIC'
    ],
    "Base Metals": [
        'ALUMINIUM', 'ALUMINIUMM',
        'COPPER',
        'LEAD', 'LEADM',
        'ZINC', 'ZINCM'
    ],
    "Energy": [
        'CRUDEOIL',
        'CRUDEOILM',
        'NATURALGAS', 'NATGASMINI'
    ],
    "Agri Commodities": [
        'MENTHAOIL', 'COTTON', 'CPO'
    ]
};

const CommodityWatchlist: React.FC = () => {
    const { ticker, setTicker } = useMarketStore();
    const { subscribe, lastMessage, isConnected } = useWebSocket();

    // Flatten list for fetching
    const allCommodities = Object.values(COMMODITY_CATEGORIES).flat();

    const [quotes, setQuotes] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);

    // Expanded state for categories - default all open
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        "Bullion": true,
        "Base Metals": true,
        "Energy": true,
        "Agri Commodities": true
    });

    const toggleCategory = (cat: string) => {
        setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    // Initial Fetch (REST)
    useEffect(() => {
        const fetchQuotes = async () => {
            setLoading(true);
            try {
                // Backend now supports mcx_fo|SYMBOL automatically via get_quotes
                const res = await fetch('http://localhost:8000/api/v1/quotes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbols: allCommodities })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.data) {
                        setQuotes(prev => ({ ...prev, ...data.data }));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch commodity quotes", e);
            } finally {
                setLoading(false);
            }

            // Subscribe via WS
            subscribe(allCommodities);
        };

        fetchQuotes();
    }, [isConnected]); // Run on mount and when connection opens

    // Set Default Ticker
    useEffect(() => {
        if (!ticker && allCommodities.length > 0) {
            setTicker(allCommodities[0]);
        }
    }, [ticker, setTicker]);

    // Live Updates — new format: {token, symbol, ltp, change, changePercent, ts}
    useEffect(() => {
        if (!lastMessage || lastMessage.type === 'heartbeat') return;
        const update = lastMessage;
        const sym = update.symbol || update.s;
        if (!sym) return;

        setQuotes(prev => {
            if (!prev[sym]) return prev;
            return {
                ...prev,
                [sym]: {
                    ...prev[sym],
                    price: update.ltp || prev[sym].price,
                    ltp: update.ltp || prev[sym].ltp,
                    change: update.change !== undefined ? update.change : prev[sym].change,
                    changePercent: update.changePercent !== undefined ? update.changePercent : prev[sym].changePercent
                }
            };
        });
    }, [lastMessage]);

    return (
        <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-200 text-sm">Commodities (MCX)</h3>
                <button onClick={() => { }} className="text-slate-400 hover:text-white"><RefreshCw size={14} /></button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading && Object.keys(quotes).length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">Loading commodities...</div>
                )}

                {Object.entries(COMMODITY_CATEGORIES).map(([category, items]) => (
                    <div key={category} className="border-b border-slate-800/50">
                        {/* Category Header */}
                        <div
                            className="bg-slate-900/50 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                            onClick={() => toggleCategory(category)}
                        >
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Layers size={12} className="text-slate-500" />
                                {category}
                            </span>
                            {expanded[category] ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                        </div>

                        {/* Items */}
                        {expanded[category] && (
                            <div>
                                {items.map(sym => {
                                    const data = quotes[sym] || {};
                                    const price = data.price || data.ltp || 0;
                                    const change = data.change || 0;
                                    const changePercent = data.changePercent || 0;
                                    const isPositive = change >= 0;
                                    const isSelected = ticker === sym;

                                    return (
                                        <div
                                            key={sym}
                                            onClick={() => setTicker(sym)}
                                            className={`px-4 py-2 border-b border-slate-800/50 cursor-pointer hover:bg-slate-900 transition-colors flex justify-between items-center group
                                                ${isSelected ? 'bg-slate-900 border-l-2 border-l-emerald-500' : 'border-l-2 border-l-transparent'}
                                            `}
                                        >
                                            <div>
                                                <div className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-300'}`}>{sym}</div>
                                                <div className="text-[9px] text-slate-500">MCX FUT</div>
                                            </div>

                                            <div className="text-right">
                                                <div className={`font-mono text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {price ? price.toFixed(2) : '...'}
                                                </div>
                                                <div className={`text-[9px] flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {change !== 0 && (isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
                                                    {change ? Math.abs(change).toFixed(2) : '-'} ({changePercent ? Math.abs(changePercent).toFixed(2) : '-'}%)
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommodityWatchlist;
