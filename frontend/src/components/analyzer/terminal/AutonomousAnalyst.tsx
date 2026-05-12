import React from 'react';
import { 
  X, 
  Info, 
  Shield, 
  Ship, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Globe,
  Database
} from 'lucide-react';
import { useMarketStore } from '../../../store';
import { useStabilityData } from '../../../hooks/useStabilityData';
import { useTheme } from '../../../theme/ThemeProvider';

const AutonomousAnalyst: React.FC = () => {
  const { 
    ticker, 
    isIntelligenceSummaryOpen, 
    setIntelligenceSummaryOpen,
    isBrokerConnected 
  } = useMarketStore();
  const { themeMode } = useTheme();
  const isDark = themeMode.includes('dark');
  const { data: stabilityData } = useStabilityData(ticker);

  if (!isIntelligenceSummaryOpen) return null;

  const stabilityScore = stabilityData?.trendStability 
    ? stabilityData.trendStability[stabilityData.trendStability.length - 1] * 100 
    : 84.5;
  const isStable = stabilityScore > 75;

  return (
    <div className={`fixed right-0 top-0 bottom-0 w-80 z-[2000] flex flex-col shadow-2xl transition-all duration-500 animate-in slide-in-from-right border-l ${
      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Header */}
      <div className={`p-5 flex items-center justify-between border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
            <Info size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight leading-none">Intelligence Summary</h3>
            <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase mt-1 tracking-widest`}>Terminal V5 Core</p>
          </div>
        </div>
        <button 
          onClick={() => setIntelligenceSummaryOpen(false)}
          className={`p-2 rounded-full transition-all ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {/* Marketplace Stability */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Market Stability</span>
            <span className={`text-[10px] font-black font-mono ${isStable ? 'text-emerald-500' : 'text-rose-500'}`}>
              {stabilityScore.toFixed(1)}%
            </span>
          </div>
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
            <div className="flex items-center gap-3 mb-2">
              <Shield size={14} className={isStable ? 'text-emerald-500' : 'text-rose-500'} />
              <span className="text-[11px] font-black uppercase">System Pulse: {isStable ? 'Stable' : 'Volatile'}</span>
            </div>
            <p className={`text-[10px] font-bold leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase`}>
              Volatility levels for {ticker} are {isStable ? 'within institutional safety limits' : 'approaching high-risk thresholds'}. 
            </p>
          </div>
        </div>

        {/* Global Trade Flow */}
        <div className="space-y-3">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Global Trade Flow</span>
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Ship size={12} />
                  <span className="text-[8px] font-black uppercase">Marine nodes</span>
                </div>
                <p className="text-sm font-black font-mono">1,248</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-orange-400">
                  <Globe size={12} />
                  <span className="text-[8px] font-black uppercase">Corridors</span>
                </div>
                <p className="text-sm font-black font-mono">14 Active</p>
              </div>
            </div>
            <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-amber-500" />
                <span className="text-[9px] font-black uppercase text-amber-500 animate-pulse">Port Congestion Warning: Mundra</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Insights */}
        <div className="space-y-3">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Tactical Insights</span>
          <div className="space-y-2">
            {[
              { icon: <TrendingUp size={12}/>, text: 'NIFTY IT Momentum accelerating (+1.2%)', color: 'text-emerald-500' },
              { icon: <Zap size={12}/>, text: 'Energy sector tracking crude fluctuations', color: 'text-blue-500' },
              { icon: <Database size={12}/>, text: 'FII Net Position: Neutral/Bullish', color: 'text-indigo-400' }
            ].map((insight, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className={insight.color}>{insight.icon}</div>
                <span className="text-[10px] font-bold uppercase leading-tight">{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`p-5 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isBrokerConnected ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
            <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {isBrokerConnected ? 'Broker Sink: Active' : 'Broker: Disconnected'}
            </span>
          </div>
          <span className={`text-[9px] font-black font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>0.2ms Delay</span>
        </div>
        <button 
          className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 text-[10px] font-black uppercase tracking-[0.2em] ${
            isDark ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
          }`}
        >
          Generate Deep-Report
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? '#1e293b' : '#e2e8f0'};
          border-radius: 10px;
        }
      `}} />
    </div>
  );
};

export default AutonomousAnalyst;
