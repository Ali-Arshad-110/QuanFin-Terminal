import { useState, useEffect, useMemo, useRef } from 'react';
import { Trash2, Plus, LayoutGrid, Maximize2, ChevronDown, ArrowUp, ArrowDown, List, Search } from 'lucide-react';
import { useMarketStore } from '../../../store';
import axios from 'axios';
import StockLogo from '../../StockLogo';
import TickerSearch from '../../TickerSearch';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import Plot from 'react-plotly.js';
import WatchlistExpandedView from './WatchlistExpandedView';
import { type WatchlistItem as StoreWatchlistItem } from '../../../store';

const WatchlistPanel = () => {
    const {
        watchlists,
        activeWatchlist,
        addToWatchlist,
        removeFromWatchlist,
        updateWatchlistPrice,
        setTicker,
        setActiveWatchlist,
        createWatchlist,
        setWatchlistExpanded,
        isWatchlistExpanded,
        ticker
    } = useMarketStore();

    const { subscribe, lastMessage, isConnected } = useWebSocket();
    const [isCreating, setIsCreating] = useState(false);
    const [newListName, setNewListName] = useState('');
    const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'changePercent'>('symbol');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Flash status per symbol: { 'RELIANCE': 'up' | 'down' | null }
    const [flashes, setFlashes] = useState<Record<string, 'up' | 'down' | null>>({});
    const prevPrices = useRef<Record<string, number>>({});

    const currentWatchlist = watchlists[activeWatchlist] || [];

    // Sorting Logic
    const sortedWatchlist = useMemo(() => {
        return [...currentWatchlist].sort((a, b) => {
            let valA: any = a[sortBy];
            let valB: any = b[sortBy];
            if (sortOrder === 'asc') return valA > valB ? 1 : -1;
            return valA < valB ? 1 : -1;
        });
    }, [currentWatchlist, sortBy, sortOrder]);

    // Sector Analysis Data
    const sectorData = useMemo(() => {
        const counts: Record<string, number> = {};
        currentWatchlist.forEach(item => {
            const s = item.sector || 'Uncategorized';
            counts[s] = (counts[s] || 0) + 1;
        });
        return {
            labels: Object.keys(counts),
            values: Object.values(counts)
        };
    }, [currentWatchlist]);

    const handleSort = (field: 'symbol' | 'price' | 'changePercent') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    // Volume Formatter: Indian Numbering System (L, Cr)
    const formatVol = (vol: number | undefined) => {
        if (!vol) return '0.00';
        if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
        if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
        if (vol >= 1000) return `${(vol / 1000).toFixed(1)} K`;
        return vol.toString();
    };

    // Subscribe to realtime streams
    useEffect(() => {
        if (isConnected && currentWatchlist.length > 0) {
            const symbols = currentWatchlist.map(item => item.symbol);
            subscribe(symbols);
        }
    }, [isConnected, activeWatchlist, currentWatchlist.length]);

    // Handle incoming price updates and flashes
    useEffect(() => {
        if (!lastMessage || lastMessage.type === 'heartbeat') return;

        const update = lastMessage;
        const sym = update.symbol || update.s;
        if (!sym) return;

        const item = currentWatchlist.find(w => w.symbol === sym);
        if (item) {
            const newPrice = update.ltp || update.c || item.price;
            const newChange = update.change !== undefined ? update.change : item.change;
            const newChangePercent = update.changePercent !== undefined ? update.changePercent : item.changePercent;
            const newVolume = update.v || update.volume || item.volume;

            // Flash Logic
            const prevPrice = prevPrices.current[sym];
            if (prevPrice !== undefined && newPrice !== prevPrice) {
                const direction = newPrice > prevPrice ? 'up' : 'down';
                setFlashes(prev => ({ ...prev, [sym]: direction }));

                // Clear flash after 1s
                setTimeout(() => {
                    setFlashes(prev => ({ ...prev, [sym]: null }));
                }, 1000);
            }
            prevPrices.current[sym] = newPrice;

            updateWatchlistPrice(sym, newPrice, newChange, newChangePercent, newVolume);
        }
    }, [lastMessage]);

    // Initialize prevPrices
    useEffect(() => {
        currentWatchlist.forEach(item => {
            if (prevPrices.current[item.symbol] === undefined) {
                prevPrices.current[item.symbol] = item.price;
            }
        });
    }, [activeWatchlist, currentWatchlist.length]);

    const handleAddSymbol = (symbol: string) => {
        addToWatchlist({
            symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            sector: 'Other'
        });
        setTicker(symbol); // FIX: Update chart when searching/adding symbol
        axios.get(`http://localhost:8000/api/v1/quote/${symbol}`)
            .then(res => {
                const quote = res.data;
                updateWatchlistPrice(
                    symbol,
                    quote.price || quote.ltp || 0,
                    quote.change || 0,
                    quote.changePercent || 0,
                    quote.v || quote.volume || 0
                );
            })
            .catch(() => { });
    };

    const handleCreateList = () => {
        if (newListName.trim()) {
            createWatchlist(newListName.trim());
            setIsCreating(false);
            setNewListName('');
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-background text-text-primary overflow-hidden border-l border-border-primary/20 transition-all duration-300 font-sans">
            {/* ── HEADER ────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary">
                <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setIsCreating(!isCreating)}>
                    <List size={18} className="text-text-primary" />
                    <select
                        value={activeWatchlist}
                        onChange={(e) => setActiveWatchlist(e.target.value)}
                        className="bg-transparent border-none text-[15px] font-semibold text-text-primary tracking-tight focus:ring-0 cursor-pointer p-0 appearance-none outline-none"
                    >
                        {Object.keys(watchlists).map(name => (
                            <option key={name} value={name} className="bg-surface text-text-primary">
                                {name === 'Default' ? 'My Watchlist' : name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="text-text-muted group-hover:text-text-primary transition-colors" />
                </div>
                <div className="flex items-center gap-3 text-text-muted">
                    <Search size={16} className="hover:text-text-primary cursor-pointer transition-colors" />
                    <Plus size={16} className="hover:text-text-primary cursor-pointer transition-colors hidden" onClick={() => setIsCreating(!isCreating)} />
                    <LayoutGrid
                        size={16}
                        className={`hover:text-text-primary cursor-pointer transition-colors hidden ${showAnalytics ? 'text-blue-500' : ''}`}
                        onClick={() => setShowAnalytics(!showAnalytics)}
                    />
                    <Maximize2
                        size={16}
                        className="hover:text-text-primary cursor-pointer transition-colors"
                        onClick={() => setWatchlistExpanded(true)}
                    />
                </div>
            </div>

            {/* ── SEARCH BAR ────────────────────────────────────────────── */}
            <div className="px-3 py-2 border-b border-border-secondary bg-background">
                <TickerSearch
                    onSelect={handleAddSymbol}
                    compact={true}
                    placeholder="Add Symbol..."
                    clearOnSelect={true}
                    className="bg-surface border border-border-secondary text-[12px] h-[32px] rounded-lg px-3 text-text-primary placeholder:text-text-muted focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
            </div>

            {isCreating && (
                <div className="px-3 py-2 bg-surface border-b border-border-secondary">
                    <div className="flex items-center gap-2">
                        <input
                            autoFocus
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                            placeholder="LIST NAME..."
                            className="flex-1 bg-transparent border-none text-[11px] font-medium uppercase tracking-wider text-text-primary focus:ring-0 px-0 placeholder:text-text-muted/60"
                        />
                        <button onClick={handleCreateList} className="text-primary font-bold text-[10px] uppercase tracking-widest hover:text-primary/80">ADD</button>
                    </div>
                </div>
            )}

            {showAnalytics && (
                <div className="flex-1 flex flex-col items-center justify-center p-4 bg-background overflow-hidden relative">
                    <button
                        className="absolute top-2 right-4 text-[9px] font-bold uppercase tracking-widest text-text-muted hover:text-text-primary"
                        onClick={() => setShowAnalytics(false)}
                    >CLOSE</button>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-4">Sector Exposure</h3>
                    <div className="w-full h-48">
                        <Plot
                            data={[{
                                values: sectorData.values,
                                labels: sectorData.labels,
                                type: 'pie',
                                hole: 0.7,
                                marker: {
                                    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
                                },
                                textinfo: 'none',
                                hoverinfo: 'label+percent',
                                automargin: true
                            }]}
                            layout={{
                                autosize: true,
                                paper_bgcolor: 'rgba(0,0,0,0)',
                                plot_bgcolor: 'rgba(0,0,0,0)',
                                showlegend: false,
                                margin: { l: 10, r: 10, t: 10, b: 10 },
                            }}
                            config={{ displayModeBar: false, responsive: true }}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                    <div className="mt-4 w-full grid grid-cols-2 gap-2 max-h-32 overflow-y-auto px-2">
                        {sectorData.labels.map((label, idx) => (
                            <div key={label} className="flex items-center gap-1.5 text-[9px] text-text-muted">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'][idx % 8] }}></span>
                                <span className="truncate">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!showAnalytics && (
                <>
                    {/* ── TABLE HEADERS ────────────────────────────────────── */}
                    <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr] gap-1 px-3 py-1.5 border-b border-border-secondary bg-background sticky top-0 z-10 text-[10px] font-medium text-text-muted uppercase tracking-wide">
                        <button onClick={() => handleSort('symbol')} className="text-left flex items-center gap-1 hover:text-text-primary">
                            SYBL {sortBy === 'symbol' && (sortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
                        </button>
                        <button onClick={() => handleSort('price')} className="text-right flex items-center justify-end gap-1 hover:text-text-primary">
                            LTP {sortBy === 'price' && (sortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
                        </button>
                        <span className="text-right">CHGE</span>
                        <button onClick={() => handleSort('changePercent')} className="text-right flex items-center justify-end gap-1 hover:text-text-primary">
                            CHGE% {sortBy === 'changePercent' && (sortOrder === 'asc' ? <ArrowUp size={8} /> : <ArrowDown size={8} />)}
                        </button>
                        <span className="text-right pr-2">VOL</span>
                    </div>

                    {/* ── WATCHLIST ROWS ───────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto w-full pr-1 mr-1 my-1 custom-scrollbar">
                        {sortedWatchlist.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 opacity-20">
                                <List size={32} className="text-text-muted" />
                                <span className="text-[11px] uppercase tracking-widest mt-3 font-medium text-text-muted/80">Watchlist Empty</span>
                            </div>
                        ) : (
                            sortedWatchlist.map((item) => {
                                const isPos = item.change >= 0;
                                const changeColor = isPos ? 'text-success' : 'text-danger';
                                const flashClass = flashes[item.symbol] === 'up'
                                    ? 'bg-success/10 transition-colors duration-100'
                                    : flashes[item.symbol] === 'down'
                                        ? 'bg-danger/10 transition-colors duration-100'
                                        : 'transition-colors duration-300';

                                // Abbreviate symbols if too long for "SYBL"
                                const shortSymbol = item.symbol.length > 5 ? item.symbol.substring(0, 4) + '...' : item.symbol;

                                return (
                                    <div
                                        key={item.symbol}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('ticker', item.symbol);
                                            e.dataTransfer.effectAllowed = 'copy';
                                        }}
                                        className={`grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_1fr] gap-1 items-center px-3 py-1.5 border-b border-border-secondary/50 hover:bg-surface cursor-pointer group tabular-nums overflow-hidden ${flashClass}`}
                                        onClick={() => setTicker(item.symbol)}
                                        title={item.symbol}
                                    >
                                        {/* Symbol & Logo */}
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                                                <StockLogo symbol={item.symbol} size={6} className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-text-primary font-medium text-[12px] tracking-tight truncate">
                                                {shortSymbol}
                                            </span>
                                        </div>

                                        {/* LTP */}
                                        <span className="text-text-primary font-mono text-[12px] text-right">
                                            {item.price.toFixed(2)}
                                        </span>

                                        {/* CHANGE */}
                                        <span className={`${changeColor} font-mono text-[12px] text-right`}>
                                            {isPos ? '+' : ''}{item.change.toFixed(2)}
                                        </span>

                                        {/* CHGE% */}
                                        <span className={`${changeColor} font-mono text-[12px] text-right`}>
                                            {isPos ? '' : ''}{item.changePercent.toFixed(2)}%
                                        </span>

                                        {/* VOLUME & Trash */}
                                        <div className="flex items-center justify-end relative">
                                            <span className="text-text-muted font-mono text-[11px] text-right pr-2 whitespace-nowrap">
                                                {formatVol(item.volume)}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFromWatchlist(item.symbol);
                                                }}
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
                </>
            )}

            {/* Expanded View Modal */}
            <WatchlistExpandedView
                isOpen={isWatchlistExpanded}
                onClose={() => setWatchlistExpanded(false)}
                watchlist={currentWatchlist as unknown as StoreWatchlistItem[]}
                activeTicker={ticker}
                onSelectTicker={setTicker}
            />
        </div>
    );
};

export default WatchlistPanel;
