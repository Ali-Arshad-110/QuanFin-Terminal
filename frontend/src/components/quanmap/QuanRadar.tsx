import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import { 
  Activity, Radar, 
  Map as MapIcon, Zap, Thermometer, Globe, 
  X, Maximize2, Satellite, 
  TrendingUp, Building2, Clock,
  Search, ChevronLeft, ChevronRight,
  MapPin, Building, RotateCcw, LayoutGrid, List
} from 'lucide-react';
import industrialData from '../../data/industrial_zones.json';
import StockLogo from '../StockLogo';
import { useMarketPulse } from '../../hooks/useMarketPulse';

interface IndustrialNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  sector: string;
  status: string;
  intensity: number;
  company: string;
  isHQ?: boolean;
  city?: string;
}

// Fixed Map Controller (No Shaking Logic)
const MapController: React.FC<{ selected: [number, number] | null; defaultView?: boolean }> = ({ selected, defaultView }) => {
  const map = useMap();
  const prevCoord = useRef<string>("");

  useEffect(() => {
    if (defaultView) {
      map.flyTo([20, 78], 4.5, { duration: 1.5 });
      prevCoord.current = "";
      return;
    }

    if (selected) {
      const coordKey = `${selected[0].toFixed(4)}|${selected[1].toFixed(4)}`;
      if (prevCoord.current !== coordKey) {
        map.flyTo(selected, 17, { duration: 1.8, easeLinearity: 0.25 });
        prevCoord.current = coordKey;
      }
    }
  }, [selected, defaultView, map]);
  return null;
};

