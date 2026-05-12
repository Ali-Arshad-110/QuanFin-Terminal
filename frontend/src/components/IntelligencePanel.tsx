
import React from 'react';
import { X, TrendingUp, TrendingDown, Activity, Info, Lock } from 'lucide-react';

interface IntelligencePanelProps {
    node: any;
    isOpen: boolean;
    onClose: () => void;
    mode: 'trader' | 'analyst';
}

const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ node, isOpen, onClose, mode }) => {
    if (!isOpen || !node) return null;

    // Derived signals from node data
    const isBullish = node.changePercent > 0;
    const trendStrength = node.signals?.trend_strength || 50;
    const volumeActivity = node.signals?.volume_activity || 1.0;
    const isHighVol = volumeActivity > 1.5;

    // Color Helpers
    const sentimentColor = isBullish ? 'text-emerald-500' : 'text-rose-500';
    const bgColor = isBullish ? 'bg-emerald-500' : 'bg-rose-500';
    const borderColor = isBullish ? 'border-emerald-500' : 'border-rose-500';

    return (
        <div className={`fixed right-0 top-[64px] bottom-0 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 z-50 overflow-y-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-start backdrop-blur-md bg-slate-900/90 sticky top-0 z-10">
                <div>
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        {node.name}
                        {node.is_driver && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/50">
                                DRIVER
                            </span>
                        )}
                    </h2>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-mono text-white">{node.ltp?.toFixed(2)}</span>
                        <span className={`text-sm font-medium ${sentimentColor}`}>
                            {node.changePercent > 0 ? '+' : ''}{node.changePercent}%
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-8">

                {/* 1. Trend Speedometer (Gauge) */}
                <div className="text-center relative">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Trend Strength</h3>

                    <div className="relative w-48 h-24 mx-auto overflow-hidden">
                        {/* Gauge Background */}
                        <div className="absolute top-0 left-0 w-full h-full rounded-t-full bg-slate-800 border-4 border-slate-700"></div>

                        {/* Gauge Fill (Dynamic) */}
                        <div
                            className={`absolute top-0 left-0 w-full h-full rounded-t-full border-8 ${borderColor} opacity-60 origin-bottom transition-transform duration-1000 ease-out`}
                            style={{ transform: `rotate(${(trendStrength / 100) * 180 - 180}deg)` }}
                        ></div>

                        {/* Needle */}
                        <div
                            className="absolute bottom-0 left-1/2 w-1 h-24 bg-white/80 origin-bottom -translate-x-1/2 transition-transform duration-1000 ease-out"
                            style={{ transform: `rotate(${(trendStrength / 100) * 180 - 90}deg)` }}
                        ></div>

                        {/* Center Pivot */}
                        <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-slate-200 rounded-full -translate-x-1/2 translate-y-1/2 shadow-lg"></div>
                    </div>
                    <div className="flex justify-between w-48 mx-auto mt-2 text-xs font-mono text-slate-500">
                        <span>BEAR</span>
                        <span>NEUTRAL</span>
                        <span>BULL</span>
                    </div>
                </div>

                {/* 2. Signals Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center text-center gap-2">
                        <Activity size={20} className={isHighVol ? 'text-amber-400' : 'text-slate-500'} />
                        <span className="text-xs text-slate-400">Volume</span>
                        <span className={`text-sm font-bold ${isHighVol ? 'text-amber-400' : 'text-slate-300'}`}>
                            {volumeActivity.toFixed(1)}x Normal
                        </span>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center text-center gap-2">
                        {node.signals?.institutional_bias === 'Buy' ? <TrendingUp size={20} className="text-emerald-400" /> : <TrendingDown size={20} className="text-slate-500" />}
                        <span className="text-xs text-slate-400">Instl Bias</span>
                        <span className="text-sm font-bold text-slate-200">{node.signals?.institutional_bias}</span>
                    </div>

                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center text-center gap-2 col-span-2">
                        <span className="text-xs text-slate-400 uppercase">Sector Contribution</span>
                        <div className="w-full h-2 bg-slate-700 rounded-full mt-1 overflow-hidden">
                            <div
                                className={`h-full ${bgColor} transition-all duration-1000`}
                                style={{ width: `${Math.min(Math.abs(node.influence_score || 0), 100)}%` }}
                            ></div>
                        </div>
                        <span className="text-xs text-slate-300 mt-1">
                            {node.influence_score?.toFixed(1)} Points Impact
                        </span>
                    </div>
                </div>

                {/* 3. Analyst Mode: Explanations */}
                {mode === 'analyst' && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                            <Info size={16} className="text-blue-400" />
                            <h4 className="text-sm font-bold text-blue-300">Market Intelligence</h4>
                        </div>
                        <p className="text-sm text-blue-200/80 leading-relaxed">
                            {node.name} is {isBullish ? 'leading' : 'dragging'} the sector today with
                            <span className="text-white font-medium"> {node.changePercent}% </span> move.
                            {isHighVol ? ' High volume suggests strong conviction.' : ' Volume is average.'}
                            Institutional flows appear {node.signals?.institutional_bias.toLowerCase()}.
                        </p>
                    </div>
                )}

                {/* 4. Trader Mode: Hidden Hint */}
                {mode === 'trader' && (
                    <div className="text-center text-xs text-slate-600 mt-4 flex items-center justify-center gap-1 group cursor-help">
                        <Lock size={12} />
                        <span>Analyst notes hidden in Trader Mode</span>
                    </div>
                )}

            </div>
        </div>
    );
};

export default IntelligencePanel;
