import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useMarketStore } from '../store';
import { useStabilityData } from '../hooks/useStabilityData';
import { useComparativeEngine } from '../hooks/useComparativeEngine';
import ChartComponent from './ChartComponent';
import WatchlistPanel from './analyzer/terminal/WatchlistPanel';
import WatchlistIndicesPanel from './analyzer/terminal/WatchlistIndicesPanel';
import MarketSentimentHub from './analyzer/terminal/MarketSentimentHub';
import BreadthMeter from './analyzer/terminal/BreadthMeter';
import { extractErrorMessage } from '../utils/errorUtils';

interface DashboardProps {
    onNavigate?: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { ticker, watchlists, activeWatchlist, dashboardSettings } = useMarketStore();
    const { data, loading, error } = useStabilityData(ticker);

    const {
        symbols: comparisonSymbols,
        mode: comparisonMode,
        loading: compLoading,
        removeSymbol,
        toggleVisibility,
        toggleScale,
        togglePane,
    } = useComparativeEngine();

    const [isMaximized, setIsMaximized] = useState(false);

    const currentWatchlist = watchlists[activeWatchlist] || [];
    const watchlistItem = currentWatchlist.find(w => w.symbol === ticker);

    // Only show the full-screen error if we don't have any data at all (first load failed)
    if (error && !data) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background p-10">
                <div className="flex flex-col items-center gap-4 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-rose-500 mb-2" />
                    <h3 className="text-lg font-bold text-text-primary">Terminal Connection Lost</h3>
                    <p className="text-sm text-text-muted">{extractErrorMessage(error, 'Failed to initialize stability data')}</p>
                </div>
            </div>
        );
    }

    // Use high-res data if available, otherwise fallback to watchlist data for instant UI
    const currentPrice = data?.price?.[data.price.length - 1] || watchlistItem?.price || 0;

    return (
        <div className="flex-1 w-full h-full flex flex-col bg-background text-text-primary overflow-hidden">

            <div className={`flex-1 flex flex-row overflow-hidden ${isMaximized ? 'fixed inset-0 z-[2000] bg-background' : ''}`}>
                {!isMaximized && dashboardSettings.showWatchlist && (
                    <div className="w-[300px] shrink-0 h-full flex flex-col bg-surface border-r border-border-primary overflow-hidden z-10">
                        <div className="flex-1 min-h-0 overflow-hidden">
                            <WatchlistPanel />
                        </div>
                        <BreadthMeter />
                    </div>
                )}

                <div className="flex-1 min-w-0 h-full snap-start relative bg-surface flex flex-col overflow-hidden" id="dashboard-chart-view">
                    {loading && (
                        <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-background/80 px-3 py-1 rounded-full border border-indigo-500/20 backdrop-blur-sm">
                            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Syncing...</span>
                        </div>
                    )}
                    {error && data && (
                        <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 backdrop-blur-sm">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Sync Failed</span>
                        </div>
                    )}
                    <ChartComponent
                        ticker={ticker}
                        comparisonSymbols={comparisonSymbols}
                        comparisonMode={comparisonMode}
                        onToggleComparison={toggleVisibility}
                        onRemoveComparison={removeSymbol}
                        onToggleScale={toggleScale}
                        onTogglePane={togglePane}
                        compLoading={compLoading}
                        currentPrice={currentPrice}
                        isMaximized={isMaximized}
                        onToggleMaximize={() => setIsMaximized(!isMaximized)}
                        onAnalyzeClick={onNavigate ? () => onNavigate('analyzer') : undefined}
                    />
                </div>

                {!isMaximized && dashboardSettings.showIndices && (
                    <div className="w-[280px] shrink-0 h-full flex flex-col bg-surface border-l border-border-primary overflow-hidden z-0 relative">
                        <div className="flex-1 min-h-0 overflow-hidden">
                            <WatchlistIndicesPanel onNavigate={onNavigate} />
                        </div>
                        <MarketSentimentHub />
                    </div>
                )}
            </div>
        </div >
    );
};

export default Dashboard;
