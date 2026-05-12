import React, { useState } from 'react';
import { Activity, ArrowRight, BarChart3, TrendingUp, TrendingDown, Layers, Info } from 'lucide-react';
import OptionChain from './OptionChain';
import OIBarChart from './OIBarChart';

const OptionsTerminal: React.FC = () => {
    const [selectedIndex, setSelectedIndex] = useState<'NIFTY' | 'BANKNIFTY' | 'CRUDEOIL'>('NIFTY');
    const marketData = {
        nifty: { price: 22150.45, change: 45.30, changePercent: 0.21, pcr: 0.85 },
        banknifty: { price: 46820.10, change: -120.45, changePercent: -0.26, pcr: 1.12 },
        crudeoil: { price: 6450.00, change: 15.00, changePercent: 0.23, pcr: 0.92 }
    };

    // Mock data for OI Chart
    const oiData = [
        { strike: 22000, callOI: 45000, putOI: 120000 },
        { strike: 22050, callOI: 38000, putOI: 95000 },
        { strike: 22100, callOI: 52000, putOI: 88000 },
        { strike: 22150, callOI: 75000, putOI: 62000 },
        { strike: 22200, callOI: 145000, putOI: 45000 },
        { strike: 22250, callOI: 98000, putOI: 32000 },
    ];

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden p-4 gap-4">
            {/* Top Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <IndexCard
                    name="NIFTY 50"
                    data={marketData.nifty}
                    active={selectedIndex === 'NIFTY'}
                    onClick={() => setSelectedIndex('NIFTY')}
                />
                <IndexCard
                    name="BANK NIFTY"
                    data={marketData.banknifty}
                    active={selectedIndex === 'BANKNIFTY'}
                    onClick={() => setSelectedIndex('BANKNIFTY')}
                />
                <IndexCard
                    name="CRUDEOIL MCX"
                    data={marketData.crudeoil}
                    active={selectedIndex === 'CRUDEOIL'}
                    onClick={() => setSelectedIndex('CRUDEOIL')}
                />


                <PCRCard pcr={selectedIndex === 'NIFTY' ? marketData.nifty.pcr : selectedIndex === 'BANKNIFTY' ? marketData.banknifty.pcr : marketData.crudeoil.pcr} />

                <div className="bg-surface rounded-xl border border-border-primary p-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-text-muted text-xs font-bold uppercase mb-1">
                        <Activity size={14} className="text-indigo-500" />
                        Market Sentiment
                    </div>
                    <div className="text-lg font-bold text-emerald-400">Moderately Bullish</div>
                    <div className="text-[10px] text-text-muted">Data updated every 1 min</div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex gap-4 min-h-0">
                {/* Visual Section: OI Chart */}
                <div className="flex-[0.4] bg-surface rounded-xl border border-border-primary flex flex-col min-h-0">
                    <div className="p-4 border-b border-border-secondary flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2">
                            <BarChart3 size={18} className="text-cyan-400" />
                            OI Distribution (Strike-wise)
                        </h3>
                        <div className="flex items-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-rose-500 rounded"></div> CALL OI</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded"></div> PUT OI</span>
                        </div>
                    </div>
                    <div className="flex-1 p-4 min-h-0">
                        <OIBarChart data={oiData} />
                    </div>
                </div>

                {/* Table Section: Option Chain */}
                <div className="flex-[0.6] bg-surface rounded-xl border border-border-primary flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-border-secondary flex justify-between items-center bg-card/30">
                        <h3 className="font-bold flex items-center gap-2 uppercase tracking-wider text-sm">
                            <Layers size={18} className="text-amber-400" />
                            {selectedIndex} Fast Option Chain
                        </h3>
                        <button className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                            Full Chain View <ArrowRight size={12} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <OptionChain symbol={selectedIndex} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const IndexCard = ({ name, data, active, onClick }: any) => (
    <div
        onClick={onClick}
        className={`bg-surface rounded-xl border p-4 cursor-pointer transition-all ${active ? 'border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-900/10' : 'border-border-primary hover:border-border-secondary'}`}
    >
        <div className="text-xs font-bold text-text-muted uppercase mb-1">{name}</div>
        <div className="text-xl font-mono font-bold text-text-primary">{data.price.toFixed(2)}</div>
        <div className={`text-xs font-medium flex items-center gap-1 ${data.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {data.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(data.change).toFixed(2)} ({Math.abs(data.changePercent).toFixed(2)}%)
        </div>
    </div>
);

const PCRCard = ({ pcr }: { pcr: number }) => (
    <div className="bg-surface rounded-xl border border-border-primary p-4 flex flex-col">
        <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-text-muted uppercase flex items-center gap-1">
                <Info size={12} />
                Put-Call Ratio (PCR)
            </span>
        </div>
        <div className="flex items-end gap-2">
            <div className="text-2xl font-mono font-bold text-text-primary">{pcr.toFixed(2)}</div>
            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 ${pcr > 1.1 ? 'bg-emerald-500/10 text-emerald-400' : pcr < 0.9 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'}`}>
                {pcr > 1.1 ? 'BULLISH' : pcr < 0.9 ? 'BEARISH' : 'NEUTRAL'}
            </div>
        </div>
        <div className="w-full bg-card h-1 rounded-full mt-2 overflow-hidden">
            <div
                className={`h-full transition-all duration-500 ${pcr > 1.1 ? 'bg-emerald-500' : pcr < 0.9 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                style={{ width: `${Math.min(pcr * 50, 100)}%` }}
            ></div>
        </div>
    </div>
);

export default OptionsTerminal;
