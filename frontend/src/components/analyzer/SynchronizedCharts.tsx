import React from 'react';
import ChartComponent from '../ChartComponent';

interface SynchronizedChartsProps {
    symbol: string;
}

const SynchronizedCharts: React.FC<SynchronizedChartsProps> = ({ symbol }) => {
    // Note: old bottom factors (trendStability, volatility, relativeStrength)
    // have been removed in favor of Volume Profile & Multi-Chart Support.
    // This wrapper handles only the main ChartComponent now.



    return (
        <div className="flex flex-col flex-1 h-full bg-background p-2 gap-1 custom-scrollbar">
            {/* 1. Price Chart (Main) - Contains Native Volume Profile */}
            <div className="flex-1 relative bg-surface rounded border border-border-primary overflow-hidden shadow-sm flex flex-col min-h-[50%]">
                <ChartComponent ticker={symbol} />
            </div>
        </div>
    );
};

export default SynchronizedCharts;
