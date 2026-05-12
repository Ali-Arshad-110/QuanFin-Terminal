import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Trash2, ChevronDown, List } from 'lucide-react';
import { useMarketStore } from '../store';
import { useWebSocket } from '../contexts/WebSocketContext';
import { stockUniverse } from '../data/stockUniverse';
import StockLogo from './StockLogo';

interface Watchlist {
    id: string;
    name: string;
    symbols: string[];
}

const DEFAULT_WATCHLIST: Watchlist = {
    id: 'default',
    name: 'My Watchlist',
    symbols: ['RELIANCE', 'BEL', 'HDFCBANK', 'AXISBANK', 'SBIN', 'ONGC', 'ICICIBANK', 'HINDZINC']
};

// Helper to format volume

// Helper to generate mock data for the UI design
// Helper to format volume
const formatVol = (num: number) => {
    if (!num) return '0';
    if (num > 10000000) return (num / 10000000).toFixed(2) + ' Cr';
    if (num > 100000) return (num / 100000).toFixed(2) + ' L';
    return num.toLocaleString('en-IN');
};

const WatchlistComponent: React.FC = () => {
    const { ticker, setTicker } = useMarketStore();
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [activeListId, setActiveListId] = useState<string>('default');
    const [isCreating, setIsCreating] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showListMenu, setShowListMenu] = useState(false);

    // WebSocket Integration
    const { subscribe, lastMessage, isConnected } = useWebSocket();
    // Live Quotes State
    const [quotes, setQuotes] = useState<Record<string, any>>({});

    const activeList = watchlists.find(w => w.id === activeListId) || watchlists[0];

    // Initial Fetch (REST) + Subscription
    useEffect(() => {
        if (!activeList || activeList.symbols.length === 0) return;

        const fetchQuotes = async () => {
            // 1. Initial Snapshot via REST (for open/high/low etc)
            try {
                const res = await fetch('http://localhost:8000/api/v1/quotes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ symbols: activeList.symbols })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && data.data) {
                        setQuotes(prev => ({ ...prev, ...data.data }));
                    } else if (!data.status) {
                        // Fallback handling if backend format differs
                        setQuotes(prev => ({ ...prev, ...data }));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch initial quotes", e);
            }
            // 2. Subscribe to WS updates
            subscribe(activeList.symbols);
        };

        fetchQuotes();
    }, [activeList?.symbols, activeListId, subscribe, isConnected]);

    // Handle Live WS Updates
    useEffect(() => {
        if (!lastMessage) return;
        // lastMessage is likely a candle dict: { s: symbol, c: close, ... }
        // or a tick? "market_data_stream" broadcasts candle updates via CandleBuilder.
        // Candle format: { s: symbol, c: close, v: volume, ... }

        const update = lastMessage;
        if (update.s) {
            setQuotes(prev => {
                const old = prev[update.s] || {};
                // Merge update
                return {
                    ...prev,
                    [update.s]: {
                        ...old,
                        ltp: update.c, // Close is current price
                        // Calculate new change if we have previous close (old.close or implied)
                        // For now just update ltp/volume
                        volume: update.v,
                        // We might need 'open' or 'prev_close' to calc change % live. 
                        // If backend sends it, great. If not, we rely on initial snapshot.
                        change: (old.close || old.open) ? (update.c - (old.prev_close || old.open)) : old.change,
                        changePercent: (old.close || old.open) ? ((update.c - (old.prev_close || old.open)) / (old.prev_close || old.open) * 100) : old.changePercent
                    }
                };
            });
        }
    }, [lastMessage]);

    // Create a map for fast lookup of names by symbol
    const stockMap = useMemo(() => {
        return stockUniverse.reduce((acc, stock) => {
            acc[stock.symbol] = stock.name;
            return acc;
        }, {} as Record<string, string>);
    }, []);

    // Initial Load
    useEffect(() => {
        const saved = localStorage.getItem('quanfin_watchlists');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.length > 0) {
                    setWatchlists(parsed);
                    setActiveListId(parsed[0].id);
                    return;
                }
            } catch (e) {
                console.error("Failed to parse watchlists", e);
            }
        }
        setWatchlists([DEFAULT_WATCHLIST]);
    }, []);

    // Save on Change
    useEffect(() => {
        if (watchlists.length > 0) {
            localStorage.setItem('quanfin_watchlists', JSON.stringify(watchlists));
        }
    }, [watchlists]);



    const handleCreateList = () => {
        if (!newListName.trim()) return;
        const newList: Watchlist = {
            id: Date.now().toString(),
            name: newListName,
            symbols: []
        };
        setWatchlists([...watchlists, newList]);
        setActiveListId(newList.id);
        setNewListName('');
        setIsCreating(false);
    };

    const handleDeleteList = (id: string) => {
        if (watchlists.length <= 1) return;
        const newLists = watchlists.filter(w => w.id !== id);
        setWatchlists(newLists);
        if (activeListId === id) {
            setActiveListId(newLists[0].id);
        }
    };

    const handleAddSymbol = (symbol: string) => {
        if (activeList.symbols.includes(symbol)) return;
        const updatedLists = watchlists.map(w => {
            if (w.id === activeListId) {
                return { ...w, symbols: [symbol, ...w.symbols] };
            }
            return w;
        });
        setWatchlists(updatedLists);
        setSearchQuery('');
    };

    const handleRemoveSymbol = (e: React.MouseEvent, symbol: string) => {
        e.stopPropagation();
        const updatedLists = watchlists.map(w => {
            if (w.id === activeListId) {
                return { ...w, symbols: w.symbols.filter(s => s !== symbol) };
            }
            return w;
        });
        setWatchlists(updatedLists);
    };

    // Search Logic with Backend API
    const [suggestions, setSuggestions] = useState<{ symbol: string; name: string }[]>([]);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.length < 2) {
                setSuggestions([]);
                return;
            }

            try {
                const res = await fetch(`http://localhost:8000/api/v1/search?q=${searchQuery}&limit=5`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success') {
                        setSuggestions(data.data);
                    }
                }
            } catch (e) {
                console.error("Search failed", e);
            }
        }, 300); // Debounce 300ms

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    return (
        <div className="flex flex-col h-full bg-background rounded-xl border border-border-primary overflow-hidden font-sans transition-colors duration-300 shadow-sm">
            {/* Header */}
            <div className="p-3 bg-surface border-b border-border-secondary">
                <div className="flex justify-between items-center mb-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowListMenu(!showListMenu)}
                            className="flex items-center gap-2 text-[15px] font-semibold text-text-primary tracking-tight hover:text-text-secondary transition-colors"
                        >
                            <List size={18} className="text-text-primary" />
                            {activeList?.name === 'My Watchlist' ? 'My Watchlist' : activeList?.name}
                            <ChevronDown size={14} className={`text-text-muted transition-transform ${showListMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showListMenu && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-border-secondary rounded-lg shadow-xl z-50 py-1">
                                {watchlists.map(list => (
                                    <div
                                        key={list.id}
                                        className="flex justify-between items-center px-3 py-2 hover:bg-background cursor-pointer group"
                                        onClick={() => {
                                            setActiveListId(list.id);
                                            setShowListMenu(false);
                                        }}
                                    >
                                        <span className={`text-xs ${activeListId === list.id ? 'text-primary font-medium' : 'text-text-secondary'}`}>
                                            {list.name}
                                        </span>
                                        {watchlists.length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteList(list.id);
                                                }}
                                                className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <div className="border-t border-border-secondary/50 my-1"></div>
                                <button
                                    onClick={() => {
                                        setIsCreating(true);
                                        setShowListMenu(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs text-text-muted hover:text-text-primary hover:bg-card flex items-center gap-2"
                                >
                                    <Plus size={12} /> Create New List
                                </button>
                            </div>
                        )}
                    </div>

                    <Search size={16} className="text-text-muted cursor-pointer hover:text-text-primary transition-colors" />
                </div>

                {isCreating && (
                    <div className="flex gap-2 mb-2">
                        <input
                            autoFocus
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            placeholder="List Name..."
                            className="flex-1 bg-background border border-border-secondary text-text-primary rounded-lg px-2 py-1 text-[12px] focus:border-primary outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                        />
                        <button onClick={handleCreateList} className="bg-primary hover:bg-primary/90 text-white px-2 rounded-lg text-[10px] font-medium tracking-wide uppercase transition-colors">Add</button>
                        <button onClick={() => setIsCreating(false)} className="bg-background hover:bg-surface text-text-muted px-2 rounded-lg text-[10px] font-medium tracking-wide border border-border-secondary uppercase transition-colors">Esc</button>
                    </div>
                )}

                {/* Always show Search */}
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Add Symbol..."
                        className="w-full bg-background border border-border-secondary text-text-primary rounded-md px-3 py-1.5 text-[12px] focus:border-border-primary outline-none pl-8 placeholder:text-text-muted"
                    />
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-secondary rounded-md shadow-lg z-50 overflow-hidden">
                            {suggestions.map(s => (
                                <div key={s.symbol} onClick={() => handleAddSymbol(s.symbol)} className="px-3 py-2 hover:bg-background cursor-pointer border-b border-border-secondary/50 last:border-0 hover:text-text-primary text-text-secondary text-[11px] font-medium font-mono">
                                    {s.symbol}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr] gap-1 px-3 py-1.5 bg-background border-b border-border-secondary text-[10px] font-medium text-text-muted uppercase tracking-wide sticky top-0 z-10">
                <div className="text-left">SYBL</div>
                <div className="text-right">LTP</div>
                <div className="text-right">CHGE</div>
                <div className="text-right">CHGE%</div>
                <div className="text-right pr-2">VOL</div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
                {activeList?.symbols.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 text-xs">No stocks added.</div>
                ) : (
                    activeList?.symbols.map(symbol => {
                        const quote = quotes[symbol];
                        let data;

                        if (quote) {
                            // Real Data
                            // Helper for safe fixed
                            const safeIdx = (val: any) => (val !== undefined && val !== null && !isNaN(val)) ? Number(val).toFixed(2) : '-';

                            // Map response keys (backend returns 'ltp', 'change', 'changePercent', 'volume')
                            data = {
                                ltp: safeIdx(quote.ltp || quote.price),
                                change: (quote.change !== undefined && quote.change !== null && !isNaN(quote.change)) ? (quote.change > 0 ? '+' : '') + safeIdx(quote.change) : '-',
                                changePercent: safeIdx(quote.changePercent || quote.change_percent),
                                volume: formatVol(quote.volume),
                                isPositive: (quote.change || 0) >= 0
                            };
                        } else {
                            // Loading Placeholder
                            data = {
                                ltp: '...',
                                change: '...',
                                changePercent: '...',
                                volume: '...',
                                isPositive: true
                            };
                        }

                        // Override with selected stats if it matches? 
                        // Actually, marketAnalyzer stats might be fresher or same. Keep uniform source.
                        // if (isSelected && marketStats) { ... } -> Keeping simple for now to avoid flickering logic.

                        const name = stockMap[symbol] || symbol;
                        const isSelected = ticker === symbol;
                        const shortSymbol = symbol.length > 5 ? symbol.substring(0, 4) + '...' : symbol;

                        return (
                            <div
                                key={symbol}
                                onClick={() => setTicker(symbol)}
                                className={`grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr] gap-1 px-3 py-1.5 items-center cursor-pointer border-b border-border-secondary hover:bg-surface transition-colors group tabular-nums ${isSelected ? 'bg-surface' : ''}`}
                            >
                                {/* Symbol Column */}
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                                        <StockLogo symbol={symbol} name={name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className={`text-[12px] font-medium tracking-tight truncate ${isSelected ? 'text-text-primary' : 'text-text-primary'}`}>
                                        {shortSymbol}
                                    </span>
                                </div>

                                {/* Last Price */}
                                <div className={`text-right text-[12px] font-mono ${isSelected ? 'text-text-primary' : 'text-text-primary'}`}>
                                    {data.ltp}
                                </div>

                                {/* Change */}
                                <div className={`text-right text-[12px] font-mono ${data.isPositive ? 'text-success' : 'text-danger'}`}>
                                    {data.change}
                                </div>

                                {/* Change % */}
                                <div className={`text-right text-[12px] font-mono ${data.isPositive ? 'text-success' : 'text-danger'}`}>
                                    {data.changePercent}%
                                </div>

                                {/* Volume */}
                                <div className="flex justify-end items-center relative">
                                    <div className="text-right text-[11px] font-mono text-text-muted whitespace-nowrap pr-2">
                                        {data.volume}
                                    </div>
                                    <button
                                        onClick={(e) => handleRemoveSymbol(e, symbol)}
                                        className="absolute right-0 opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger p-1 rounded transition-opacity bg-background"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default WatchlistComponent;
