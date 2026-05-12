import React, { useEffect, useState } from 'react';
import { useMarketStore } from '../store';
import { AlertCircle, RefreshCw, Lock } from 'lucide-react';
import BrokerLoginModal from './BrokerLoginModal';

interface Holding {
    tradingsymbol: string;
    quantity: number;
    average_price: number;
    last_price: number;
    pnl: number;
    product: string;
}

interface Position {
    tradingsymbol: string;
    quantity: number;
    average_price: number;
    last_price: number;
    pnl: number;
    product: string;
    transaction_type: string;
}

const Portfolio: React.FC = () => {
    const { isBrokerConnected } = useMarketStore();
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [activeTab, setActiveTab] = useState<'holdings' | 'positions'>('holdings');

    const fetchData = async () => {
        if (!isBrokerConnected) return;
        setLoading(true);
        setError(null);
        try {
            // Fetch Holdings
            const hRes = await fetch('http://localhost:8000/api/v1/broker/holdings');
            const hData = await hRes.json();

            // Fetch Positions
            const pRes = await fetch('http://localhost:8000/api/v1/broker/positions');
            const pData = await pRes.json();

            if (hData && Array.isArray(hData.data)) {
                setHoldings(hData.data);
            }
            if (pData && Array.isArray(pData.data)) {
                setPositions(pData.data);
            }
        } catch (err) {
            console.error("Portfolio fetch error", err);
            setError("Failed to load portfolio data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isBrokerConnected) {
            fetchData();
        }
    }, [isBrokerConnected]);

    if (!isBrokerConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-950">
                <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center max-w-md">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} className="text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Connect Your Broker</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Link your Kotak Securities account to view your Holdings and Positions in real-time.
                    </p>
                    <button
                        onClick={() => setShowLogin(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Connect Broker
                    </button>
                </div>
                <BrokerLoginModal
                    isOpen={showLogin}
                    onClose={() => setShowLogin(false)}
                    onLoginSuccess={() => setShowLogin(false)}
                />
            </div>
        );
    }

    const formatCurrency = (val: number) => {
        return val.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-900 bg-slate-950/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Portfolio</h1>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button
                            onClick={() => setActiveTab('holdings')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'holdings'
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Holdings
                        </button>
                        <button
                            onClick={() => setActiveTab('positions')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'positions'
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Positions
                        </button>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl mb-6 flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-400" />
                        {error}
                    </div>
                )}

                {loading && !holdings.length && !positions.length ? (
                    <div className="flex justify-center items-center h-64">
                        <RefreshCw className="animate-spin text-emerald-500" size={32} />
                    </div>
                ) : (
                    <>
                        {activeTab === 'holdings' && (
                            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-900/80 text-slate-400 font-medium border-b border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Instrument</th>
                                            <th className="px-6 py-4 text-right">Qty</th>
                                            <th className="px-6 py-4 text-right">Avg. Price</th>
                                            <th className="px-6 py-4 text-right">LTP</th>
                                            <th className="px-6 py-4 text-right">Current Value</th>
                                            <th className="px-6 py-4 text-right">P&L</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {holdings.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                                    No holdings found.
                                                </td>
                                            </tr>
                                        ) : (
                                            holdings.map((h, i) => {
                                                const currentVal = h.quantity * h.last_price;
                                                const pnl = currentVal - (h.quantity * h.average_price);
                                                const pnlPercent = ((pnl / (h.quantity * h.average_price)) * 100).toFixed(2);

                                                return (
                                                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-white">{h.tradingsymbol}</td>
                                                        <td className="px-6 py-4 text-right">{h.quantity}</td>
                                                        <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(h.average_price)}</td>
                                                        <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(h.last_price)}</td>
                                                        <td className="px-6 py-4 text-right font-medium text-white">{formatCurrency(currentVal)}</td>
                                                        <td className={`px-6 py-4 text-right font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pnlPercent}%)
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'positions' && (
                            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-900/80 text-slate-400 font-medium border-b border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Instrument</th>
                                            <th className="px-6 py-4">Type</th>
                                            <th className="px-6 py-4 text-right">Qty</th>
                                            <th className="px-6 py-4 text-right">Avg. Price</th>
                                            <th className="px-6 py-4 text-right">LTP</th>
                                            <th className="px-6 py-4 text-right">P&L</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {positions.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                                    No active positions.
                                                </td>
                                            </tr>
                                        ) : (
                                            positions.map((p, i) => (
                                                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-white">{p.tradingsymbol}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded textxs font-bold ${p.transaction_type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {p.transaction_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">{p.quantity}</td>
                                                    <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(p.average_price)}</td>
                                                    <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(p.last_price)}</td>
                                                    <td className={`px-6 py-4 text-right font-bold ${p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {p.pnl >= 0 ? '+' : ''}{formatCurrency(p.pnl)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Portfolio;
