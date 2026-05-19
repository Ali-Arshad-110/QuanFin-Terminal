import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertCircle, Box, Calendar, DollarSign, Layers, ShieldAlert, Activity, TrendingUp } from 'lucide-react';
import { API_BASE } from '../config/api';

interface ContractDetailsProps {
    symbol: string;
}

interface ContractData {
    symbol: string;
    lot_size: number;
    tick_size: number;
    expiry_date: string;
    initial_margin: number;
    delivery_type: string;
    unit: string;
}

interface RiskData {
    symbol: string;
    initial_margin: number;
    exposure_margin: number;
    total_margin: number;
    volatility_daily: string;
    circuit_limit_upper: string;
    circuit_limit_lower: string;
    risk_rating: string;
}

const ContractDetailsPanel: React.FC<ContractDetailsProps> = ({ symbol }) => {
    const [activeTab, setActiveTab] = useState<'specs' | 'risk'>('specs');
    const [details, setDetails] = useState<ContractData | null>(null);
    const [risk, setRisk] = useState<RiskData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!symbol) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Parallel fetch
                const [detailsRes, riskRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/v1/commodities/contract/${symbol}`),
                    axios.get(`${API_BASE}/api/v1/commodities/risk/${symbol}`)
                ]);

                if (detailsRes.data.status === 'success') {
                    setDetails(detailsRes.data.data);
                }
                if (riskRes.data.status === 'success') {
                    setRisk(riskRes.data.data);
                }
            } catch (err) {
                console.error("Error loading data", err);
                setError("Network Error");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol]);

    if (!symbol) return <div className="p-4 text-slate-500 text-sm text-center">Select a commodity to view details</div>;

    return (
        <div className="flex flex-col h-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('specs')}
                        className={`text-sm font-bold flex items-center gap-2 ${activeTab === 'specs' ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Layers size={14} className={activeTab === 'specs' ? "text-emerald-400" : ""} />
                        Specs
                    </button>
                    <button
                        onClick={() => setActiveTab('risk')}
                        className={`text-sm font-bold flex items-center gap-2 ${activeTab === 'risk' ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <ShieldAlert size={14} className={activeTab === 'risk' ? "text-rose-400" : ""} />
                        Risk
                    </button>
                </div>
            </div>

            <div className="p-4 overflow-y-auto">
                {loading ? (
                    <div className="text-slate-500 text-xs text-center py-4">Loading details...</div>
                ) : error ? (
                    <div className="text-rose-500 text-xs text-center py-4">{error}</div>
                ) : (
                    <>
                        {/* Common Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-4">
                            <span className="text-white font-mono font-bold text-lg">{symbol}</span>
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">Active</span>
                        </div>

                        {activeTab === 'specs' && details && (
                            <div className="grid grid-cols-2 gap-4">
                                <DetailItem icon={<Box size={14} />} label="Lot Size" value={`${details.lot_size} ${details.unit}`} />
                                <DetailItem icon={<DollarSign size={14} />} label="Tick Size" value={`₹ ${details.tick_size}`} />
                                <DetailItem icon={<Calendar size={14} />} label="Expiry" value={details.expiry_date} />
                                <DetailItem icon={<ShieldAlert size={14} />} label="Initial Margin" value={`₹ ${(details.initial_margin / 100000).toFixed(2)} L`} />
                                <DetailItem icon={<AlertCircle size={14} />} label="Delivery" value={details.delivery_type} />
                            </div>
                        )}

                        {activeTab === 'risk' && risk && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem icon={<Activity size={14} />} label="Daily Volatility" value={risk.volatility_daily} />
                                    <DetailItem icon={<TrendingUp size={14} />} label="Circuit Limit" value={risk.circuit_limit_upper} />
                                </div>

                                <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-lg">
                                    <h4 className="text-xs text-rose-400 mb-2 font-bold mb-3">Margin Requirements</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Span Margin</span>
                                            <span className="text-slate-200">₹ {risk.initial_margin.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400">Exposure</span>
                                            <span className="text-slate-200">₹ {risk.exposure_margin.toLocaleString()}</span>
                                        </div>
                                        <div className="h-px bg-slate-800 my-1" />
                                        <div className="flex justify-between text-sm font-bold">
                                            <span className="text-slate-300">Total</span>
                                            <span className="text-rose-400">₹ {risk.total_margin.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const DetailItem: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[10px] text-slate-500 flex items-center gap-1">
            {icon} {label}
        </label>
        <div className="text-slate-200 text-sm font-medium">{value}</div>
    </div>
);

export default ContractDetailsPanel;
