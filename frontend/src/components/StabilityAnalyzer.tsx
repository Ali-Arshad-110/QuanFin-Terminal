import React, { useState } from 'react';
import { useMarketStore } from '../store';
import { useStabilityData } from '../hooks/useStabilityData';
import TerminalHeader from './analyzer/terminal/TerminalHeader';
import ChartComponent from './ChartComponent';
import WatchlistPanel from './analyzer/terminal/WatchlistPanel';
import FundamentalsPanel from './analyzer/terminal/FundamentalsPanel';
import SectorSunburst from './analyzer/terminal/SectorSunburst';
import BottomAnalyticsPanel from './analyzer/terminal/BottomAnalyticsPanel';
import VolumeDeliveryPanel from './analyzer/terminal/VolumeDeliveryPanel';
import ErrorBoundary from './ErrorBoundary';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useComparativeEngine } from '../hooks/useComparativeEngine';

// Pre-defined sector stock mapping
export const SECTOR_MAPPING: Record<string, string[]> = {
    'INDICES': ['NIFTY 50', 'NIFTY BANK', 'NIFTY IT', 'NIFTY AUTO', 'NIFTY METAL', 'NIFTY MIDCAP 50', 'NIFTY FIN SERVICE'],
    'IT': ['TCS', 'INFY', 'HCLTECH', 'WIPRO', 'TECHM', 'LTM'],
    'BANKING': ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK', 'INDUSINDBK'],
    'AUTO': ['M&M', 'TMCV', 'MARUTI', 'BAJAJ-AUTO', 'HEROMOTOCO', 'EICHERMOT'],
    'METAL': ['TATASTEEL', 'HINDALCO', 'JSWSTEEL', 'VEDL', 'COALINDIA'],
    'ENERGY': ['RELIANCE', 'ONGC', 'NTPC', 'POWERGRID', 'BPCL'],
    'FMCG': ['ITC', 'HINDUNILVR', 'NESTLEIND', 'BRITANNIA', 'TATACONSUM'],
    'COMMODITIES': ['CRUDEOIL', 'GOLD', 'SILVER', 'NATURALGAS']
};

interface StabilityAnalyzerProps {
    onBack?: () => void;
}

