import React from 'react';

interface FactorPanelProps {
    activeFactors: Set<string>;
    onToggleFactor: (factor: string) => void;
    score: number;
}

const FactorPanel: React.FC<FactorPanelProps> = ({
    activeFactors,
    onToggleFactor,
    score
}) => {

    const factors = [
        { id: 'volatility', label: 'Volatility' },
        { id: 'beta', label: 'Beta' },
        { id: 'drawdown', label: 'Max DD' },
        { id: 'atr', label: 'ATR' },
        { id: 'trendStability', label: 'Trend R²' },
        { id: 'relativeStrength', label: 'Rel Str' },
        { id: 'rsi', label: 'RSI' },
        { id: 'volumeFlow', label: 'Vol Flow' },
        { id: 'deliveryPct', label: 'Delivery %' },
        { id: 'roe', label: 'ROE' },
        { id: 'earningsGrowth', label: 'Growth' }
    ];

    return (
        <div className="flex items-center justify-between px-3 py-1.5 bg-surface border-b border-border-primary z-10 w-full shrink-0 select-none">
            <div className="flex flex-wrap gap-1.5 items-center flex-1">
                {factors.map(f => (
                    <button
                        key={f.id}
                        onClick={() => onToggleFactor(f.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors border ${activeFactors.has(f.id)
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-sm'
                            : 'bg-card text-text-muted border-border-secondary hover:bg-surface hover:text-text-primary'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Quick Health Score */}
            <div className="flex items-center gap-2 pl-3 ml-2 border-l border-border-primary shrink-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Stability</span>
                <div className={`px-2 py-0.5 rounded text-[11px] font-black tabular-nums border ${score > 70 ? 'text-success border-success/30 bg-success/10' : score > 40 ? 'text-warning border-warning/30 bg-warning/10' : 'text-danger border-danger/30 bg-danger/10'}`}>
                    {score}%
                </div>
            </div>
        </div>
    );
};

export default FactorPanel;
