import React, { useState } from 'react';
import { useMarketStore } from '../store';
import ChartComponent from './ChartComponent';
import QuanMap from './QuanMap';
import { useComparativeEngine } from '../hooks/useComparativeEngine';
import { useStabilityData } from '../hooks/useStabilityData';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Monitor,
  Activity,
  Globe
} from 'lucide-react';

const CommandCenter: React.FC = () => {
  const { ticker, watchlists, activeWatchlist } = useMarketStore();
  const { data: stabilityData } = useStabilityData(ticker);
  const [splitRatio, setSplitRatio] = useState(50); // 50/50 split

  const {
    symbols: comparisonSymbols,
    mode: comparisonMode,
    loading: compLoading,
    removeSymbol,
    toggleVisibility,
    toggleScale,
    togglePane,
  } = useComparativeEngine();

  const currentWatchlist = watchlists[activeWatchlist] || [];
  const watchlistItem = currentWatchlist.find(w => w.symbol === ticker);
  const currentPrice = stabilityData?.price?.[stabilityData.price.length - 1] || watchlistItem?.price || 0;

  return (
    <div className="flex-1 flex flex-col bg-background text-text-primary overflow-hidden h-full">
      {/* Action Bar (Solid UI) */}
      <div className="h-10 bg-surface border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 bg-indigo-500/10 rounded border border-indigo-500/20">
            <Monitor size={12} className="text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Tactical Control Hub</span>
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
                <Activity size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase text-slate-400">Stream: <span className="text-emerald-500">Live</span></span>
             </div>
             <div className="flex items-center gap-1.5">
                <Globe size={12} className="text-blue-400" />
                <span className="text-[10px] font-bold uppercase text-slate-400">Nodes: <span className="text-blue-400">Global</span></span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSplitRatio(30)}
            className={`p-1.5 rounded transition-colors ${splitRatio === 30 ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            title="Focus Map"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setSplitRatio(50)}
            className={`p-1.5 rounded transition-colors ${splitRatio === 50 ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            title="Balance View"
          >
            <Maximize2 size={14} />
          </button>
          <button 
            onClick={() => setSplitRatio(70)}
            className={`p-1.5 rounded transition-colors ${splitRatio === 70 ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            title="Focus Chart"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Left Pane: Financial Intelligence (Chart) */}
        <div 
          className="h-full border-r border-white/5 transition-all duration-500 ease-in-out overflow-hidden flex flex-col bg-slate-900/20"
          style={{ width: `${splitRatio}%` }}
        >
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

        {/* Right Pane: Geospatial Intelligence (Map) */}
        <div 
          className="h-full transition-all duration-500 ease-in-out overflow-hidden flex flex-col"
          style={{ width: `${100 - splitRatio}%` }}
        >
          <QuanMap onNavigate={() => {}} />
        </div>

        {/* Resize Handle (Visual Only for now) */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-indigo-500/20 hover:bg-indigo-500 cursor-col-resize z-10 transition-colors"
          style={{ left: `${splitRatio}%` }}
        />
      </div>
    </div>
  );
};

export default CommandCenter;
