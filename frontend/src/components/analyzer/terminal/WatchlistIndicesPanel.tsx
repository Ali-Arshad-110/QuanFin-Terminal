import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsivePie } from '@nivo/pie';
import { Activity, List as ListIcon, PieChart } from 'lucide-react';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { useMarketStore } from '../../../store';
import { API_BASE } from '../../../config/api';

const NSE_INDICES = [
    { symbol: '^NSEI',    name: 'NIFTY 50'   },
    { symbol: '^NSEBANK', name: 'NIFTY BANK' },
    { symbol: '^CNXIT',   name: 'NIFTY IT'   },
    { symbol: '^CNXAUTO', name: 'NIFTY AUTO' },
    { symbol: '^CNXFMCG', name: 'NIFTY FMCG' },
];

const BSE_INDICES = [
    { symbol: '^BSESN',      name: 'SENSEX'   },
    { symbol: 'BSE-BANK.BO', name: 'BSE BANK' },
    { symbol: 'BSE-IT.BO',   name: 'BSE IT'   },
    { symbol: 'BSE-AUTO.BO', name: 'BSE AUTO' },
    { symbol: 'BSE-FMCG.BO', name: 'BSE FMCG' },
];

const ALL_INDICES = [...NSE_INDICES, ...BSE_INDICES];

// Map each index name to its logo image path (public folder)
const INDEX_IMAGES: Record<string, string> = {
    'NIFTY 50':   '/assets/indices/nifty50.png',
    'NIFTY BANK': '/assets/indices/niftybank.png',
    'NIFTY IT':   '/assets/indices/niftyit.png',
    'NIFTY AUTO': '/assets/indices/niftyauto.png',
    'NIFTY FMCG': '/assets/indices/niftyfmcg.png',
    'SENSEX':     '/assets/indices/sensex.png',
    'BSE BANK':   '/assets/indices/bsebank.png',
    'BSE IT':     '/assets/indices/bseit.png',
    'BSE AUTO':   '/assets/indices/bseauto.png',
    'BSE FMCG':   '/assets/indices/bsegmcg.png',
};

// Reverse mapping for WS updates
const KOTAK_TO_YF: Record<string, string> = {
    'NIFTY 50':  '^NSEI',
    'NIFTY BANK': '^NSEBANK',
    'NIFTY IT':  '^CNXIT',
    'NIFTY AUTO': '^CNXAUTO',
    'NIFTY FMCG': '^CNXFMCG',
    'SENSEX':    '^BSESN',
    'BSE BANK':  'BSE-BANK.BO',
    'BSE IT':    'BSE-IT.BO',
    'BSE AUTO':  'BSE-AUTO.BO',
    'BSE FMCG':  'BSE-FMCG.BO',
};

const SUBSCRIBE_SYMBOLS = Object.keys(KOTAK_TO_YF);

type Exchange = 'NSE' | 'BSE';

interface WatchlistIndicesPanelProps {
    onNavigate?: (view: any) => void;
}

