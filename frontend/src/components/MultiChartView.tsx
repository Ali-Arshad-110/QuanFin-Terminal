import React, { useState, useEffect } from 'react';
import {
    Maximize2,
    Minimize2,
    Link as LinkIcon,
    Unlink,
    Zap,
    Layout,
    Activity,
    LayoutGrid,
    Square,
    Columns,
    Clock,
    Crosshair,
    Grid3X3,
    Tally4,
    ZoomIn,
    Search
} from 'lucide-react';
import AnalyticalPanel from './AnalyticalPanel';
import TickerSearch from './TickerSearch';
import { useWorkspaceStore } from '../store/workspaceStore';

const MultiChartView: React.FC = () => {
    const {
        panels,
        layoutType,
        setLayoutType,
        syncSettings,
        updateSyncSettings,
        isLinkedMode,
        toggleLinkedMode,
        setGlobalTicker,
        setGlobalTimeframe,
        globalTicker,
        globalTimeframe,
        addPanel,
        activePanelId
    } = useWorkspaceStore();

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [maximizedPanelId, setMaximizedPanelId] = useState<string | null>(null);

    // Initial Tickers for high-density setups
    const DEFAULT_TICKERS = ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'BHARTIARTL.NS'];

    // Ensure we have enough panels for the selected layout
    useEffect(() => {
        const required = Number(layoutType);
        if (panels.length < required) {
            for (let i = panels.length; i < required; i++) {
                addPanel('chart', DEFAULT_TICKERS[i % DEFAULT_TICKERS.length]);
            }
        }
    }, [layoutType, panels.length, addPanel]);

    // Master Sync Input
    const [masterTicker, setMasterTicker] = useState(globalTicker);
    useEffect(() => {
        // Only update master input from global if in linked mode
        if (isLinkedMode) {
            setMasterTicker(globalTicker);
        } else if (activePanelId) {
            const active = panels.find(p => p.id === activePanelId);
            if (active) setMasterTicker(active.ticker);
        }
    }, [globalTicker, isLinkedMode, activePanelId, panels]);

    const handleMasterSync = () => {
        if (!masterTicker) return;
        setGlobalTicker(masterTicker);
    };

    const handleMasterInterval = (tf: string) => {
        setGlobalTimeframe(tf);
    };

    // Filter active panels based on layout
    const activePanels = panels.slice(0, Number(layoutType));

    // Layout configuration
    const getGridCols = () => {
        if (maximizedPanelId) return 'grid-cols-1 grid-rows-1';
        switch (layoutType) {
            case '1': return 'grid-cols-1 grid-rows-1';
            case '2': return 'grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1';
            case '4': return 'grid-cols-2 grid-rows-2';
            case '6': return 'grid-cols-3 grid-rows-2';
            default: return 'grid-cols-2 grid-rows-2';
        }
    };

    return (
        <div className={`flex flex-col h-full bg-background transition-colors duration-300 ${isFullscreen ? 'fixed inset-0 z-[2000]' : ''}`}>

            {/* ─── Institutional Master Control Bar ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-2 bg-surface border-b border-border-primary/50 shadow-sm z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20">
                            <Tally4 size={18} className="text-white" />
                        </div>
                        <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-text-primary hidden md:block">Workstation</h2>
                    </div>

                    <div className="h-6 w-px bg-border-primary/30 mx-2" />

                    {/* Master Ticker Sync / Active Targeting with Suggestions */}
                    <div className="flex items-center gap-2">
                        <TickerSearch
                            onSelect={(symbol: string) => {
                                setMasterTicker(symbol);
                                setGlobalTicker(symbol);
                            }}
                            initialValue={masterTicker}
                            placeholder={isLinkedMode ? "SYNC ALL..." : "TARGET ACTIVE..."}
                            className="w-48"
                            compact={true}
                            trailingIcon={
                                <button
                                    onClick={handleMasterSync}
                                    className={`transition-colors ${!isLinkedMode ? 'text-amber-500' : 'text-indigo-500'}`}
                                >
                                    {isLinkedMode ? <Zap size={14} fill="currentColor" /> : <Search size={14} />}
                                </button>
                            }
                        />

                        <div className="flex bg-background/50 p-1 rounded-lg border border-border-primary/40">
                            {['1m', '5m', '15m', '1h', '1d'].map(tf => (
                                <button
                                    key={tf}
                                    onClick={() => handleMasterInterval(tf)}
                                    className={`px-3 py-1 text-[10px] font-black rounded-md transition-all uppercase ${globalTimeframe === tf ? 'bg-indigo-500 text-white shadow-md' : 'text-text-muted hover:text-text-primary hover:bg-surface'}`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-6 w-px bg-border-primary/30 mx-2" />

                    {/* Layout Switcher */}
                    <div className="flex bg-background/50 p-1 rounded-lg border border-border-primary/40">
                        <button onClick={() => setLayoutType('1')} className={`p-1.5 rounded-md transition-all ${layoutType === '1' ? 'bg-indigo-500 text-white shadow-md' : 'text-text-muted hover:text-indigo-500'}`} title="Single View"><Square size={14} /></button>
                        <button onClick={() => setLayoutType('2')} className={`p-1.5 rounded-md transition-all ${layoutType === '2' ? 'bg-indigo-500 text-white shadow-md' : 'text-text-muted hover:text-indigo-500'}`} title="Split View"><Columns size={14} /></button>
                        <button onClick={() => setLayoutType('4')} className={`p-1.5 rounded-md transition-all ${layoutType === '4' ? 'bg-indigo-500 text-white shadow-md' : 'text-text-muted hover:text-indigo-500'}`} title="Quad View"><LayoutGrid size={14} /></button>
                        <button onClick={() => setLayoutType('6')} className={`p-1.5 rounded-md transition-all ${layoutType === '6' ? 'bg-indigo-500 text-white shadow-md' : 'text-text-muted hover:text-indigo-500'}`} title="Hex View"><Grid3X3 size={14} /></button>
                    </div>

                    {/* Sync Settings */}
                    <div className="flex bg-background/50 p-1 rounded-lg border border-border-primary/40 ml-2">
                        <button
                            onClick={() => updateSyncSettings({ crosshair: !syncSettings.crosshair })}
                            className={`p-1.5 rounded-md transition-all ${syncSettings.crosshair ? 'bg-teal-500 text-white' : 'text-text-muted hover:text-teal-500'}`}
                            title="Sync Crosshair"
                        >
                            <Crosshair size={14} />
                        </button>
                        <button
                            onClick={() => updateSyncSettings({ zoom: !syncSettings.zoom })}
                            className={`p-1.5 rounded-md transition-all ${syncSettings.zoom ? 'bg-teal-500 text-white' : 'text-text-muted hover:text-teal-500'}`}
                            title="Sync Zoom/Pan"
                        >
                            <ZoomIn size={14} />
                        </button>
                        <button
                            onClick={() => updateSyncSettings({ timeframe: !syncSettings.timeframe })}
                            className={`p-1.5 rounded-md transition-all ${syncSettings.timeframe ? 'bg-teal-500 text-white' : 'text-text-muted hover:text-teal-500'}`}
                            title="Sync Timeframe"
                        >
                            <Clock size={14} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleLinkedMode}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${isLinkedMode ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}
                    >
                        {isLinkedMode ? <LinkIcon size={12} /> : <Unlink size={12} />}
                        {isLinkedMode ? 'MASTER LINK ON' : 'LINK OFF'}
                    </button>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 bg-background/50 rounded-lg border border-border-primary/40 text-text-muted hover:text-indigo-500 transition-colors"
                    >
                        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            {/* ─── Institutional Grid Canvas ────────────────────────────────────────────────── */}
            <div className="flex-1 relative p-2 bg-background overflow-hidden">
                <div className={`grid h-full w-full gap-2 transition-all duration-500 ease-in-out ${getGridCols()}`}>
                    {activePanels.map((panel) => {
                        if (maximizedPanelId && panel.id !== maximizedPanelId) return null;

                        return (
                            <div
                                key={panel.id}
                                className={`relative flex flex-col group rounded-xl border bg-surface transition-all duration-300 ${maximizedPanelId ? 'col-span-1 row-span-1 border-indigo-500/30' :
                                    activePanelId === panel.id ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl' : 'border-border-primary/20 hover:border-border-primary/40'
                                    }`}
                            >
                                {/* Quadrant Controls */}
                                <div className="absolute top-2 right-2 z-50 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button
                                        onClick={() => setMaximizedPanelId(maximizedPanelId === panel.id ? null : panel.id)}
                                        className="p-1.5 bg-background/90 hover:bg-surface text-text-primary rounded-lg border border-border-primary/30 shadow-xl backdrop-blur-sm transition-all"
                                    >
                                        {maximizedPanelId === panel.id ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-hidden pointer-events-auto">
                                    <AnalyticalPanel
                                        id={panel.id}
                                        config={panel}
                                        isMaximized={maximizedPanelId === panel.id}
                                        syncSettings={syncSettings}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Status Info */}
            <div className="px-6 py-1 bg-surface border-t border-border-primary/30 flex justify-between items-center select-none">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase tracking-wider">
                        <Activity size={10} className="text-emerald-500" />
                        Latency: <span className="text-emerald-500">12ms</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase tracking-wider">
                        <Layout size={10} className="text-indigo-500" />
                        Grid: <span className="text-text-primary uppercase tracking-tighter">{layoutType} CHARTS</span>
                    </div>
                </div>
                <div className="text-[9px] font-black text-text-muted uppercase tracking-tighter italic">
                    {isLinkedMode ? 'LINKED MODE ACTIVE' : `TARGETING: ${activePanelId || 'NONE'}`} • {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};

export default MultiChartView;
