import React from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import { LayoutGrid, ExternalLink } from 'lucide-react';

interface Peer {
    symbol: string;
    name: string;
    price?: number;
    marketCap?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    logoUrl?: string;
}

interface PeersListProps {
    peers: Peer[];
    currentTicker: string;
    onSelect: (ticker: string) => void;
}

const PeersList: React.FC<PeersListProps> = ({ peers, currentTicker, onSelect }) => {
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');

    const formatMarketCap = (cap?: number) => {
        if (!cap) return 'N/A';
        const cr = cap / 10000000;
        if (cr >= 100000) {
            return `${(cr / 100000).toFixed(2)} L-Cr`;
        }
        return `${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
    };

    if (!peers || peers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <LayoutGrid size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">No sector peers identified for this ticker.</p>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#0b0f14] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className={`border-b ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center w-16">Logo</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Company</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">LTP (₹)</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Market Cap</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">52W Low / High</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right w-20">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/10">
                        {peers.map((peer) => (
                            <tr 
                                key={peer.symbol} 
                                className={`group hover:bg-emerald-500/5 transition-colors cursor-pointer ${peer.symbol === currentTicker ? 'bg-emerald-500/10' : ''}`}
                                onClick={() => onSelect(peer.symbol)}
                            >
                                <td className="px-6 py-3">
                                    <div className="flex justify-center">
                                        <img 
                                            src={peer.logoUrl || `https://www.google.com/s2/favicons?domain=${peer.symbol.toLowerCase()}.com&sz=128`} 
                                            alt={peer.symbol}
                                            className={`w-8 h-8 rounded-lg object-contain border p-1 bg-white ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${peer.symbol}&background=random&color=fff&bold=true`;
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm tracking-tight">{peer.symbol}</span>
                                        <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{peer.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <span className="text-sm font-mono font-black">{peer.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <span className="text-sm font-black text-indigo-400">{formatMarketCap(peer.marketCap)}</span>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex justify-between w-32 text-[9px] font-bold text-slate-500 px-1">
                                            <span>₹{peer.fiftyTwoWeekLow?.toLocaleString('en-IN')}</span>
                                            <span>₹{peer.fiftyTwoWeekHigh?.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className={`w-32 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                                            <div 
                                                className="h-full bg-gradient-to-r from-red-500 via-emerald-500 to-blue-500 rounded-full"
                                                style={{ 
                                                    width: peer.price && peer.fiftyTwoWeekLow && peer.fiftyTwoWeekHigh 
                                                        ? `${Math.min(100, Math.max(0, ((peer.price - peer.fiftyTwoWeekLow) / (peer.fiftyTwoWeekHigh - peer.fiftyTwoWeekLow)) * 100))}%`
                                                        : '0%'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button 
                                        className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${isDark ? 'bg-slate-800 text-emerald-400 border-slate-700' : 'bg-slate-100 text-emerald-600 border-slate-200'} border`}
                                        onClick={(e) => { e.stopPropagation(); onSelect(peer.symbol); }}
                                    >
                                        <ExternalLink size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PeersList;