const WatchlistIndicesPanel: React.FC<WatchlistIndicesPanelProps> = ({ onNavigate }) => {
    const [viewMode, setViewMode]     = useState<'sunburst' | 'list'>('sunburst');
    const [exchange, setExchange]     = useState<Exchange>('NSE');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [indicesData, setIndicesData] = useState<Record<string, { price: number, change: number, changePercent: number }>>({});
    const [loading, setLoading]       = useState(true);
    const { subscribe, lastMessage, isConnected } = useWebSocket();
    const setTicker = useMarketStore(state => state.setTicker);

    // Active indices based on selected exchange and filter
    const activeIndices = exchange === 'NSE' ? [...NSE_INDICES] : [...BSE_INDICES];
    
    // Sort logic
    if (sortConfig) {
        activeIndices.sort((a, b) => {
            const dataA = indicesData[a.symbol];
            const dataB = indicesData[b.symbol];
            
            // If dragging names
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' 
                    ? a.name.localeCompare(b.name) 
                    : b.name.localeCompare(a.name);
            }
            
            const valA = dataA ? (sortConfig.key === 'price' ? dataA.price : sortConfig.key === 'change' ? dataA.change : dataA.changePercent) : 0;
            const valB = dataB ? (sortConfig.key === 'price' ? dataB.price : sortConfig.key === 'change' ? dataB.change : dataB.changePercent) : 0;
            
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });
    }

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev && prev.key === key) {
                if (prev.direction === 'desc') return null; // Reset
                return { key, direction: 'desc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const handleIndexClick = (symbolName: string) => {
        setTicker(symbolName);
        if (onNavigate) onNavigate('dashboard');
    };

    useEffect(() => {
        let isMounted = true;

        const fetchAllIndices = async () => {
            try {
                const symbols = ALL_INDICES.map(item => item.symbol);
                const res = await axios.post(`${API_BASE}/api/v1/quotes`, { symbols });
                if (res.data) {
                    const newData: Record<string, any> = {};
                    for (const item of ALL_INDICES) {
                        // The backend might return by original requested symbol or mapped symbol.
                        // For indices, the backend often receives ^NSEI but we want to map it back via indicesData
                        const quoteData = res.data[item.symbol];
                        if (quoteData) {
                            newData[item.symbol] = {
                                price: quoteData.ltp || quoteData.price || 0,
                                change: quoteData.change || 0,
                                changePercent: quoteData.changePercent || 0
                            };
                        }
                    }
                    if (isMounted) {
                        setIndicesData(prev => ({ ...prev, ...newData }));
                        setLoading(false);
                    }
                }
            } catch (err) {
                // Mute fail allowing others to succeed
                console.error("fetchAllIndices error:", err);
            }
        };

        fetchAllIndices();
        const intervalId = setInterval(fetchAllIndices, 30000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    // Subscribe to realtime streams once connected
    useEffect(() => {
        if (isConnected) subscribe(SUBSCRIBE_SYMBOLS);
    }, [isConnected, subscribe]);

    // Handle incoming realtime tick
    useEffect(() => {
        if (!lastMessage || lastMessage.type === 'heartbeat') return;
        const update = lastMessage;
        const sym    = update.symbol || update.s;
        if (!sym) return;

        const yfKey = KOTAK_TO_YF[sym];
        if (yfKey) {
            setIndicesData(prev => {
                const old = prev[yfKey] || { price: 0, change: 0, changePercent: 0 };
                return {
                    ...prev,
                    [yfKey]: {
                        price:         update.ltp || update.c || old.price,
                        change:        update.change         !== undefined ? update.change         : old.change,
                        changePercent: update.changePercent  !== undefined ? update.changePercent  : old.changePercent
                    }
                };
            });
        }
    }, [lastMessage]);

    // Prepare pie data — only for the active exchange
    const preparePieData = () => {
        return activeIndices.reduce<any[]>((acc, item) => {
            const cData = indicesData[item.symbol];
            if (cData) {
                acc.push({
                    id:            item.name,
                    label:         item.name,
                    value:         Math.abs(cData.changePercent) || 0.01,
                    color:         cData.change >= 0 ? '#10b981' : '#ef4444',
                    symbol:        item.symbol,
                    price:         cData.price,
                    change:        cData.change,
                    changePercent: cData.changePercent
                });
            }
            return acc;
        }, []);
    };

    const pieData = preparePieData();

    return (
        <div className="flex flex-col w-full h-full min-h-0 bg-background text-text-primary overflow-hidden font-sans border-t border-border-secondary">

            {/* ── Header row ── */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary">
                {/* Title + live badge */}
                <div className="flex items-center gap-1.5 cursor-default">
                    <Activity size={16} className="text-text-primary" />
                    <span className="text-[14px] font-semibold text-text-primary tracking-tight">Major Indices</span>
                    {loading && (
                        <span className="text-[9px] text-blue-500 animate-pulse ml-2">UPDATING</span>
                    )}
                    {!loading && isConnected && (
                        <span className="text-[9px] text-success flex items-center gap-1 ml-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            LIVE
                        </span>
                    )}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                    {/* NSE / BSE pill toggle */}
                    <div className="flex items-center bg-surface border border-border-secondary rounded-md p-0.5 text-[11px] font-bold tracking-wide">
                        <button
                            onClick={() => setExchange('NSE')}
                            className={`px-2.5 py-0.5 rounded transition-all ${
                                exchange === 'NSE'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            NSE
                        </button>
                        <button
                            onClick={() => setExchange('BSE')}
                            className={`px-2.5 py-0.5 rounded transition-all ${
                                exchange === 'BSE'
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            BSE
                        </button>
                    </div>

                    {/* View-mode toggle */}
                    <div className="flex items-center bg-surface border border-border-secondary rounded-md p-0.5">
                        <button
                            onClick={() => setViewMode('sunburst')}
                            className={`p-1 rounded ${viewMode === 'sunburst' ? 'bg-background shadow-sm text-primary' : 'text-text-muted hover:text-text-primary'}`}
                            title="Chart View"
                        >
                            <PieChart size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1 rounded ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-text-muted hover:text-text-primary'}`}
                            title="List View"
                        >
                            <ListIcon size={14} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={`flex-1 min-h-0 flex flex-col ${viewMode === 'list' ? 'overflow-y-auto custom-scrollbar' : 'relative overflow-hidden'}`}>

                {/* ── Pie / Sunburst ── */}
                {viewMode === 'sunburst' && (
                    <div className="flex-1 relative cursor-pointer min-h-0">
                        {pieData.length > 0 ? (
                            <ResponsivePie
                                data={pieData}
                                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                                innerRadius={0.45}
                                padAngle={2}
                                cornerRadius={4}
                                activeOuterRadiusOffset={6}
                                colors={{ datum: 'data.color' }}
                                borderWidth={1}
                                borderColor={{ theme: 'background' }}
                                enableArcLinkLabels={false}
                                enableArcLabels={true}
                                arcLabel={e => e.id + ''}
                                arcLabelsSkipAngle={15}
                                arcLabelsTextColor="#ffffff"
                                tooltip={({ datum }) => (
                                    <div className="bg-surface border border-border-secondary shadow-lg rounded-lg p-2 text-xs flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            {INDEX_IMAGES[datum.data.label] && (
                                                <img
                                                    src={INDEX_IMAGES[datum.data.label]}
                                                    alt={datum.data.label}
                                                    className="w-6 h-6 rounded object-contain"
                                                />
                                            )}
                                            <strong className="text-text-primary">{datum.data.label}</strong>
                                        </div>
                                        <span className="text-text-primary font-mono">{datum.data.price?.toFixed(2)}</span>
                                        <span className={`font-mono ${datum.data.change >= 0 ? 'text-success' : 'text-danger'}`}>
                                            {datum.data.change >= 0 ? '+' : ''}{datum.data.change?.toFixed(2)} ({datum.data.changePercent?.toFixed(2)}%)
                                        </span>
                                    </div>
                                )}
                                onClick={(node: any) => handleIndexClick(node.id)}
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-text-muted text-xs">Loading Charts...</div>
                        )}
                        {/* Center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none drop-shadow-md">
                            <span className={`text-[11px] font-black tracking-widest uppercase mb-0.5 ${exchange === 'NSE' ? 'text-indigo-400' : 'text-orange-400'}`}>
                                {exchange}
                            </span>
                            <span className="text-text-muted text-[9px] font-bold tracking-widest">CLICK TO CHART</span>
                        </div>
                    </div>
                )}

                {/* ── List ── */}
                {viewMode === 'list' && (
                    <>
                        {/* Column headers */}
                        <div className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr] gap-1 px-3 py-1.5 border-b border-border-secondary bg-background sticky top-0 z-10 text-[10px] font-medium text-text-muted uppercase tracking-wide cursor-pointer select-none">
                            <span className="text-left hover:text-text-primary flex items-center gap-1" onClick={() => handleSort('name')}>
                                INDEX {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                            </span>
                            <span className="text-right hover:text-text-primary flex items-center justify-end gap-1" onClick={() => handleSort('price')}>
                                VAL {sortConfig?.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                            </span>
                            <span className="text-right hover:text-text-primary flex items-center justify-end gap-1" onClick={() => handleSort('change')}>
                                CHG {sortConfig?.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                            </span>
                            <span className="text-right hover:text-text-primary flex items-center justify-end gap-1" onClick={() => handleSort('changePercent')}>
                                CHG% {sortConfig?.key === 'changePercent' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                            </span>
                        </div>

                        {activeIndices.map(idx => {
                            const data      = indicesData[idx.symbol];
                            const isPos     = data ? data.change >= 0 : true;
                            const clrClass  = isPos ? 'text-success' : 'text-danger';

                            return (
                                <div
                                    key={idx.symbol}
                                    onClick={() => handleIndexClick(idx.name)}
                                    className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr] gap-1 items-center px-3 py-2 border-b border-border-secondary/50 hover:bg-surface cursor-pointer tabular-nums transition-colors group"
                                >
                                    {/* Logo + name */}
                                    <div className="flex items-center gap-2.5 overflow-visible">
                                        {INDEX_IMAGES[idx.name] && (
                                            <img
                                                src={INDEX_IMAGES[idx.name]}
                                                alt={idx.name}
                                                className="w-7 h-7 rounded object-contain flex-shrink-0 transition-all duration-500 ease-out group-hover:[transform:perspective(200px)_translateZ(18px)_scale(1.3)] group-hover:drop-shadow-[0_6px_12px_rgba(99,102,241,0.7)]"
                                            />
                                        )}
                                        <span className="text-text-primary font-medium text-[12px] tracking-tight truncate">
                                            {idx.name}
                                        </span>
                                    </div>

                                    <span className="text-text-primary font-mono text-[12px] text-right">
                                        {data ? data.price.toFixed(2) : '---'}
                                    </span>
                                    <span className={`${clrClass} font-mono text-[12px] text-right`}>
                                        {data ? `${isPos ? '+' : ''}${data.change.toFixed(2)}` : '---'}
                                    </span>
                                    <span className={`${clrClass} font-mono text-[12px] text-right`}>
                                        {data ? `${data.changePercent.toFixed(2)}%` : '---'}
                                    </span>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
};

export default WatchlistIndicesPanel;
