import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import axios from 'axios';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import { API_BASE } from '../../../config/api';

const INDICES = ['^NSEI', '^BSESN', '^NSEBANK', '^CNXFIN', '^CNXMID'];
const INDEX_NAMES: Record<string, string> = {
    '^NSEI': 'NIFTY 50',
    '^BSESN': 'SENSEX',
    '^NSEBANK': 'NIFTY BANK',
    '^CNXFIN': 'FINNIFTY',
    '^CNXMID': 'MIDCPNIFTY'
};

// Reverse: Kotak symbol name → Yahoo Finance key (for WS tick matching)
const KOTAK_TO_YF: Record<string, string> = {
    'NIFTY 50': '^NSEI',
    'SENSEX': '^BSESN',
    'NIFTY BANK': '^NSEBANK',
    'FINNIFTY': '^CNXFIN',
    'MIDCPNIFTY': '^CNXMID',
};
// Kotak symbol names to subscribe to (matches ContractResolver)
const SUBSCRIBE_SYMBOLS = ['NIFTY 50', 'SENSEX', 'NIFTY BANK', 'FINNIFTY'];

const MajorIndicesPanel: React.FC = () => {
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [indicesData, setIndicesData] = useState<Record<string, { price: number, change: number, changePercent: number }>>({});
    const [loading, setLoading] = useState(true);
    const { subscribe, lastMessage, isConnected } = useWebSocket();

    const activeIndices = [...INDICES];
    if (sortConfig) {
        activeIndices.sort((a, b) => {
            const dataA = indicesData[a];
            const dataB = indicesData[b];
            
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc' 
                    ? INDEX_NAMES[a].localeCompare(INDEX_NAMES[b]) 
                    : INDEX_NAMES[b].localeCompare(INDEX_NAMES[a]);
            }
            
            const valA = dataA ? dataA.changePercent : 0;
            const valB = dataB ? dataB.changePercent : 0;
            
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        });
    }

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev && prev.key === key) {
                if (prev.direction === 'desc') return null;
                return { key, direction: 'desc' };
            }
            return { key, direction: 'asc' };
        });
    };

    useEffect(() => {
        let isMounted = true;

        const fetchAllIndices = async () => {
            const newData: Record<string, any> = {};
            for (const idx of INDICES) {
                try {
                    const res = await axios.get(`${API_BASE}/api/v1/quote/${idx}`);
                    if (res.data) {
                        newData[idx] = {
                            price: res.data.ltp || 0,
                            change: res.data.change || 0,
                            changePercent: res.data.changePercent || 0
                        };
                    }
                } catch {
                    // Mute fail allowing others to succeed
                }
            }
            if (isMounted) {
                setIndicesData(prev => ({ ...prev, ...newData }));
                setLoading(false);
            }
        };

        fetchAllIndices();
        const intervalId = setInterval(fetchAllIndices, 30000); // 30s background sync 

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);

    // Subscribe to realtime streams once connected (Kotak symbol names)
    useEffect(() => {
        if (isConnected) {
            subscribe(SUBSCRIBE_SYMBOLS);
        }
    }, [isConnected, subscribe]);

    // Handle incoming realtime tick — new format: {token, symbol, ltp, change, changePercent, ts}
    useEffect(() => {
        if (!lastMessage || lastMessage.type === 'heartbeat') return;

        const update = lastMessage;
        const sym = update.symbol || update.s;
        if (!sym) return;

        // Map Kotak symbol name back to Yahoo Finance key
        const yfKey = KOTAK_TO_YF[sym];
        if (yfKey && INDICES.includes(yfKey)) {
            setIndicesData(prev => {
                const old = prev[yfKey] || { price: 0, change: 0, changePercent: 0 };
                return {
                    ...prev,
                    [yfKey]: {
                        price: update.ltp || update.c || old.price,
                        change: update.change !== undefined ? update.change : old.change,
                        changePercent: update.changePercent !== undefined ? update.changePercent : old.changePercent
                    }
                };
            });
        }
    }, [lastMessage]);

    return (
        <div className="flex flex-col w-full h-full bg-surface border-t border-border-primary relative select-none">
            {/* Header */}
            <div className="p-2 border-b border-border-primary bg-card/50 flex justify-between items-center">
                <span className="text-[11px] font-bold text-text-primary tracking-wide">MAJOR INDICES</span>
                {loading && <span className="text-[9px] text-blue-500 animate-pulse">UPDATING</span>}
                {!loading && isConnected && <span className="text-[9px] text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>LIVE</span>}
            </div>

            {/* Sort Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-primary bg-card/30 text-[9px] font-bold text-text-secondary tracking-widest cursor-pointer select-none">
                <span className="hover:text-text-primary transition-colors flex items-center gap-1" onClick={() => handleSort('name')}>
                    INDEX {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </span>
                <span className="hover:text-text-primary transition-colors flex items-center gap-1" onClick={() => handleSort('changePercent')}>
                    CHANGE {sortConfig?.key === 'changePercent' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </span>
            </div>

            {/* List Content */}
            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar min-h-0">
                {activeIndices.map(idx => {
                    const data = indicesData[idx];
                    const isPos = data ? data.change >= 0 : true;

                    return (
                        <div key={idx} className="flex flex-col p-2 px-3 border-b border-border-primary/50 hover:bg-slate-800/50 transition-colors">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[11px] font-bold text-text-secondary">{INDEX_NAMES[idx]}</span>
                                {data ? (
                                    <span className="text-[12px] font-mono font-bold text-text-primary">
                                        {data.price.toFixed(2)}
                                    </span>
                                ) : (
                                    <span className="text-[12px] font-mono text-slate-500">---</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] text-text-secondary opacity-60">NSE</span>
                                {data ? (
                                    <div className={`flex items-center gap-1 text-[10px] font-mono font-bold ${isPos ? 'text-success' : 'text-danger'}`}>
                                        {isPos ? <ArrowUp size={10} strokeWidth={3} /> : <ArrowDown size={10} strokeWidth={3} />}
                                        {isPos ? '+' : ''}{data.change.toFixed(2)} ({isPos ? '+' : ''}{data.changePercent.toFixed(2)}%)
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-text-secondary opacity-40">Loading...</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MajorIndicesPanel;
