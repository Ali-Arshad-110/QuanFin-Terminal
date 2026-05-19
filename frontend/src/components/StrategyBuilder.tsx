import React, { useState } from 'react';
import { Play, TrendingUp, ArrowRight } from 'lucide-react';
import { useMarketStore } from '../store';
import axios from 'axios';
import { API_BASE } from '../config/api';

interface Rule {
    indicator: string;
    op: string;
    value: number;
}

interface StrategyRequest {
    ticker: string;
    interval: string;
    entry_rules: Rule[];
    exit_rules: Rule[];
}

interface BacktestStats {
    initial_capital: number;
    final_equity: number;
    total_return_pct: number;
    total_trades: number;
    win_rate: number;
    profit_factor: number;
}

interface Props {
    onResults: (stats: BacktestStats, trades: any[], signals: any[]) => void;
    className?: string;
}

const StrategyBuilder: React.FC<Props> = ({ onResults, className }) => {
    const { ticker } = useMarketStore();
    const [loading, setLoading] = useState(false);

    // Default simple strategy: RSI Reversal
    const [entryRules, setEntryRules] = useState<Rule[]>([
        { indicator: 'RSI_14', op: '<', value: 30 }
    ]);
    const [exitRules, setExitRules] = useState<Rule[]>([
        { indicator: 'RSI_14', op: '>', value: 70 }
    ]);
    const [interval, setInterval] = useState('1d');

    const updateRule = (isEntry: boolean, index: number, field: keyof Rule, val: string | number) => {
        const updater = isEntry ? setEntryRules : setExitRules;
        const list = isEntry ? [...entryRules] : [...exitRules];

        if (field === 'value') val = Number(val);

        // @ts-ignore
        list[index][field] = val;
        updater(list);
    };

    const runBacktest = async () => {
        setLoading(true);
        try {
            const payload: StrategyRequest = {
                ticker: ticker || 'NIFTY 50',
                interval: interval,
                entry_rules: entryRules,
                exit_rules: exitRules
            };

            const API_URL = import.meta.env.VITE_API_URL || `${API_BASE}`;
            const res = await axios.post(`${API_URL}/api/v1/strategy/backtest`, payload);

            if (res.data.status === 'success') {
                onResults(res.data.stats, res.data.trades, res.data.signals);
            }
        } catch (err: any) {
            console.error("Backtest failed", err);
            alert("Backtest failed: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-slate-900 border-l border-slate-800 ${className}`}>
            <div className="p-4 border-b border-slate-800">
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Strategy Studio
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    Design and backtest algo strategies for <span className="text-white font-mono">{ticker}</span>
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Configuration */}
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Timeframe</label>
                    <select
                        value={interval}
                        onChange={(e) => setInterval(e.target.value)}
                        className="w-full mt-1 bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                        <option value="5m">5 Minute</option>
                        <option value="15m">15 Minute</option>
                        <option value="1h">1 Hour</option>
                        <option value="1d">Daily</option>
                    </select>
                </div>

                {/* Entry Rules */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-emerald-500 uppercase">Entry Conditions (Buy)</label>
                    </div>
                    {entryRules.map((rule, idx) => (
                        <div key={`entry-${idx}`} className="bg-slate-800/50 p-2 rounded border border-slate-700 flex gap-1 items-center">
                            <select
                                value={rule.indicator}
                                onChange={(e) => updateRule(true, idx, 'indicator', e.target.value)}
                                className="bg-transparent text-xs text-white p-1 border-b border-slate-600 focus:border-emerald-500 outline-none w-20"
                            >
                                <option value="RSI_14">RSI (14)</option>
                                <option value="SMA_20">SMA (20)</option>
                                <option value="SMA_50">SMA (50)</option>
                                <option value="EMA_9">EMA (9)</option>
                                <option value="close">Price</option>
                            </select>

                            <select
                                value={rule.op}
                                onChange={(e) => updateRule(true, idx, 'op', e.target.value)}
                                className="bg-transparent text-xs text-cyan-400 p-1 font-bold outline-none w-10 text-center"
                            >
                                <option value="<">&lt;</option>
                                <option value=">">&gt;</option>
                                <option value="=">=</option>
                            </select>

                            <input
                                type="number"
                                value={rule.value}
                                onChange={(e) => updateRule(true, idx, 'value', e.target.value)}
                                className="bg-transparent text-xs text-white p-1 border-b border-slate-600 outline-none w-16 text-right"
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-center">
                    <ArrowRight className="text-slate-600 rotate-90" />
                </div>

                {/* Exit Rules */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-rose-500 uppercase">Exit Conditions (Sell)</label>
                    </div>
                    {exitRules.map((rule, idx) => (
                        <div key={`exit-${idx}`} className="bg-slate-800/50 p-2 rounded border border-slate-700 flex gap-1 items-center">
                            <select
                                value={rule.indicator}
                                onChange={(e) => updateRule(false, idx, 'indicator', e.target.value)}
                                className="bg-transparent text-xs text-white p-1 border-b border-slate-600 focus:border-rose-500 outline-none w-20"
                            >
                                <option value="RSI_14">RSI (14)</option>
                                <option value="SMA_20">SMA (20)</option>
                                <option value="SMA_50">SMA (50)</option>
                                <option value="EMA_9">EMA (9)</option>
                                <option value="close">Price</option>
                            </select>

                            <select
                                value={rule.op}
                                onChange={(e) => updateRule(false, idx, 'op', e.target.value)}
                                className="bg-transparent text-xs text-cyan-400 p-1 font-bold outline-none w-10 text-center"
                            >
                                <option value="<">&lt;</option>
                                <option value=">">&gt;</option>
                                <option value="=">=</option>
                            </select>

                            <input
                                type="number"
                                value={rule.value}
                                onChange={(e) => updateRule(false, idx, 'value', e.target.value)}
                                className="bg-transparent text-xs text-white p-1 border-b border-slate-600 outline-none w-16 text-right"
                            />
                        </div>
                    ))}
                </div>

            </div>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={runBacktest}
                    disabled={loading}
                    className={`
                        w-full py-3 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2
                        transition-all duration-200 shadow-lg
                        ${loading ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white shadow-emerald-900/20'}
                    `}
                >
                    {loading ? (
                        <>Processing...</>
                    ) : (
                        <>
                            <Play className="w-4 h-4 fill-white" />
                            RUN BACKTEST
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default StrategyBuilder;
