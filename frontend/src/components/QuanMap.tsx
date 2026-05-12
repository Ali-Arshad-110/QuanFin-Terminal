import React, { useState } from 'react';
import { 
  Globe2, Building2, Landmark, Scaling, Briefcase, ChevronRight, Zap, Ship
} from 'lucide-react';
import QuanMapPerformance from './quanmap/QuanMapPerformance';
import QuanMapHQCities from './quanmap/QuanMapHQCities';
import QuanMapMarketCap from './quanmap/QuanMapMarketCap';
import QuanMapRegulators from './quanmap/QuanMapRegulators';
import QuanMapCorporateTree from './quanmap/QuanMapCorporateTree';
import QuanMapInstitutionalFlow from './quanmap/QuanMapInstitutionalFlow';
import QuanRadar from './quanmap/QuanRadar';
import { Radar } from 'lucide-react';
import QuanMapMaritime from './quanmap/QuanMapMaritime';
export type QuanMapTab = 'performance' | 'hq-cities' | 'market-cap' | 'regulators' | 'corporate-tree' | 'institutional-flows' | 'maritime';

interface QuanMapProps {
  onNavigate: (view: string) => void;
}

const QuanMap: React.FC<QuanMapProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<QuanMapTab>('performance');
  const [isRadarMode, setIsRadarMode] = useState(false);

  const tabs: { id: QuanMapTab; label: string; icon: React.ReactNode }[] = [
    { id: 'performance', label: 'Global Performance', icon: <Globe2 size={16} /> },
    { id: 'hq-cities', label: 'HQ Cities', icon: <Building2 size={16} /> },
    { id: 'market-cap', label: 'Market Cap', icon: <Landmark size={16} /> },
    { id: 'regulators', label: 'Regulators', icon: <Briefcase size={16} /> },
    { id: 'corporate-tree', label: 'Corporate Tree', icon: <Scaling size={16} /> },
    { id: 'institutional-flows', label: 'Institutional Flows', icon: <Zap size={16} className="text-accent" /> },
    { id: 'maritime', label: 'Maritime Network', icon: <Ship size={16} /> }
  ];

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
      {/* Header & Tabs (Solid UI) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0 shadow-sm z-50">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-text-secondary hover:text-accent transition-all cursor-pointer group" onClick={() => onNavigate('dashboard')}>
            <div className="p-1 rounded-md group-hover:bg-accent/10">
              <ChevronRight size={14} className="rotate-180" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Terminal</span>
          </div>
          
          <div className="h-6 w-px bg-border mx-2" />

          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-xl shadow-lg" 
              style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 10px 15px -3px rgba(var(--accent-rgb), 0.2)' }}
            >
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-text-primary leading-none">QUANMAP</h1>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">AI Synced • Market Active</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-border mx-4" />

          {/* QuanRadar Mode Toggle */}
          <div className="flex items-center space-x-3 bg-background/50 px-4 py-2 rounded-2xl border border-border shadow-inner group">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest leading-none">QuanRadar</span>
                <span className={`text-[8px] font-bold uppercase transition-colors ${isRadarMode ? 'text-accent' : 'text-text-muted'}`}>
                  {isRadarMode ? 'Intelligence Active' : 'Satellite Standby'}
                </span>
             </div>
             <button 
                onClick={() => setIsRadarMode(!isRadarMode)}
                className={`relative w-12 h-6 rounded-full transition-all duration-500 overflow-hidden ${
                  isRadarMode ? 'bg-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]' : 'bg-surface border border-border'
                }`}
             >
                <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full transition-all duration-500 shadow-lg ${
                  isRadarMode ? 'left-7 bg-white' : 'left-1 bg-text-muted'
                }`}>
                   <Radar size={10} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isRadarMode ? 'text-accent animate-spin-slow' : 'text-background'}`} />
                </div>
             </button>
          </div>
        </div>

        {/* Compact Tab Switcher (Global Theme Support) */}
        <div className="flex bg-background/50 backdrop-blur-md border border-border/50 rounded-2xl p-1 space-x-1 shadow-inner">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-black transition-all duration-500 overflow-hidden ${
                  isActive
                    ? 'text-white shadow-lg scale-[1.02]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 grayscale hover:grayscale-0'
                }`}
                style={isActive ? { 
                  backgroundColor: 'var(--color-accent)', 
                  boxShadow: '0 8px 20px -5px rgba(var(--accent-rgb), 0.4)',
                  width: 'auto',
                  minWidth: '44px'
                } : {
                  width: '44px',
                  justifyContent: 'center'
                }}
              >
                <div className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100 opacity-60'}`}>
                  {tab.icon}
                </div>
                {isActive && (
                  <span className="uppercase tracking-tighter animate-in slide-in-from-left-2 fade-in duration-300 whitespace-nowrap">
                    {tab.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map Content Layer */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {isRadarMode ? (
          <QuanRadar />
        ) : (
          <>
            {activeTab === 'performance' && <QuanMapPerformance />}
            {activeTab === 'hq-cities' && <QuanMapHQCities />}
            {activeTab === 'market-cap' && <QuanMapMarketCap />}
            {activeTab === 'regulators' && <QuanMapRegulators />}
            {activeTab === 'corporate-tree' && <QuanMapCorporateTree />}
            {activeTab === 'institutional-flows' && <QuanMapInstitutionalFlow />}
            {activeTab === 'maritime' && <QuanMapMaritime onNavigate={onNavigate} />}
          </>
        )}
      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default QuanMap;
