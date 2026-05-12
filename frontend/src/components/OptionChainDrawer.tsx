import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { OIVisualBar } from './OIVisualBar';
import { SentimentMeter } from './SentimentMeter';

interface OptionChainDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: string;
}

interface StrikeData {
    strike_price: number;
    ce_ltp: number;
    ce_oi: number;
    pe_ltp: number;
    pe_oi: number;
}

interface OptionChainData {
    symbol: string;
    ltp: number;
    atm_strike: number;
    pcr: number;
    sentiment: string;
    strikes: StrikeData[];
    error?: string;
}

// Simple in-memory cache
const cache: Record<string, { data: OptionChainData; timestamp: number }> = {};
const CACHE_TTL = 30000; // 30 seconds

export const OptionChainDrawer: React.FC<OptionChainDrawerProps> = ({ isOpen, onClose, symbol }) => {
    const [data, setData] = useState<OptionChainData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOptionChain = async (force: boolean = false) => {
        if (!symbol) return;

        // Check cache first
        const now = Date.now();
        if (!force && cache[symbol] && now - cache[symbol].timestamp < CACHE_TTL) {
            setData(cache[symbol].data);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Updated endpoint to exactly match backend routing: /api/v1 + /market + /option-chain/{symbol}
            const resp = await axios.get<OptionChainData>(`http://localhost:8000/api/v1/market/option-chain/${symbol}`);
            if (resp.data.error) {
                setError(resp.data.error);
            } else {
                setData(resp.data);
                cache[symbol] = { data: resp.data, timestamp: now };
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch Option Chain');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchOptionChain();
        }
    }, [isOpen, symbol]);

    if (!isOpen) return null;

    const maxOi = data
        ? Math.max(...data.strikes.map(s => Math.max(s.ce_oi || 0, s.pe_oi || 0)))
        : 0;

    return (
        <div className="absolute top-0 right-0 w-[400px] h-full bg-[#0a0a0d] border-l border-[rgba(255,255,255,0.05)] shadow-2xl z-50 transform transition-transform duration-300 flex flex-col font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.05)] bg-[#111]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        📊
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white">{symbol} Option Chain</h2>
                        {data?.ltp && (
                            <p className="text-xs text-gray-400">Spot: <span className="text-gray-200">₹{data.ltp.toLocaleString()}</span></p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchOptionChain(true)}
                        disabled={loading}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {loading && !data && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {error && !loading && (
                <div className="p-6 flex flex-col items-center justify-center text-center gap-2 text-gray-400 h-full">
                    <AlertCircle size={32} className="text-red-500/50 mb-2" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {!loading && data && !error && (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 flex flex-col gap-4 flex-shrink-0">
                        <SentimentMeter pcr={data.pcr} sentiment={data.sentiment} />
                    </div>

                    <div className="w-full flex-1 overflow-y-auto pb-6 relative">
                        <div className="grid grid-cols-[1fr_80px_1fr] sticky top-0 bg-[#0a0a0d] border-y border-[rgba(255,255,255,0.05)] text-[10px] text-gray-500 font-medium z-10 shadow-md">
                            <div className="flex justify-between px-2 py-1.5 border-r border-[rgba(255,255,255,0.05)]">
                                <span>CE OI</span>
                                <span>LTP</span>
                            </div>
                            <div className="text-center py-1.5 bg-[#111]">STRIKE</div>
                            <div className="flex justify-between px-2 py-1.5 border-l border-[rgba(255,255,255,0.05)]">
                                <span>LTP</span>
                                <span>PE OI</span>
                            </div>
                        </div>

                        <div className="flex flex-col text-xs">
                            {data.strikes.map((s) => {
                                const isAtm = s.strike_price === data.atm_strike;
                                return (
                                    <div
                                        key={s.strike_price}
                                        className={`grid grid-cols-[1fr_80px_1fr] border-b border-[rgba(255,255,255,0.02)] hover:bg-white/5 transition-colors ${isAtm ? 'bg-indigo-500/10 border-indigo-500/30 font-semibold' : ''}`}
                                    >
                                        {/* Call Side */}
                                        <div className="flex items-center text-gray-300">
                                            <OIVisualBar
                                                value={s.ce_oi || 0}
                                                max={maxOi}
                                                color="red"
                                                align="left"
                                                className="flex-1 h-7 opacity-80"
                                            />
                                            <span className="w-12 text-right pr-2 font-mono text-[11px]">{s.ce_ltp > 0 ? s.ce_ltp.toFixed(1) : '-'}</span>
                                        </div>

                                        {/* Strike */}
                                        <div className="relative w-full h-full flex items-center justify-center bg-[#111]/50 text-white font-mono text-[11px] border-x border-[rgba(255,255,255,0.02)] py-1.5">
                                            {s.strike_price}
                                            {isAtm && <span className="absolute right-0 top-1 text-[8px] text-indigo-400 rotate-90 translate-x-2 -translate-y-1">ATM</span>}
                                        </div>

                                        {/* Put Side */}
                                        <div className="flex items-center text-gray-300">
                                            <span className="w-12 text-left pl-2 font-mono text-[11px]">{s.pe_ltp > 0 ? s.pe_ltp.toFixed(1) : '-'}</span>
                                            <OIVisualBar
                                                value={s.pe_oi || 0}
                                                max={maxOi}
                                                color="green"
                                                align="right"
                                                className="flex-1 h-7 opacity-80"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
