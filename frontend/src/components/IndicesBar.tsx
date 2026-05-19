import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LIVE_DATA_CONFIG, getAdaptiveRefreshInterval } from '../config/liveData';
import { useMarketStore } from '../store';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import IndexDetailPanel from './IndexDetailPanel';
import { API_BASE } from '../config/api';

interface IndexData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    change_percent: number;
    components?: string[];
    missing_components?: string[];
}

interface ExchangeData {
    indices: IndexData[];
}

interface ExchangesResponse {
    exchanges: {
        NSE: ExchangeData;
        BSE: ExchangeData;
    }
}

interface IndicesBarProps {
    onNavigate?: (view: any) => void;
}

const IndicesBar: React.FC<IndicesBarProps> = ({ onNavigate }) => {
    const { exchangeState, setExchangeState, selectedIndex, setSelectedIndex, setTicker } = useMarketStore();
    const indicesDataRef = useRef<{ NSE: IndexData[], BSE: IndexData[] }>({ NSE: [], BSE: [] });
    // Keep a map for quick lookups
    const symbolDataMap = useRef<Map<string, IndexData>>(new Map());

    const [isFading, setIsFading] = useState(false);
    const [, forceUpdate] = useState({});
    const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const fetchIndices = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/indices`);
                if (res.ok) {
                    const data: ExchangesResponse = await res.json();
                    if (data.exchanges) {
                        indicesDataRef.current.NSE = data.exchanges.NSE.indices;
                        indicesDataRef.current.BSE = data.exchanges.BSE.indices;

                        // Update flat map
                        data.exchanges.NSE.indices.forEach(idx => symbolDataMap.current.set(idx.symbol, idx));
                        data.exchanges.BSE.indices.forEach(idx => symbolDataMap.current.set(idx.symbol, idx));

                        // On init, if selectedIndex isn't set, set it
                        const currentExchangeList = data.exchanges[exchangeState]?.indices || [];
                        if (currentExchangeList.length > 0 && !selectedIndex) {
                            setSelectedIndex(currentExchangeList[0].symbol);
                        }

                        forceUpdate({});
                    }
                }
            } catch (e) {
                console.error('Failed to fetch indices', e);
            }
        };

        fetchIndices();
        const iv = getAdaptiveRefreshInterval(LIVE_DATA_CONFIG.INDICES_REFRESH_INTERVAL);
        if (iv > 0) {
            const id = setInterval(fetchIndices, iv);
            return () => clearInterval(id);
        }
    }, [exchangeState, selectedIndex, setSelectedIndex]);

    const handleSwitchExchange = (newExchange: 'NSE' | 'BSE') => {
        if (exchangeState === newExchange) return;

        setIsFading(true);
        setTimeout(() => {
            setExchangeState(newExchange);
            const firstIndex = indicesDataRef.current[newExchange]?.[0]?.symbol;
            if (firstIndex) {
                setSelectedIndex(firstIndex);
            }
            setExpandedSymbol(null);
            setIsFading(false);
        }, 200);
    };

    const handleTabClick = useCallback((
        e: React.MouseEvent<HTMLButtonElement>,
        symbol: string
    ) => {
        // Validation: verify if exchange mismatch
        const currentExchangeIndices = indicesDataRef.current[exchangeState];
        if (!currentExchangeIndices.some(i => i.symbol === symbol)) {
            console.warn("Index belongs to different exchange");
            try {
                window.alert("Index belongs to different exchange");
            } catch (err) { }
            return;
        }

        setSelectedIndex(symbol);
        if (expandedSymbol === symbol) {
            setExpandedSymbol(null);
            setAnchorRect(null);
        } else {
            setAnchorRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect());
            setExpandedSymbol(symbol);
        }
    }, [expandedSymbol, exchangeState, setSelectedIndex]);

    const currentIndices = indicesDataRef.current[exchangeState] || [];
    const expandedDef = currentIndices.find((d: IndexData) => d.symbol === expandedSymbol);
    const expandedData = expandedSymbol ? symbolDataMap.current.get(expandedSymbol) : undefined;

    // Marquee: duplicate list for seamless looping (only when enough items)
    const marqueeEnabled = currentIndices.length >= 4;
    const marqueeItems = marqueeEnabled ? [...currentIndices, ...currentIndices] : currentIndices;

    return (
        <div className="w-full bg-surface h-7 flex items-center px-4 overflow-y-hidden no-scrollbar transition-colors duration-300 relative">
            <style>{`
                @keyframes quanfin-marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .quanfin-marquee-track {
                    animation: quanfin-marquee 28s linear infinite;
                }
                .quanfin-marquee:hover .quanfin-marquee-track {
                    animation-play-state: paused;
                }
                @media (prefers-reduced-motion: reduce) {
                    .quanfin-marquee-track { animation: none !important; }
                }
            `}</style>
            {/* Live pulse dot & Switcher */}
            <div className="flex items-center gap-2.5 mr-4 flex-shrink-0 border-r border-white/10 pr-4 h-full sticky left-0 bg-surface z-10 transition-colors duration-300 text-[10px]">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>

                {/* Segmented Control */}
                <div className="flex bg-black/10 border border-white/5 rounded p-0.5">
                    {(['NSE', 'BSE'] as const).map(exc => (
                        <button
                            key={exc}
                            onClick={() => handleSwitchExchange(exc)}
                            className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all ${exchangeState === exc
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-text-muted hover:text-text-primary'
                                }`}
                        >
                            {exc}
                        </button>
                    ))}
                </div>
            </div>

            {/* Marquee strip (click behavior unchanged) */}
            <div className={`flex-1 min-w-0 h-full transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'} ${marqueeEnabled ? 'overflow-hidden quanfin-marquee' : 'overflow-x-auto'}`}>
                {currentIndices.length === 0 ? (
                    <div className="text-xs text-text-muted animate-pulse px-4">Loading Indices...</div>
                ) : (
                    <div className={`${marqueeEnabled ? 'quanfin-marquee-track flex gap-1 h-full items-center w-max' : 'flex gap-1 h-full items-center'}`}>
                        {marqueeItems.map((indexDef, i) => {
                            const idx = symbolDataMap.current.get(indexDef.symbol) || indexDef;
                            const isActive = selectedIndex === indexDef.name || selectedIndex === indexDef.symbol;
                            const isExpanded = expandedSymbol === indexDef.symbol;
                            const isPositive = (idx?.change ?? 0) >= 0;
                            const hasMissing = idx.missing_components && idx.missing_components.length > 0;

                            if (hasMissing) {
                                console.warn(`[${indexDef.name}] Missing components from master sync:`, idx.missing_components);
                            }

                            return (
                                <button
                                    key={`${indexDef.symbol}:${i}`}
                                    onClick={(e) => handleTabClick(e, indexDef.symbol)}
                                    className={`flex flex-row items-center justify-center gap-2 cursor-pointer group h-full px-3 relative
                                        transition-all shrink-0
                                        ${isExpanded
                                            ? 'bg-indigo-500/15 dark:bg-indigo-500/20'
                                            : isActive
                                                ? 'bg-emerald-500/10 dark:bg-emerald-500/5'
                                                : 'hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap
                                            ${isExpanded ? 'text-indigo-600 dark:text-indigo-300' : isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted group-hover:text-text-secondary'}`}>
                                            {indexDef.name}
                                        </span>
                                        {hasMissing && (
                                            <div className="relative group/tooltip flex items-center">
                                                <AlertTriangle size={10} className="text-amber-500 ml-0.5 shrink-0" />
                                                <div className="absolute opacity-0 group-hover/tooltip:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-surface border border-border-secondary text-text-primary text-[10px] whitespace-nowrap rounded pointer-events-none transition-opacity z-50 shadow-lg" style={{ bottom: '100%', marginBottom: '4px' }}>
                                                    Instrument missing from master sync
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-[11px] font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}`}>
                                            {idx.price.toFixed(0)}
                                        </span>
                                        <span className={`text-[9px] font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                                            {isPositive ? '+' : ''}{Math.abs(idx.change_percent).toFixed(2)}%
                                        </span>
                                    </div>

                                    <ChevronDown
                                        size={10}
                                        className={`transition-transform duration-150 shrink-0 ml-0.5
                                            ${isExpanded ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-text-muted/50 opacity-0 group-hover:opacity-100'}`}
                                    />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Rich NSE-style expand panel */}
            {expandedSymbol && expandedDef && expandedData && anchorRect && (
                <IndexDetailPanel
                    indexDef={expandedDef}
                    data={expandedData}
                    anchorRect={anchorRect}
                    onNavigateToChart={(name: string) => {
                        setTicker(name);
                        setExpandedSymbol(null);
                        setAnchorRect(null);
                        if (onNavigate) onNavigate('dashboard');
                    }}
                    onClose={() => { setExpandedSymbol(null); setAnchorRect(null); }}
                />
            )}
        </div>
    );
};

export default IndicesBar;
