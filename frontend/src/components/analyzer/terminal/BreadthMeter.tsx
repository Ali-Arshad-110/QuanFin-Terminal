import React, { useMemo } from 'react';
import { BarChart3, Activity, Gauge, StretchHorizontal } from 'lucide-react';
import BreadthStockListModal from './BreadthStockListModal';

const BreadthMeter: React.FC = () => {
    const [viewMode, setViewMode] = React.useState<'bar' | 'meter'>('meter');
    const [modalOpen, setModalOpen] = React.useState(false);
    const [modalType, setModalType] = React.useState<'advances' | 'declines'>('advances');
    
    // Mock data based on realistic NSE scenarios (Nifty 500)
    const data = useMemo(() => ({
        advances: 342,
        declines: 158,
        unchanged: 45
    }), []);

    const advancePercent = (data.advances / (data.advances + data.declines)) * 100;
    
    // SVG Gauge Calculations
    const needleRotation = -90 + (advancePercent * 1.8); // -90 to 90 degrees
    
    return (
        <div className="flex flex-col gap-3 p-4 bg-surface dark:bg-surface/30 backdrop-blur-sm border-t border-border-primary animate-in fade-in slide-in-from-left-2 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-text-muted">
                    <Activity size={14} className="text-emerald-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-text-primary">Market Breadth</h3>
                </div>
                
                {/* View Toggle */}
                <div className="flex items-center bg-background/50 dark:bg-background/50 border border-border-primary rounded-md p-0.5 shadow-inner">
                    <button 
                        onClick={() => setViewMode('bar')}
                        className={`p-1 rounded transition-all ${viewMode === 'bar' ? 'bg-indigo-500 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                        title="Bar View"
                    >
                        <StretchHorizontal size={12} />
                    </button>
                    <button 
                        onClick={() => setViewMode('meter')}
                        className={`p-1 rounded transition-all ${viewMode === 'meter' ? 'bg-indigo-500 text-white shadow-lg' : 'text-text-muted hover:text-text-primary'}`}
                        title="Gauge View"
                    >
                        <Gauge size={12} />
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {viewMode === 'bar' ? (
                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-1.5 text-text-muted">
                            <BarChart3 size={12} />
                            <span className="text-[9px] font-bold uppercase tracking-tighter">Advances vs Declines</span>
                        </div>
                        
                        {/* Visual Bar Gauge */}
                        <div className="relative h-2 w-full bg-rose-500/20 rounded-full overflow-hidden flex">
                            <div 
                                className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                style={{ width: `${advancePercent}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-2 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative w-48 h-24 overflow-hidden">
                            {/* SVG Meter */}
                            <svg viewBox="0 0 100 50" className="w-full h-full">
                                {/* Background Arc */}
                                <path 
                                    d="M 10 45 A 35 35 0 0 1 90 45" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    className="text-border-primary"
                                />
                                {/* Progress Arc */}
                                <path 
                                    d="M 10 45 A 35 35 0 0 1 90 45" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    strokeDasharray="125.66"
                                    strokeDashoffset={125.66 - (125.66 * advancePercent / 100)}
                                    className="text-emerald-500 transition-all duration-1000 ease-out drop-shadow-[0_0_3px_rgba(16,185,129,0.4)] dark:drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]"
                                />
                                {/* Needle */}
                                <g transform={`translate(50, 45) rotate(${needleRotation})`}>
                                    <line x1="0" y1="0" x2="0" y2="-38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-primary drop-shadow-[0_0_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_3px_rgba(255,255,255,0.8)]" />
                                    <circle cx="0" cy="0" r="3" fill="currentColor" className="text-text-primary" />
                                </g>
                            </svg>
                            {/* Labels inside meter */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[8px] font-black text-text-muted/60 uppercase tracking-tighter">
                                <span className="text-emerald-500/80">Bullish</span>
                                <span className="text-rose-500/80">Bearish</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center tabular-nums">
                    <div 
                        onClick={() => { setModalType('advances'); setModalOpen(true); }}
                        className="flex flex-col cursor-pointer group/stat hover:scale-105 transition-transform"
                    >
                        <span className="text-[14px] font-black text-emerald-500 group-hover/stat:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all">
                            {data.advances}
                        </span>
                        <span className="text-text-muted text-[8px] font-bold uppercase tracking-tighter group-hover/stat:text-emerald-500/80 transition-colors">Advances</span>
                    </div>
                    <div className="flex flex-col items-center opacity-40">
                        <span className="text-[12px] font-bold text-text-muted">{data.unchanged}</span>
                        <span className="text-text-muted text-[7px] font-bold uppercase">NC</span>
                    </div>
                    <div 
                        onClick={() => { setModalType('declines'); setModalOpen(true); }}
                        className="flex flex-col items-end cursor-pointer group/stat hover:scale-105 transition-transform"
                    >
                        <span className="text-[14px] font-black text-rose-500 group-hover/stat:drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all">
                            {data.declines}
                        </span>
                        <span className="text-text-muted text-[8px] font-bold uppercase tracking-tighter group-hover/stat:text-rose-500/80 transition-colors">Declines</span>
                    </div>
                </div>
            </div>

            {/* Quick Status Bar */}
            <div className="flex gap-1 h-1 mt-1 rounded-full overflow-hidden opacity-30">
                <div className="flex-[342] bg-emerald-500" />
                <div className="flex-[45] bg-text-muted" />
                <div className="flex-[158] bg-rose-500" />
            </div>

            {/* Stock List Modal */}
            <BreadthStockListModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                type={modalType} 
            />
        </div>
    );
};

export default BreadthMeter;
