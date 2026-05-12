import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { RefreshCw } from 'lucide-react';

interface OptionStrike {
    strike_price: number;
    // CE Data
    ce_token: string;
    ce_ltp: number;
    ce_oi: number;
    ce_oi_change: number;
    ce_volume: number;
    ce_iv: number;
    ce_delta: number;
    // PE Data
    pe_token: string;
    pe_ltp: number;
    pe_oi: number;
    pe_oi_change: number;
    pe_volume: number;
    pe_iv: number;
    pe_delta: number;
}

interface OptionChainData {
    symbol: string;
    expiry: string;
    ltp: number;
    atm_strike: number;
    strikes: OptionStrike[];
}

interface OptionChainProps {
    symbol: string;
}

const OptionChain: React.FC<OptionChainProps> = ({ symbol }) => {
    const { subscribe, lastMessage, isConnected } = useWebSocket();
    const [chainData, setChainData] = useState<OptionChainData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Live Data Map: { token: { ltp, change, ... } }
    const [liveData, setLiveData] = useState<Record<string, any>>({});

    // Fetch initial chain structure
    useEffect(() => {
        const fetchChain = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/v1/market/option-chain/${encodeURIComponent(symbol)}`);
                const data = await res.json();

                if (res.ok) {
                    setChainData(data);

                    // Collect tokens to subscribe
                    const tokensToSub: string[] = [];
                    data.strikes.forEach((s: OptionStrike) => {
                        if (s.ce_token) tokensToSub.push(s.ce_token);
                        if (s.pe_token) tokensToSub.push(s.pe_token);
                    });

                    if (tokensToSub.length > 0) {
                        subscribe(tokensToSub);
                    }
                } else {
                    setError("Failed to load option chain.");
                }
            } catch (err) {
                console.error(err);
                setError("Network error loading chain.");
            } finally {
                setLoading(false);
            }
        };

        if (symbol) {
            fetchChain();
        }

        return () => {
            // Unsubscribe on unmount? 
            // Ideally yes, but we need to track what we subscribed to.
            // Simplified for now.
        };
    }, [symbol, isConnected]);

    // Update Live Data from WS
    useEffect(() => {
        if (lastMessage) {
            // Message format: { token: "123", ltp: 100.5, oi: 5000, ... }
            const { token, ltp, total_volume, v, vol, oi } = lastMessage;
            if (token) {
                setLiveData(prev => ({
                    ...prev,
                    [token]: {
                        ltp: ltp || prev[token]?.ltp,
                        volume: total_volume || v || vol || prev[token]?.volume,
                        oi: oi || prev[token]?.oi
                    }
                }));
            }
        }
    }, [lastMessage]);

    if (loading) return <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-emerald-500" /></div>;

    if (error) return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className="bg-rose-500/10 text-rose-400 px-4 py-3 rounded-lg border border-rose-500/20 max-w-sm">
                <p className="text-sm font-bold mb-1">Market Data Unavailable</p>
                <p className="text-[10px] opacity-80">Link your broker account or wait for market open to see the live option chain.</p>
            </div>
        </div>
    );

    if (!chainData) return null;

    // Find max OI for normalization of bars
    const maxOI = Math.max(...chainData.strikes.map(s => {
        const ceLive = liveData[s.ce_token]?.oi || s.ce_oi || 0;
        const peLive = liveData[s.pe_token]?.oi || s.pe_oi || 0;
        return Math.max(ceLive, peLive);
    }), 1);

    return (
        <div className="flex flex-col h-full bg-[#0b0e14] text-[11px] select-none overflow-hidden rounded-xl border border-slate-800 shadow-2xl">
            {/* Custom Styles for Smooth Scrollbar */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .opt-chain-scroll::-webkit-scrollbar { width: 6px; }
                .opt-chain-scroll::-webkit-scrollbar-track { background: #0b0e14; }
                .opt-chain-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .opt-chain-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
                .opt-chain-scroll { scrollbar-width: thin; scrollbar-color: #334155 #0b0e14; }
            `}} />

            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800">
                <div className="flex items-center gap-6">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">{chainData.symbol}</h3>
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Fast Option Chain</p>
                    </div>

                    <div className="flex gap-2">
                        <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                            <span className="text-slate-500 text-[9px] uppercase font-bold mr-2">Expiry</span>
                            <span className="text-white font-mono font-bold">{chainData.expiry}</span>
                        </div>
                        <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            <span className="text-emerald-500/70 text-[9px] uppercase font-bold mr-2">Spot</span>
                            <span className="text-emerald-400 font-mono font-bold">{chainData.ltp.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                        <span className="text-blue-400 font-mono font-bold italic">ATM: {chainData.atm_strike}</span>
                    </div>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1fr_60px_60px_50px_80px_1fr_80px_50px_60px_60px_1fr] bg-slate-950/80 font-black text-slate-500 py-3 border-b border-slate-800 text-[10px] uppercase tracking-wider text-center sticky top-0 z-10">
                <div className="col-span-5 grid grid-cols-5 items-center">
                    <span className="text-left pl-4">CALL OI</span>
                    <span>CHANGE</span>
                    <span>IV</span>
                    <span>VOLUME</span>
                    <span>LTP</span>
                </div>

                <div className="bg-slate-800/50 text-white rounded-md mx-2 py-1 shadow-inner italic">Strike</div>

                <div className="col-span-5 grid grid-cols-5 items-center">
                    <span>LTP</span>
                    <span>VOLUME</span>
                    <span>IV</span>
                    <span>CHANGE</span>
                    <span className="text-right pr-4">PUT OI</span>
                </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto opt-chain-scroll">
                {chainData.strikes.map((strike, idx) => {
                    const isATM = strike.strike_price === chainData.atm_strike;

                    // Live Values
                    const ceLive = liveData[strike.ce_token] || {};
                    const peLive = liveData[strike.pe_token] || {};

                    const ceLtp = ceLive.ltp || strike.ce_ltp;
                    const peLtp = peLive.ltp || strike.pe_ltp;
                    const ceOi = ceLive.oi || strike.ce_oi || 0;
                    const peOi = peLive.oi || strike.pe_oi || 0;
                    const ceVol = ceLive.volume || strike.ce_volume || 0;
                    const peVol = peLive.volume || strike.pe_volume || 0;

                    // Bar Percentages
                    const ceOiWidth = (ceOi / maxOI) * 100;
                    const peOiWidth = (peOi / maxOI) * 100;

                    return (
                        <div key={idx} className={`grid grid-cols-[1fr_60px_60px_50px_80px_1fr_80px_50px_60px_60px_1fr] text-center border-b border-slate-800/30 py-2.5 items-center transition-all duration-200 relative group
                            ${isATM ? "bg-emerald-500/5" : "hover:bg-slate-800/30"}`}>

                            {/* CALLS */}
                            <div className="col-span-5 grid grid-cols-5 relative h-full items-center">
                                {/* OI Bar Overlay */}
                                <div className="absolute left-0 h-[30%] bg-rose-500/10 bottom-0 pointer-events-none transition-all duration-500 rounded-r-sm"
                                    style={{ width: `${ceOiWidth}%` }} />

                                <span className="text-slate-300 font-bold pl-4 text-left z-10">{formatNum(ceOi)}</span>
                                <span className={`z-10 ${strike.ce_oi_change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                    {formatNum(strike.ce_oi_change)}
                                </span>
                                <span className="text-slate-500 z-10">{strike.ce_iv?.toFixed(1) || "-"}</span>
                                <span className="text-slate-400 z-10">{formatNum(ceVol)}</span>
                                <span className={`font-mono font-bold z-10 ${getColor(ceLtp, strike.ce_ltp)}`}>
                                    {ceLtp?.toFixed(2) || "-"}
                                </span>
                            </div>

                            {/* STRIKE */}
                            <div className={`font-black font-mono py-1.5 rounded-lg text-xs mx-3 transition-transform group-hover:scale-105
                                ${isATM ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "text-slate-300 bg-slate-800/40"}`}>
                                {strike.strike_price}
                            </div>

                            {/* PUTS */}
                            <div className="col-span-5 grid grid-cols-5 relative h-full items-center">
                                {/* OI Bar Overlay */}
                                <div className="absolute right-0 h-[30%] bg-emerald-500/10 bottom-0 pointer-events-none transition-all duration-500 rounded-l-sm"
                                    style={{ width: `${peOiWidth}%` }} />

                                <span className={`font-mono font-bold z-10 ${getColor(peLtp, strike.pe_ltp)}`}>
                                    {peLtp?.toFixed(2) || "-"}
                                </span>
                                <span className="text-slate-400 z-10">{formatNum(peVol)}</span>
                                <span className="text-slate-500 z-10">{strike.pe_iv?.toFixed(1) || "-"}</span>
                                <span className={`z-10 ${strike.pe_oi_change >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                    {formatNum(strike.pe_oi_change)}
                                </span>
                                <span className="text-slate-300 font-bold pr-4 text-right z-10">{formatNum(peOi)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Helpers
const formatNum = (num: number) => {
    if (!num) return "-";
    if (num > 100000) return (num / 100000).toFixed(2) + "L";
    if (num > 1000) return (num / 1000).toFixed(1) + "k";
    return num.toString();
};

const getColor = (curr: number, prev: number) => {
    if (!curr || !prev) return "text-white";
    if (curr > prev) return "text-emerald-400";
    if (curr < prev) return "text-rose-400";
    return "text-white";
};

export default OptionChain;