const StabilityAnalyzer: React.FC<StabilityAnalyzerProps> = ({ onBack }) => {
    const { selectedStock } = useMarketStore();
    const ticker = selectedStock || 'RELIANCE';

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

    const [panelVisibility, setPanelVisibility] = useState({
        watchlist: true,
        indices: true,
        fundamentals: true,
        sunburst: true,
        analytics: true
    });

    const handleSettingsChange = (key: string, value: boolean) => {
        setPanelVisibility(prev => ({ ...prev, [key]: value }));
    };

    // ── First load: show full loading screen ONLY if we have no data yet ──
    if (!data && loading) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                    <p className="text-sm font-medium text-text-secondary">Quantifying Market Stability...</p>
                </div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-background p-6">
                <div className="flex max-w-md flex-col items-center gap-4 text-center">
                    <AlertCircle className="h-16 w-16 text-red-500" />
                    <h2 className="text-xl font-bold text-text-primary">Data Pipeline Interruption</h2>
                    <p className="text-sm text-text-secondary">{error || 'Could not retrieve stability metrics for this symbol.'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Extract current values from the data arrays
    const lastIdx = Math.max(0, (data.price?.length || 1) - 1);
    const currentPrice = data.price?.[lastIdx] ?? 0;
    const prevPrice = data.price?.[lastIdx - 1] ?? currentPrice;
    const change = currentPrice - prevPrice;
    const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0;

    const formattedVolume = data.volume?.[lastIdx] !== undefined 
        ? (data.volume[lastIdx] / 1000000).toFixed(2) 
        : "0.00";
    const formattedMarketCap = data.fundamentals?.marketCap !== undefined 
        ? (data.fundamentals.marketCap / 10000000).toFixed(2) + " Cr" 
        : "0.00 Cr";

    const headerPanelVisibility = {
        watchlist: panelVisibility.watchlist,
        indices: panelVisibility.indices,
        fundamentals: panelVisibility.fundamentals,
        sunburst: panelVisibility.sunburst
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-text-primary font-sans selection:bg-blue-500/30">
            {/* 1. Terminal Header */}
            <TerminalHeader
                symbol={data.symbol}
                name={data.fundamentals.name}
                sector={data.fundamentals.sector}
                price={currentPrice?.toFixed(2) ?? "0.00"}
                change={change?.toFixed(2) ?? "0.00"}
                changePercent={changePercent?.toFixed(2) ?? "0.00"}
                volume={formattedVolume}
                open={data.open?.[lastIdx]?.toFixed(2) ?? "0.00"}
                high={data.high?.[lastIdx]?.toFixed(2) ?? "0.00"}
                low={data.low?.[lastIdx]?.toFixed(2) ?? "0.00"}
                prevClose={prevPrice?.toFixed(2) ?? "0.00"}
                marketCap={formattedMarketCap}
                pe={data.fundamentals?.peRatio?.toFixed(2) ?? "0.00"}
                eps={data.fundamentals?.eps?.toFixed(2) ?? "0.00"}
                div={data.fundamentals?.dividendYield?.toFixed(2) ?? "0.00"}
                onSettingsChange={handleSettingsChange}
                onBack={onBack}
                panelVisibility={headerPanelVisibility}
            />

            {/* Subtle updating indicator when re-fetching (ticker change) */}
            {loading && (
                <div className="h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse shrink-0" />
            )}

            <Group id="main-layout" orientation="horizontal" className="flex-1 overflow-hidden">
                {/* Left Sidebar: Watchlist + 10-Day Volume */}
                {(panelVisibility.watchlist || panelVisibility.indices) && (
                    <>
                        <Panel defaultSize={18} minSize={12} className="flex flex-col h-full bg-surface border-r border-border-primary">
                            <Group orientation="vertical">
                                {panelVisibility.watchlist && (
                                    <Panel defaultSize={60} className="flex flex-col">
                                        <WatchlistPanel />
                                    </Panel>
                                )}
                                {panelVisibility.watchlist && panelVisibility.indices && (
                                    <Separator className="h-[1px] bg-border-primary cursor-row-resize hover:bg-blue-500 transition-colors" />
                                )}
                                {/* Bottom-left: 10-day Volume with Delivery (replaces MajorIndicesPanel) */}
                                {panelVisibility.indices && (
                                    <Panel defaultSize={panelVisibility.watchlist ? 40 : 100} className="flex flex-col">
                                        <VolumeDeliveryPanel ticker={ticker} data={data} />
                                    </Panel>
                                )}
                            </Group>
                        </Panel>
                        <Separator className="w-[1px] bg-border-primary cursor-col-resize hover:bg-blue-500 transition-colors" />
                    </>
                )}

                {/* Middle & Right Grid */}
                <Panel defaultSize={82} className="flex flex-col h-full bg-background">
                    <Group orientation="vertical" className="h-full">

                        {/* Top Area: Main Charts + Right Panel */}
                        <Panel defaultSize={80} className="flex h-full">
                            <Group orientation="horizontal" className="w-full">

                                {/* Center: Chart */}
                                <Panel defaultSize={75} minSize={50} className="flex flex-col h-full relative">

                                    {/* Chart Canvas */}
                                    <div className="flex-1 relative bg-surface w-full h-full flex flex-col overflow-hidden">
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
                                        />
                                    </div>
                                </Panel>

                                {/* Right Sidebar: Fundamentals + MajorIndicesPanel + SectorSunburst */}
                                {(panelVisibility.fundamentals || panelVisibility.sunburst) && (
                                    <>
                                        <Separator className="w-[1px] bg-border-primary cursor-col-resize hover:bg-blue-500 transition-colors" />
                                        <Panel defaultSize={25} minSize={15} className="flex flex-col bg-surface">
                                            <Group orientation="vertical">
                                                {/* Fundamentals (collapsible internally) */}
                                                {panelVisibility.fundamentals && (
                                                    <Panel defaultSize={40} minSize={5} className="flex flex-col overflow-hidden">
                                                        <FundamentalsPanel data={data} />
                                                    </Panel>
                                                )}
                                                {panelVisibility.sunburst && (
                                                    <Panel defaultSize={60} minSize={15} className="flex flex-col">
                                                        <SectorSunburst />
                                                    </Panel>
                                                )}
                                            </Group>
                                        </Panel>
                                    </>
                                )}

                            </Group>
                        </Panel>

                        <Separator className="h-[1px] bg-border-primary cursor-row-resize hover:bg-blue-500 transition-colors" />

                        {/* Bottom Area: Donut Charts + Volume */}
                        <Panel defaultSize={20} minSize={12} className="flex flex-col bg-card">
                            <ErrorBoundary
                                fallback={
                                    <div className="flex h-full items-center justify-center gap-3 text-rose-400">
                                        <AlertCircle size={18} />
                                        <span className="text-xs font-bold">Analytics Panel unavailable</span>
                                    </div>
                                }
                            >
                                <BottomAnalyticsPanel data={data} />
                            </ErrorBoundary>
                        </Panel>

                    </Group>
                </Panel>
            </Group>
        </div>
    );
};

export default StabilityAnalyzer;