const QuanRadar: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeNodes, setActiveNodes] = useState<IndustrialNode[]>([]);
  const [radarRotation, setRadarRotation] = useState(0);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [isRadarActive, setIsRadarActive] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState<IndustrialNode | null>(null);
  const [resetView, setResetView] = useState(false);
  
  // UI State: Border Paneling & Search
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchMode, setSearchMode] = useState<'PLANTS' | 'HQS'>('HQS');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'COMPANY' | 'CITY'>('COMPANY');
  const [isSidebarFullScreen, setIsSidebarFullScreen] = useState(false);
  const [activeSectorFilter, setActiveSectorFilter] = useState<string | null>(null);
  const [cityViewMode, setCityViewMode] = useState<'list' | 'grid'>('list');
  
  const mapCenter: [number, number] = [20, 78];

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveNodes(industrialData);
      setLoading(false);
    }, 1200);

    const animInterval = setInterval(() => {
      if (isRadarActive) {
        setRadarRotation(prev => (prev + 3) % 360);
      }
    }, 30);

    return () => {
      clearTimeout(timer);
      clearInterval(animInterval);
    };
  }, [isRadarActive]);

  // Dual Filter Logic
  const filteredNodes = useMemo(() => {
    if (searchMode === 'HQS') return activeNodes.filter(n => n.isHQ);
    return activeNodes.filter(n => !n.isHQ);
  }, [searchMode, activeNodes]);

  const suggestions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query.length < 2) return [];
    
    return filteredNodes.filter(n => 
      n.name.toLowerCase().includes(query) || 
      n.company.toLowerCase().includes(query) ||
      n.sector.toLowerCase().includes(query) ||
      (n.city && n.city.toLowerCase().includes(query))
    ).sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(query);
      const bStarts = b.name.toLowerCase().startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    }).slice(0, 10);
  }, [searchQuery, filteredNodes]);

  const getBaseCity = (cityStr?: string) => {
    if (!cityStr) return null;
    return cityStr.split('(')[0].trim();
  };

  const cityIntelligence = useMemo(() => {
    if (!selectedCity) return null;
    
    const hqsInCity = activeNodes.filter(n => n.isHQ && getBaseCity(n.city) === selectedCity);
    const sectors = hqsInCity.reduce((acc, n) => {
      acc[n.sector] = (acc[n.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      name: selectedCity,
      totalOffices: hqsInCity.length,
      companies: hqsInCity.map(n => ({
        name: n.company,
        sector: n.sector,
        node: n
      })),
      sectorBreakdown: Object.entries(sectors).sort((a,b) => b[1] - a[1])
    };
  }, [selectedCity, activeNodes]);

  // Extract symbols for market pulse
  const pulseSymbols = useMemo(() => {
    if (!cityIntelligence) return [];
    return cityIntelligence.companies.map(c => {
      const match = c.node.id.replace('hq_', '').toUpperCase();
      return match;
    }).filter(s => s !== '');
  }, [cityIntelligence]);

  const { quotes } = useMarketPulse(pulseSymbols);

  const handleReset = () => {
    setSelectedPlant(null);
    setSelectedCity(null);
    setActiveSectorFilter(null);
    setSearchQuery('');
    setResetView(true);
    setTimeout(() => setResetView(false), 2000);
  };

  const calculateBearing = (lat: number, lng: number) => {
    const y = Math.sin((lng - mapCenter[1]) * Math.PI / 180) * Math.cos(lat * Math.PI / 180);
    const x = Math.cos(mapCenter[0] * Math.PI / 180) * Math.sin(lat * Math.PI / 180) -
              Math.sin(mapCenter[0] * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.cos((lng - mapCenter[1]) * Math.PI / 180);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-background font-sans transition-colors duration-500">
      {loading && (
        <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-background py-20">
          <div className="relative mb-8">
             <div className="w-32 h-32 border-2 border-accent/20 rounded-full animate-ping absolute -inset-4" />
             <div className="w-24 h-24 border-b-2 border-accent rounded-full animate-spin" />
             <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent" size={40} />
          </div>
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-black text-text-primary tracking-[0.5em] uppercase">QUANRADAR STABLE</h2>
            <p className="text-[9px] text-accent/80 font-black animate-pulse uppercase tracking-[0.2em]">Synchronizing Precision Satellite Hubs...</p>
          </div>
        </div>
      )}

      {/* --- CONTROL HUB (Top) --- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] flex items-center space-x-2 bg-surface border border-border p-1 rounded-2xl shadow-2xl">
         <div className="flex items-center px-4 space-x-3 border-r border-border mr-1 relative">
            <div className="relative">
               <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
               <input 
                  type="text"
                  placeholder={`SEARCH ${searchMode}...`}
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background text-[10px] font-black uppercase tracking-widest text-text-primary px-9 py-2.5 rounded-xl border border-border focus:outline-none focus:border-accent w-60 transition-all shadow-inner"
               />
               
               {showSuggestions && suggestions.length > 0 && (
                 <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-2 border-b border-border bg-accent/5">
                        <span className="text-[8px] font-black text-accent uppercase tracking-widest">{searchMode} Matched Hubs</span>
                    </div>
                     <div className="max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner bg-background/50 backdrop-blur-md">
                       {suggestions.map((node) => (
                         <div 
                            key={node.id} 
                            onClick={() => {
                               setSelectedPlant(node);
                               if (node.isHQ) {
                                 setSelectedCity(getBaseCity(node.city));
                                 setSidebarTab('COMPANY');
                               } else {
                                 setSelectedCity(null);
                               }
                               setSearchQuery(node.company);
                               setShowSuggestions(false);
                               setIsSidebarOpen(true);
                            }}
                            className="p-4 hover:bg-accent/20 cursor-pointer border-b border-border/50 last:border-0 group transition-all"
                         >
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-black text-text-primary group-hover:text-accent transition-colors truncate max-w-[70%] uppercase tracking-tight">{node.name.replace(' - CORPORATE HQ', '')}</p>
                              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 uppercase">{node.sector}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                               <div className="flex items-center space-x-1">
                                  <MapPin size={10} className="text-text-muted" />
                                  <span className="text-[9px] font-bold text-text-muted uppercase">{node.city || 'Industrial Zone'}</span>
                               </div>
                               <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{node.isHQ ? 'Active HQ' : 'Operational'}</span>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
            
            <div className="flex bg-background border border-border rounded-xl p-1 space-x-1 shadow-inner">
               {(['PLANTS', 'HQS'] as const).map(mode => (
                 <button
                   key={mode}
                   onClick={() => { setSearchMode(mode); setSearchQuery(''); handleReset(); }}
                   className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${
                     searchMode === mode ? 'bg-accent text-white shadow-lg' : 'text-text-muted hover:text-text-primary'
                   }`}
                 >
                   {mode}
                 </button>
               ))}
            </div>
         </div>
         
         {/* Reset Button */}
         <button 
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-2.5 rounded-xl bg-background border border-border text-text-muted hover:text-accent hover:border-accent/40 transition-all shadow-sm"
            title="Reset View"
         >
            <RotateCcw size={15} />
         </button>

         <button 
            onClick={() => setIsRadarActive(!isRadarActive)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${isRadarActive ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-muted hover:text-text-primary'}`}
         >
            <Radar size={16} className={isRadarActive ? 'animate-spin-slow' : ''} />
            <span className="text-[10px] font-black uppercase tracking-widest">RADAR {isRadarActive ? 'ON' : 'OFF'}</span>
         </button>

         <button 
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'satellite' : 'dark')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all ${mapStyle === 'satellite' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-text-muted hover:text-text-primary'}`}
         >
            {mapStyle === 'satellite' ? <Satellite size={16} /> : <MapIcon size={16} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{mapStyle} VIEW</span>
         </button>
      </div>

      {/* --- TELEMETRY HUD (Left Border Snapped - SOLID UI) --- */}
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 z-[1001] transition-transform duration-500 ${isTelemetryOpen ? 'translate-x-0' : '-translate-x-[calc(100%-24px)]'}`}>
         <div className="flex items-center shadow-2xl">
            <div className="bg-surface border border-border border-l-0 p-5 rounded-r-3xl w-72 h-[380px] flex flex-col">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-2">
                     <Maximize2 size={16} className="text-accent" />
                     <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-primary">Stablized Flow</h3>
                  </div>
                  <div className="flex items-center space-x-1 border border-emerald-500/20 px-2 py-0.5 rounded bg-emerald-500/5">
                     <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">STABLE</span>
                  </div>
               </div>
               
               <div className="flex-1 space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-background p-4 rounded-2xl border border-border shadow-inner">
                        <p className="text-[9px] text-text-muted uppercase font-black mb-1">Satellite Hub</p>
                        <p className="text-lg font-black text-orange-500">HYBRID</p>
                     </div>
                     <div className="bg-background p-4 rounded-2xl border border-border shadow-inner">
                        <p className="text-[9px] text-text-muted uppercase font-black mb-1">Map State</p>
                        <p className="text-lg font-black text-emerald-500 font-mono tracking-tighter">FIXED</p>
                     </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-border">
                     {[
                        { label: 'Map Control Latency', val: '0.1ms', icon: <Zap size={12} className="text-accent" /> },
                        { label: 'Hybrid Layers', val: '2/2', icon: <Building size={12} className="text-blue-500" /> },
                        { label: 'F&O Tickers Traced', val: activeNodes.length, icon: <Building2 size={12} className="text-text-muted" /> }
                     ].map((row, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] font-black">
                           <span className="text-text-muted flex items-center gap-3 uppercase tracking-tighter">{row.icon} {row.label}</span>
                           <span className="text-text-primary font-mono">{row.val}</span>
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="pt-6 mt-auto border-t border-border flex items-center justify-between text-[10px] font-black text-text-muted opacity-40 uppercase tracking-widest">
                  <span>TERMINAL_V5.0</span>
                  <span>PS_0.0MS</span>
               </div>
            </div>
            
            <button 
               onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
               className="bg-surface border border-l-0 border-border py-16 px-1 rounded-r-xl text-text-muted hover:text-accent transition-all cursor-pointer shadow-lg"
            >
               {isTelemetryOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
         </div>
      </div>

       {/* --- SIDEBAR --- */}
      <div className={`absolute top-0 right-0 h-full bg-surface border-l border-border transition-transform duration-700 ease-elastic flex flex-col ${isSidebarFullScreen ? 'w-full z-[1050]' : 'w-[400px] z-[1005]'} ${selectedPlant && isSidebarOpen ? 'translate-x-0 shadow-[-20px_0_60px_rgba(0,0,0,0.4)]' : 'translate-x-[calc(100%+32px)]'}`}>
         {selectedPlant && (
            <div className="flex flex-col h-full relative">
               <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="absolute -left-8 top-1/2 -translate-y-1/2 bg-surface border border-r-0 border-border py-16 px-1 rounded-l-xl text-text-muted hover:text-accent shadow-[-5px_0_15px_rgba(0,0,0,0.1)]"
               >
                  {isSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
               </button>

               {/* TAB SWITCHER (For HQs) */}
               {cityIntelligence && (
                  <div className="flex bg-background border-b border-border">
                     <button 
                        onClick={() => setSidebarTab('COMPANY')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'COMPANY' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-primary'}`}
                     >
                        HQ Details
                     </button>
                     <button 
                        onClick={() => setSidebarTab('CITY')}
                        className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'CITY' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-primary'}`}
                     >
                        City Hub
                     </button>
                  </div>
               )}

               {sidebarTab === 'CITY' && cityIntelligence ? (
                 <>
                   {/* CITY INTELLIGENCE HUB — Compact Header */}
                   <div className="px-5 py-3 border-b border-border bg-background flex items-center gap-4">
                      <div className="flex items-center gap-1.5 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 flex-shrink-0">
                         <MapPin size={11} className="text-orange-500" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">City Hub</span>
                      </div>
                      <h2 className="text-[13px] font-black text-text-primary tracking-tighter uppercase truncate flex-1 min-w-0">{cityIntelligence.name}</h2>
                      <div className="flex items-center gap-3 flex-shrink-0">
                         <div className="flex items-center gap-1">
                            <span className="text-[13px] font-black text-accent">{cityIntelligence.totalOffices}</span>
                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Offices</span>
                         </div>
                         <div className="w-px h-4 bg-border" />
                         <div className="flex items-center gap-1">
                            <span className="text-[13px] font-black text-text-primary">{cityIntelligence.sectorBreakdown.length}</span>
                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Sectors</span>
                         </div>
                         <div className="w-px h-4 bg-border" />
                         
                          <button onClick={() => setIsSidebarFullScreen(!isSidebarFullScreen)} className="p-1.5 hover:bg-surface rounded-lg transition-all text-text-muted hover:text-accent" title="Toggle Full Screen">
                            <Maximize2 size={14} />
                         </button>
                         <button onClick={() => { setSelectedPlant(null); setSelectedCity(null); setActiveSectorFilter(null); setIsSidebarFullScreen(false); }} className="p-1.5 hover:bg-surface rounded-lg transition-all text-text-muted hover:text-red-500">
                            <X size={14} />
                         </button>
                      </div>
                   </div>

                   <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      <div className={`${isSidebarFullScreen ? "grid grid-cols-[1fr_2.5fr] gap-8 max-w-6xl mx-auto w-full items-start" : "space-y-10"}`}>
                      {/* Sector Categories */}
                      <div className="space-y-4">
                         <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Activity size={12} className="text-accent" /> Operations by Category
                         </h3>
                         <div className="grid grid-cols-2 gap-3">
                            {cityIntelligence.sectorBreakdown.map(([sector, count]) => (
                               <div 
                                  key={sector} 
                                  onClick={() => setActiveSectorFilter(activeSectorFilter === sector ? null : sector)}
                                  className={`p-4 rounded-xl shadow-sm transition-all cursor-pointer relative ${isSidebarFullScreen ? (activeSectorFilter === sector ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500 border-t border-r border-b border-border/50' : 'bg-surface/50 border border-border hover:border-accent/40 hover:bg-surface') : (activeSectorFilter === sector ? 'bg-background border border-accent ring-1 ring-accent/30' : 'bg-background border border-border hover:border-accent/40')}`}
                               >
                                  <div className="flex items-start justify-between mb-4">
                                     <span className="text-[11px] font-black text-text-primary uppercase truncate pr-4">{sector}</span>
                                     {isSidebarFullScreen && <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeSectorFilter === sector ? 'bg-emerald-500' : 'bg-text-muted/30'}`} />}
                                  </div>
                                  <div className="flex flex-col">
                                     {!isSidebarFullScreen && (
                                       <span className="text-xs font-black text-accent self-end mb-2">{count}</span>
                                     )}
                                     {isSidebarFullScreen && (
                                       <div className="flex items-end justify-between w-full mt-2">
                                          <div className="flex flex-col">
                                             <span className="text-[9px] font-black text-text-muted mb-0.5">OFFICES</span>
                                             <div className="flex items-center gap-1">
                                                <TrendingUp size={12} className={activeSectorFilter === sector ? 'text-emerald-500' : 'text-accent'} />
                                                <span className={`text-[12px] font-black ${activeSectorFilter === sector ? 'text-emerald-500' : 'text-accent'} tracking-tighter`}>+{count}</span>
                                             </div>
                                          </div>
                                       </div>
                                     )}
                                  </div>
                                  
                                  {!isSidebarFullScreen && (
                                    <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-1">
                                       <div className="h-full bg-accent" style={{ width: `${(count / cityIntelligence.totalOffices) * 100}%` }} />
                                    </div>
                                  )}
                               </div>
                            ))}
                         </div>
                      </div>

                       {/* Registered Companies List */}
                       <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                             <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                               <Building size={12} className="text-orange-500" /> {activeSectorFilter ? activeSectorFilter : 'Registered Office Directory'}
                             </h3>
                             {activeSectorFilter && isSidebarFullScreen && (
                               <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
                                 <button 
                                   onClick={() => setCityViewMode('list')}
                                   className={`p-1.5 rounded-md transition-all ${cityViewMode === 'list' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                   title="List View"
                                 >
                                   <List size={12} />
                                 </button>
                                 <button 
                                   onClick={() => setCityViewMode('grid')}
                                   className={`p-1.5 rounded-md transition-all ${cityViewMode === 'grid' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                   title="Grid View"
                                 >
                                   <LayoutGrid size={12} />
                                 </button>
                               </div>
                             )}
                          </div>

                          {activeSectorFilter ? (
                             <div className={`${isSidebarFullScreen ? "w-full" : "space-y-2"}`}>
                                {cityViewMode === 'list' || !isSidebarFullScreen ? (
                                   <div className={`${isSidebarFullScreen ? "flex flex-col w-full" : "space-y-2"}`}>
                                      {/* TABLE HEADER for FULL SCREEN */}
                                      {isSidebarFullScreen && (
                                        <div className="flex w-full px-2 py-1 border-b border-border/50 mb-1">
                                          <div className="text-[8px] font-black text-text-muted uppercase tracking-widest flex items-center">COMPANY</div>
                                        </div>
                                      )}

                                      {cityIntelligence.companies
                                         .filter(company => company.sector === activeSectorFilter)
                                         .map((company, idx) => {
                                            const symbol = company.node.id.replace('hq_', '').toUpperCase();
                                            const companyFullName = company.name.replace(' - CORPORATE HQ', '');
                                            return (
                                         <div 
                                            key={company.node.id} 
                                            onClick={() => { setSelectedPlant(company.node); setSidebarTab('COMPANY'); }}
                                            className={
                                              isSidebarFullScreen
                                              ? `flex w-full px-4 py-2 border-b border-border/40 hover:bg-surface/50 transition-all cursor-pointer items-center relative group`
                                              : `p-2 rounded-xl border transition-all cursor-pointer group ${selectedPlant?.id === company.node.id ? 'bg-accent/10 border-accent' : 'bg-background border-border hover:border-accent/40'}`
                                            }
                                          >
                                            {/* Left Colored Tick Line for Full screen strictly */}
                                            {isSidebarFullScreen && (
                                               <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${idx % 2 === 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            )}

                                            {isSidebarFullScreen ? (
                                               <>
                                                  <div className="flex-1 flex items-center gap-3 py-0.5">
                                                     <StockLogo symbol={symbol} name={companyFullName} size={8} />
                                                     <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                           <p className="text-[10px] font-black text-text-primary group-hover:text-accent transition-colors tracking-tight truncate">{companyFullName}</p>
                                                           {quotes[symbol] && (
                                                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${quotes[symbol].changePercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                 {quotes[symbol].changePercent >= 0 ? '+' : ''}{quotes[symbol].changePercent.toFixed(2)}%
                                                              </span>
                                                           )}
                                                        </div>
                                                        <p className="text-[8px] font-black text-text-muted mt-0.5 truncate">{symbol}</p>
                                                     </div>
                                                  </div>
                                               </>
                                            ) : (
                                               <>
                                                  <div className="flex justify-between items-center">
                                                     <div className="flex items-center gap-2">
                                                         <p className="text-[11px] font-black text-text-primary group-hover:text-accent transition-colors uppercase tracking-tight">{companyFullName}</p>
                                                         {quotes[symbol] && (
                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${quotes[symbol].changePercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                               {quotes[symbol].changePercent >= 0 ? '+' : ''}{quotes[symbol].changePercent.toFixed(2)}%
                                                            </span>
                                                         )}
                                                      </div>
                                                     <Building2 size={12} className="text-text-muted group-hover:text-accent transition-colors" />
                                                  </div>
                                                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-1">{company.sector}</p>
                                               </>
                                            )}
                                         </div>
                                      )})}
                                   </div>
                                ) : (
                                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                      {cityIntelligence.companies
                                         .filter(company => company.sector === activeSectorFilter)
                                         .map((company) => {
                                            const symbol = company.node.id.replace('hq_', '').toUpperCase();
                                            const companyFullName = company.name.replace(' - CORPORATE HQ', '');
                                            const isSelected = selectedPlant?.id === company.node.id;
                                            return (
                                         <div 
                                            key={company.node.id} 
                                            onClick={() => { setSelectedPlant(company.node); setSidebarTab('COMPANY'); }}
                                            className={`bg-surface/30 border p-4 rounded-xl flex flex-col items-center text-center space-y-3 transition-all cursor-pointer hover:border-accent/40 hover:bg-surface/50 group ${isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border/60'}`}
                                          >
                                            <div className="relative">
                                               <StockLogo symbol={symbol} name={companyFullName} size={12} className="rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
                                               {isSelected && (
                                                 <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background shadow-sm" />
                                               )}
                                            </div>
                                            <div className="flex flex-col w-full overflow-hidden">
                                               <p className="text-[10px] font-black text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-tight uppercase tracking-tight w-full px-1">{companyFullName}</p>
                                                {quotes[symbol] && (
                                                  <div className={`text-[9px] font-black px-2 py-0.5 mt-1 rounded-full inline-block ${quotes[symbol].changePercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                     {quotes[symbol].changePercent >= 0 ? '+' : ''}{quotes[symbol].changePercent.toFixed(2)}%
                                                  </div>
                                                )}
                                               <p className="text-[8px] font-black text-text-muted tracking-widest mt-1">{symbol}</p>
                                            </div>
                                         </div>
                                      )})}
                                   </div>
                                )}
                             </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-12 mt-4 bg-background border border-dashed border-border rounded-2xl animate-in fade-in duration-500">
                               <Activity size={32} className="text-border mb-4" />
                               <p className="text-xs font-black text-text-muted uppercase tracking-widest text-center">Select an operational sector<br/>to reveal registered entities.</p>
                            </div>
                         )}
                      </div>
                     </div>
                   </div>
                 </>
               ) : (
                 <>
                   {/* ORIGINAL PLANT DETAIL VIEW */}
                   <div className="p-8 border-b border-border bg-background">
                      <div className={isSidebarFullScreen ? "max-w-6xl mx-auto w-full" : ""}>
                      <div className="flex justify-between items-start mb-6">
                         <div className="bg-accent/10 px-4 py-1 rounded-full border border-accent/20 flex items-center space-x-2">
                            <Zap size={14} className="text-accent" />
                            <span className="text-[10px] font-black text-accent uppercase tracking-widest">{selectedPlant.isHQ ? 'HQ Strategic Hub' : `${selectedPlant.sector} Asset`}</span>
                         </div>
                         <div className="flex items-center space-x-2">
                           <button onClick={() => setIsSidebarFullScreen(!isSidebarFullScreen)} className="p-2 hover:bg-background rounded-full transition-all text-text-muted hover:text-accent" title="Toggle Full Screen">
                              <Maximize2 size={16} />
                           </button>
                           <button onClick={() => { setSelectedPlant(null); setSelectedCity(null); setActiveSectorFilter(null); setIsSidebarFullScreen(false); setActiveSectorFilter(null); }} className="p-2 hover:bg-background rounded-full transition-all text-text-muted hover:text-red-500">
                              <X size={24} />
                           </button>
                         </div>
                      </div>
                      <h2 className="text-2xl font-black text-text-primary tracking-tighter leading-tight mb-2 uppercase">{selectedPlant.name.replace(' - CORPORATE HQ', '')}</h2>
                      <p className="text-text-muted uppercase tracking-[0.2em] text-[9px] font-black opacity-60">
                        {selectedPlant.isHQ ? `Official Corporate Base • ${selectedPlant.city}` : `Operator: ${selectedPlant.company}`}
                      </p>
                      </div>
                   </div>

                   <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar`}>
                      <div className={`${isSidebarFullScreen ? "grid grid-cols-2 gap-8 items-start max-w-6xl mx-auto w-full" : "space-y-10"}`}>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-background border border-border p-5 rounded-[2rem]">
                              <div className="flex items-center space-x-3 mb-4">
                                 {selectedPlant.isHQ ? <MapPin size={16} className="text-accent" /> : <Thermometer size={16} className="text-orange-500" />}
                                 <span className="text-[9px] font-black uppercase text-text-muted">{selectedPlant.isHQ ? 'Region' : 'Heat Intel'}</span>
                              </div>
                              <p className="text-xl font-black text-text-primary tracking-tighter leading-none uppercase">
                                {selectedPlant.isHQ ? selectedPlant.city : `${(selectedPlant.intensity * 1000).toFixed(0)} μW`}
                              </p>
                           </div>
                           <div className="bg-background border border-border p-5 rounded-[2rem]">
                              <div className="flex items-center space-x-3 mb-4">
                                 <TrendingUp size={16} className="text-emerald-500" />
                                 <span className="text-[9px] font-black uppercase text-text-muted">F&O Delta</span>
                              </div>
                              <p className="text-xl font-black text-emerald-500 tracking-tighter leading-none">{(selectedPlant.intensity * 100).toFixed(1)} <span className="text-xs font-black opacity-30">%</span></p>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-background border border-border p-4 rounded-2xl flex items-center gap-4 hover:border-accent/40 transition-all cursor-pointer group">
                           <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-accent/20 transition-all"><Clock size={16} className="text-blue-500 group-hover:text-accent" /></div>
                           <div>
                              <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Active State</p>
                              <p className="text-[11px] font-black text-text-primary uppercase group-hover:text-accent transition-colors">{selectedPlant.isHQ ? 'Corporate Support Active' : 'Live Operations'}</p>
                           </div>
                        </div>

                        {selectedPlant.isHQ && (
                           <div className="p-5 bg-accent/5 border border-accent/20 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500 mt-4">
                              <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3">Institutional Insight</p>
                              <p className="text-[11px] text-text-primary/80 leading-relaxed font-medium">
                                Strategically located in <span className="text-accent font-black">{selectedPlant.city}</span>, 
                                this facility serves as the centralized steering hub for <span className="text-text-primary font-black">{selectedPlant.company}</span>. 
                                Satellite telemetery confirms 100% operational stability.
                              </p>
                           </div>
                        )}
                      </div>
                      </div>
                   </div>
                 </>
               )}
            </div>
         )}
      </div>

      {/* --- MAP CONTAINER (STABLE & HYBRID) --- */}
      <div className="w-full h-full" onClick={() => setShowSuggestions(false)}>
        <MapContainer
          center={mapCenter}
          zoom={4.5}
          zoomControl={false}
          className="w-full h-full outline-none z-0"
          style={{ background: 'var(--color-background)' }}
        >
          {/* Main Tiles */}
          <TileLayer
            key={mapStyle} // Key switch to force reload correctly
            url={mapStyle === 'dark' 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            }
            attribution='&copy; OpenStreetMap'
          />

          {/* HYBRID LABELS LAYER: Restore city names in Satellite Mode */}
          {mapStyle === 'satellite' && (
            <TileLayer
               url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
               attribution='&copy; CARTO'
               className="leaflet-pane-marker"
            />
          )}

                                {/* Stable Controller (Prevent Shaking) */}
          <MapController selected={selectedPlant ? [selectedPlant.lat, selectedPlant.lng] : null} defaultView={resetView} />

          {filteredNodes.map((node) => {
            const bearing = calculateBearing(node.lat, node.lng);
            const angleDiff = Math.min(Math.abs(radarRotation - bearing), 360 - Math.abs(radarRotation - bearing));
            const isSweepContact = isRadarActive && angleDiff < 15;
            const isSelected = selectedPlant?.id === node.id;

            return (
              <React.Fragment key={node.id}>
                {isSweepContact && (
                  <CircleMarker
                    center={[node.lat, node.lng]}
                    radius={15 + (1 - angleDiff/15) * 40}
                    pathOptions={{
                      fillColor: 'transparent',
                      color: 'rgba(var(--accent-rgb), 0.25)',
                      weight: 1.5,
                      dashArray: '3, 6'
                    }}
                  />
                )}
                
                <CircleMarker
                  center={[node.lat, node.lng]}
                  radius={(isSelected ? 18 : (node.isHQ ? 11 : 7)) + (isSweepContact ? 5 : 0)}
                  eventHandlers={{ click: () => { 
                    setSelectedPlant(node); 
                    if (node.isHQ) {
                      setSelectedCity(getBaseCity(node.city));
                      setSidebarTab('COMPANY');
                    } else {
                      setSelectedCity(null);
                    }
                    setIsSidebarOpen(true); 
                  } }}
                  pathOptions={{
                    fillColor: isSweepContact ? '#fff' : (isSelected ? 'var(--color-accent)' : (node.isHQ ? '#f59e0b' : 'rgba(239, 68, 68, 0.6)')),
                    fillOpacity: isSweepContact ? 1 : (isSelected ? 1 : (node.isHQ ? 0.9 : 0.4)),
                    color: isSelected ? '#fff' : (node.isHQ ? '#fff' : 'rgba(239, 68, 68, 0.8)'),
                    weight: isSelected ? 3 : (node.isHQ ? 2 : 0),
                    className: `cursor-pointer transition-all duration-700 ${isSweepContact ? 'drop-shadow-[0_0_20px_rgba(var(--accent-rgb),1)]' : ''}`
                  }}
                >
                  <Tooltip direction="top" offset={[0, -5]} opacity={1} permanent={isSelected || (node.isHQ && activeNodes.length < 50)}>
                    <div className="px-3 py-1.5 bg-surface border border-border/80 rounded-xl shadow-xl text-[9px] font-black uppercase text-text-primary tracking-widest">
                       {node.isHQ ? node.company.replace(' - CORPORATE HQ', '') : node.name}
                    </div>
                  </Tooltip>
                </CircleMarker>
              </React.Fragment>
            );
          })}

          <ZoomControl position="bottomright" />
        </MapContainer>
      </div>

      {/* --- RADAR SWEEP --- */}
      {isRadarActive && (
        <div className="absolute inset-0 pointer-events-none z-[1000] flex items-center justify-center overflow-hidden">
           <div 
              className="w-[280vmax] h-[280vmax] rounded-full transition-transform duration-[30ms] linear"
              style={{ 
                transform: `rotate(${radarRotation}deg)`,
                background: `conic-gradient(from 0deg at 50% 50%, rgba(var(--accent-rgb), 0.4) 0deg, rgba(var(--accent-rgb), 0) 60deg)`
              }}
           />
        </div>
      )}

      {/* --- FOOTER --- */}
      <div className="absolute bottom-6 left-6 z-[1001] flex items-center space-x-4 bg-surface px-6 py-2.5 rounded-2xl border border-border shadow-2xl">
         <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase text-text-muted">SAT_HYBRID_STABLE_V5.0</span>
         </div>
         <span className="w-px h-4 bg-border" />
         <span className="text-[10px] font-black uppercase text-text-muted tracking-widest font-mono">20.5°N 78.9°E</span>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--color-background); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 40px; }
        .animate-spin-slow { animation: spin 6s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ease-elastic { transition-timing-function: cubic-bezier(0.68, -0.6, 0.32, 1.6); }
        .leaflet-pane-marker { z-index: 600 !important; }
      `}</style>
    </div>
  );
};

export default QuanRadar;
