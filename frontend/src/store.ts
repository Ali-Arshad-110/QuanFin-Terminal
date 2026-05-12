import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface MarketStats {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change?: number;
    changePercent?: number;
}

export interface WatchlistItem {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume?: number;
    sector?: string;
    priceHistory?: number[];
}

interface ConstituentStock {
    symbol: string;
    name: string;
    ltp: number;
    change: number;
    changePercent: number;
    weight: number;
    contribution: number;
}

interface MarketState {
    ticker: string;
    setTicker: (ticker: string) => void;
    interval: string;
    setInterval: (interval: string) => void;
    marketStats: MarketStats | null;
    setMarketStats: (stats: MarketStats | null) => void;
    selectedIndex: string | null;
    setSelectedIndex: (symbol: string | null) => void;
    indexConstituents: Map<string, ConstituentStock[]>;
    updateConstituents: (symbol: string, data: ConstituentStock[]) => void;
    selectedStock: string | null;
    setSelectedStock: (symbol: string | null) => void;
    exchangeState: 'NSE' | 'BSE';
    setExchangeState: (exchange: 'NSE' | 'BSE') => void;
    // Broker State
    isBrokerConnected: boolean;
    setBrokerConnected: (status: boolean) => void;
    isBrokerModalOpen: boolean;
    setBrokerModalOpen: (open: boolean) => void;
    isScannerOpen: boolean;
    setScannerOpen: (open: boolean) => void;
    isWatchlistExpanded: boolean;
    setWatchlistExpanded: (open: boolean) => void;
    isIntelligenceSummaryOpen: boolean;
    setIntelligenceSummaryOpen: (open: boolean) => void;

    // Watchlist State
    activeWatchlist: string;
    watchlists: Record<string, WatchlistItem[]>;
    setActiveWatchlist: (name: string) => void;
    createWatchlist: (name: string) => void;
    deleteWatchlist: (name: string) => void;
    renameWatchlist: (oldName: string, newName: string) => void;
    addToWatchlist: (item: WatchlistItem) => void;
    removeFromWatchlist: (symbol: string) => void;
    updateWatchlistPrice: (symbol: string, price: number, change: number, changePercent: number, volume?: number) => void;
    
    // Dashboard Settings
    dashboardSettings: {
        showWatchlist: boolean;
        showIndices: boolean;
        showTerminalHeader: boolean;
        compactHeader: boolean;
    };
    updateDashboardSettings: (settings: Partial<MarketState['dashboardSettings']>) => void;
}

export const useMarketStore = create<MarketState>()(
    persist(
        (set) => ({
            ticker: 'NIFTY 50', // Default to Index or major stock
            setTicker: (ticker) => set({ ticker, selectedStock: ticker, marketStats: null }), // Sync selectedStock and clear old stats
            interval: '5m',
            setInterval: (interval) => set({ interval }),
            marketStats: null,
            setMarketStats: (stats) => set({ marketStats: stats }),

            // Index Detail Panel State
            selectedIndex: null,
            setSelectedIndex: (symbol) => set({ selectedIndex: symbol }),
            indexConstituents: new Map(),
            updateConstituents: (symbol, data) => set((state) => {
                const newMap = new Map(state.indexConstituents);
                newMap.set(symbol, data);
                return { indexConstituents: newMap };
            }),

            // Stock Detail Panel State
            selectedStock: null,
            setSelectedStock: (symbol) => set({ selectedStock: symbol }),

            // Exchange State
            exchangeState: 'NSE',
            setExchangeState: (exchange) => set({ exchangeState: exchange }),

            // Broker State
            isBrokerConnected: false,
            setBrokerConnected: (status) => set({ isBrokerConnected: status }),
            isBrokerModalOpen: false,
            setBrokerModalOpen: (open) => set({ isBrokerModalOpen: open }),
            // Scanner State
            isScannerOpen: false,
            setScannerOpen: (open: boolean) => set({ isScannerOpen: open }),
            isWatchlistExpanded: false,
            setWatchlistExpanded: (open: boolean) => set({ isWatchlistExpanded: open }),
            isIntelligenceSummaryOpen: false,
            setIntelligenceSummaryOpen: (open: boolean) => set({ isIntelligenceSummaryOpen: open }),

            // Watchlist State
            activeWatchlist: 'Default',
            watchlists: {
                'Default': [
                    { symbol: 'RELIANCE', price: 2985.40, change: 45.60, changePercent: 1.55, volume: 12500000, sector: 'Energy', priceHistory: [2970, 2975, 2980, 2982, 2985] },
                    { symbol: 'HDFCBANK', price: 1450.20, change: -12.40, changePercent: -0.85, volume: 8400000, sector: 'Banking', priceHistory: [1460, 1458, 1455, 1452, 1450] },
                    { symbol: 'TCS', price: 4120.00, change: 25.10, changePercent: 0.61, volume: 3200000, sector: 'IT', priceHistory: [4100, 4105, 4110, 4115, 4120] },
                ]
            },
            setActiveWatchlist: (name) => set({ activeWatchlist: name }),
            createWatchlist: (name) => set((state) => ({
                watchlists: { ...state.watchlists, [name]: [] }
            })),
            deleteWatchlist: (name) => set((state) => {
                if (name === 'Default') return state;
                const newWatchlists = { ...state.watchlists };
                delete newWatchlists[name];
                return {
                    watchlists: newWatchlists,
                    activeWatchlist: state.activeWatchlist === name ? 'Default' : state.activeWatchlist
                };
            }),
            renameWatchlist: (oldName, newName) => set((state) => {
                if (oldName === 'Default') return state;
                const newWatchlists = { ...state.watchlists };
                newWatchlists[newName] = newWatchlists[oldName];
                delete newWatchlists[oldName];
                return {
                    watchlists: newWatchlists,
                    activeWatchlist: state.activeWatchlist === oldName ? newName : state.activeWatchlist
                };
            }),
            addToWatchlist: (item) => set((state) => {
                const currentList = state.watchlists[state.activeWatchlist] || [];
                if (!currentList.find(w => w.symbol === item.symbol)) {
                    return {
                        watchlists: {
                            ...state.watchlists,
                            [state.activeWatchlist]: [item, ...currentList]
                        }
                    };
                }
                return state;
            }),
            removeFromWatchlist: (symbol) => set((state) => ({
                watchlists: {
                    ...state.watchlists,
                    [state.activeWatchlist]: (state.watchlists[state.activeWatchlist] || []).filter(w => w.symbol !== symbol)
                }
            })),
            updateWatchlistPrice: (symbol: string, price: number, change: number, changePercent: number, volume?: number) => set((state) => ({
                watchlists: {
                    ...state.watchlists,
                    [state.activeWatchlist]: (state.watchlists[state.activeWatchlist] || []).map(w => {
                        if (w.symbol === symbol) {
                            const history = [...(w.priceHistory || []), price].slice(-20);
                            return { ...w, price, change, changePercent, volume: volume ?? w.volume, priceHistory: history };
                        }
                        return w;
                    })
                }
            })),

            // Dashboard Settings
            dashboardSettings: {
                showWatchlist: true,
                showIndices: true,
                showTerminalHeader: true,
                compactHeader: false,
            },
            updateDashboardSettings: (newSettings) => set((state) => ({
                dashboardSettings: { ...state.dashboardSettings, ...newSettings }
            })),
        }),
        {
            name: 'quanfin-market-store',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
