import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, ZoomControl, useMapEvents, Polyline } from 'react-leaflet';
import { Loader2, Activity, ChevronLeft, ChevronRight, Info, Clock, X, Navigation, TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import OIL_TRADE_FLOW from '../../data/oil_trade_flow.json';
import { API_BASE } from '../../config/api';

// API maps this internally
const nameMapping: Record<string, string> = {
  'United States of America': 'US', 'China': 'CN', 'Japan': 'JP', 'India': 'IN', 'United Kingdom': 'GB',
  'France': 'FR', 'Germany': 'DE', 'Canada': 'CA', 'Australia': 'AU', 'Brazil': 'BR',
  'South Korea': 'KR', 'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL', 'Switzerland': 'CH',
  'Sweden': 'SE', 'South Africa': 'ZA', 'Mexico': 'MX', 'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA',
  'Singapore': 'SG', 'Hong Kong': 'HK', 'Taiwan': 'TW', 'Indonesia': 'ID', 'Malaysia': 'MY',
  'Thailand': 'TH', 'Philippines': 'PH', 'Russia': 'RU', 'Turkey': 'TR', 'Argentina': 'AR',
  'New Zealand': 'NZ', 'Norway': 'NO', 'Denmark': 'DK', 'Iran': 'IR'
};

const REGIONS = {
  GLOBAL: { center: [20, 10] as [number, number], zoom: 2, label: 'Global' },
  APAC: { center: [15, 120] as [number, number], zoom: 4, label: 'Asia Pacific', countries: ['IN', 'CN', 'JP', 'KR', 'AU', 'SG', 'HK', 'TW', 'ID', 'MY', 'TH', 'PH', 'NZ'] },
  EMEA: { center: [45, 15] as [number, number], zoom: 4, label: 'Europe / Middle East', countries: ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'CH', 'SE', 'ZA', 'AE', 'SA', 'RU', 'TR', 'NO', 'DK', 'IR'] },
  AMERICAS: { center: [20, -80] as [number, number], zoom: 3, label: 'Americas', countries: ['US', 'CA', 'BR', 'MX', 'AR'] }
};

interface MarketHours {
  open: number; // UTC hour
  close: number; // UTC hour
}

// Simplified market hours in UTC
const MARKET_HOURS: Record<string, MarketHours> = {
  IN: { open: 3, close: 10 }, 
  US: { open: 13, close: 20 },
  GB: { open: 8, close: 16 },
  JP: { open: 0, close: 6 },
  CN: { open: 1, close: 7 },
  HK: { open: 1, close: 8 },
  DE: { open: 7, close: 15 },
  FR: { open: 7, close: 15 },
  AU: { open: 0, close: 6 }
};

const isMarketOpen = (countryCode: string): boolean => {
  const hours = MARKET_HOURS[countryCode];
  const now = new Date().getUTCHours();
  if (!hours) return now >= 8 && now <= 16;
  return now >= hours.open && now <= hours.close;
};

// Risk Intelligent Profiles
const RISK_PROFILES: Record<string, { type: string[]; inflation: number; rate: number }> = {
  US: { type: ['Rate Hike'], inflation: 3.2, rate: 5.5 },
  IN: { type: ['Oil Dependency'], inflation: 4.8, rate: 6.5 },
  RU: { type: ['War Zone', 'High Inflation'], inflation: 7.4, rate: 16.0 },
  SA: { type: ['Oil Dependency'], inflation: 1.6, rate: 6.0 },
  AE: { type: ['Oil Dependency'], inflation: 2.1, rate: 4.5 },
  TR: { type: ['High Inflation'], inflation: 67.0, rate: 45.0 },
  AR: { type: ['High Inflation'], inflation: 211.0, rate: 100.0 },
  GB: { type: ['Rate Hike'], inflation: 4.0, rate: 5.25 },
  DE: { type: ['Rate Hike'], inflation: 2.9, rate: 4.5 },
  FR: { type: ['Rate Hike'], inflation: 3.1, rate: 4.5 },
  BR: { type: ['High Inflation'], inflation: 4.5, rate: 11.25 },
  MX: { type: ['High Inflation'], inflation: 4.4, rate: 11.25 },
  IR: { type: ['Oil Dependency'], inflation: 45.0, rate: 23.0 }
};

const RISK_TYPES = [
  { id: 'High Inflation', label: 'High Inflation', color: '#FCD34D', desc: 'CPI > 4.0% YoY growth' },
  { id: 'Rate Hike', label: 'Rate Hike', color: '#A78BFA', desc: 'Central Bank tightening cycle active' },
  { id: 'War Zone', label: 'War Zone', color: '#F87171', desc: 'Active conflict or extreme geopolitical tension' },
  { id: 'Oil Dependency', label: 'Oil Dependency', color: '#FB923C', desc: 'Net energy exporters / large oil GDP contribution' }
];

// Synthetic Intelligence Generator for Drill Down
const generateDeepIntel = (indexPerf: number) => {
  const sectors = [
    { name: 'Financials', perf: indexPerf + (Math.random() * 2 - 1) },
    { name: 'Technology', perf: indexPerf + (Math.random() * 2 - 1) },
    { name: 'Energy', perf: indexPerf + (Math.random() * 2 - 1) },
    { name: 'Healthcare', perf: indexPerf + (Math.random() * 2 - 1) },
    { name: 'Consumer', perf: indexPerf + (Math.random() * 2 - 1) },
    { name: 'Industrials', perf: indexPerf + (Math.random() * 2 - 1) }
  ];
  const movers = Array.from({ length: 4 }).map((_, i) => ({
    name: `Asset ${String.fromCharCode(65 + i)}`,
    perf: indexPerf + (Math.random() * 5 - (i > 1 ? 4 : 0))
  }));
  return { sectors, movers, volumeSpike: (Math.random() * 3 + 0.5).toFixed(1) };
};

const MapController: React.FC<{ region: keyof typeof REGIONS }> = ({ region }) => {
  const map = useMapEvents({});
  useEffect(() => {
    const { center, zoom } = REGIONS[region];
    map.flyTo(center, zoom, { duration: 2 });
  }, [region, map]);
  return null;
};

interface IndexData {
  countryCode: string;
  indexName: string;
  exchange: string;
  symbol: string;
  ltp: number;
  change1d: number;
  changePoints: number;
  ytd: number;
  lastTradeDate: string;
}

interface CountryPerformanceData {
  countryCode: string;
  name: string;
  capital: string;
  capitalCoords: { lat: number; lng: number };
  indices: IndexData[];
}

const ZoomTracker: React.FC<{ setZoom: (z: number) => void }> = ({ setZoom }) => {
  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom())
  });
  return null;
};

// Volume Micro-Chart Support
const VolumeMicroChart = ({ data, color }: { data: number[], color: string }) => {
  if (!data || data.length === 0) return <div className="w-12 h-5" />;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end space-x-1 h-5 w-12 opacity-40 group-hover:opacity-100 transition-opacity">
      {data.map((v, i) => (
        <div key={i} className="relative group/bar flex-1 h-full flex flex-col justify-end">
          {/* Tooltip Popup */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/bar:opacity-100 transition-all scale-75 group-hover/bar:scale-100 pointer-events-none z-[1005]">
            <div className="bg-slate-950 border border-white/20 text-[8px] font-mono text-white px-1.5 py-0.5 rounded shadow-2xl whitespace-nowrap">
              {Intl.NumberFormat('en-IN', { notation: 'compact' }).format(v)}
            </div>
            <div className="w-1 h-1 bg-slate-950 border-r border-b border-white/20 rotate-45 mx-auto -mt-0.5" />
          </div>
          
          {/* Actual Bar */}
          <div
            className={`${color} rounded-t-[1px] w-full transition-all hover:brightness-125 cursor-crosshair`}
            style={{ height: `${Math.max((v / max) * 100, 15)}%` }}
          />
        </div>
      ))}
    </div>
  );
};

export const QuanMapPerformance: React.FC = () => {
  const { themeMode } = useTheme();
  const [data, setData] = useState<Record<string, CountryPerformanceData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ content: CountryPerformanceData; geoName: string; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(2);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [useSideHUD, setUseSideHUD] = useState(true);
  const [activeRegion, setActiveRegion] = useState<keyof typeof REGIONS>('GLOBAL');
  const [showActive, setShowActive] = useState(true);
  const [showClosed, setShowClosed] = useState(true);
  const [isLegendVisible, setIsLegendVisible] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [activeHUDTab, setActiveHUDTab] = useState<'OVERVIEW' | 'ENERGY' | 'SECTORS' | 'MOVERS'>('OVERVIEW');
  const [activeRiskFilters, setActiveRiskFilters] = useState<string[]>([]);
  const [showOilExporters, setShowOilExporters] = useState(true);
  const [showOilImporters, setShowOilImporters] = useState(true);
  const [showPerformance, setShowPerformance] = useState(true);
  const [moversData, setMoversData] = useState<{ gainers: any[], losers: any[] } | null>(null);
  const [loadingMovers, setLoadingMovers] = useState(false);
  const [moversError, setMoversError] = useState<string | null>(null);
  const [moversFilter, setMoversFilter] = useState<'GAINERS' | 'LOSERS'>('GAINERS');

  const showOilContext = activeRiskFilters.includes('Oil Dependency');

  const regionalStats = useMemo(() => {
    if (activeRegion === 'GLOBAL') return null;
    const region = REGIONS[activeRegion];
    const countryCodes = (region as any).countries || [];
    const regionData = Object.values(data).filter((d: any) => countryCodes.includes(d.countryCode));
    
    if (regionData.length === 0) return null;

    let advance = 0, decline = 0, totalChange = 0, count = 0;
    regionData.forEach((country: any) => {
      const mainIndex = country.indices?.[0];
      if (mainIndex) {
        if (mainIndex.change1d > 0) advance++;
        else if (mainIndex.change1d < 0) decline++;
        totalChange += mainIndex.change1d;
        count++;
      }
    });

    return { label: region.label, advance, decline, avgPerf: count > 0 ? (totalChange / count).toFixed(2) : '0.00' };
  }, [activeRegion, data]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/v1/quanmap/performance`);
        if (!res.ok) throw new Error('Failed to fetch performance data');
        const json = await res.json();
        const dataMap: Record<string, CountryPerformanceData> = {};
        (json.data || []).forEach((item: CountryPerformanceData) => { dataMap[item.countryCode] = item; });
        const enrichedDataMap = { ...dataMap };
        Object.entries(nameMapping).forEach(([name, iso2]) => { if (dataMap[iso2]) enrichedDataMap[name] = dataMap[iso2]; });
        
        // Ensure ALL Intelligence Layer countries (Producers + Importers) exist
        OIL_TRADE_FLOW.producers.forEach(p => {
          // Add Producer
          if (!enrichedDataMap[p.code]) {
            enrichedDataMap[p.code] = {
              countryCode: p.code,
              name: p.name,
              capital: 'Energy Producer',
              capitalCoords: { lat: p.coords[0], lng: p.coords[1] },
              indices: [{ 
                countryCode: p.code,
                indexName: 'Energy Market', 
                ltp: 0, change1d: 0, changePoints: 0, symbol: `${p.code}_OIL`, exchange: 'INTEL', ytd: 0,
                lastTradeDate: new Date().toISOString()
              }]
            };
          }
          // Add All Export Destinations (Importers like India)
          p.exports.forEach(exp => {
            if (!enrichedDataMap[exp.code]) {
              enrichedDataMap[exp.code] = {
                countryCode: exp.code,
                name: exp.name,
                capital: 'Import Hub',
                capitalCoords: { lat: exp.coords[0], lng: exp.coords[1] },
                indices: [{ 
                  countryCode: exp.code,
                  indexName: 'Energy Demand', 
                  ltp: 0, change1d: 0, changePoints: 0, symbol: `${exp.code}_DEMAND`, exchange: 'INTEL', ytd: 0,
                  lastTradeDate: new Date().toISOString()
                }]
              };
            }
          });
        });

        setData(enrichedDataMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchMovers = async (indexLabel: string) => {
    try {
      setLoadingMovers(true);
      setMoversError(null);
      const res = await fetch(`${API_BASE}/api/v1/market/breadth/${encodeURIComponent(indexLabel)}`);
      if (!res.ok) throw new Error('Failed to fetch movers');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        // Correctly handle result mapping
        const sorted = [...json.data].sort((a, b) => b.changePercent - a.changePercent);
        setMoversData({
          gainers: sorted.slice(0, 5),
          losers: sorted.slice(-5).reverse()
        });
      }
    } catch (err) {
      setMoversError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingMovers(false);
    }
  };

  useEffect(() => {
    if (activeHUDTab === 'MOVERS' && tooltip) {
      const primaryIndex = tooltip.content.indices[0]?.indexName;
      if (primaryIndex) {
        fetchMovers(primaryIndex);
      }
    }
  }, [activeHUDTab, selectedCountry, tooltip]);

  const getColor = (change: number) => {
    if (!change) return themeMode === 'dark' ? '#333333' : '#E5E7EB';
    if (change > 0) {
      if (change > 2.0) return '#10B981';
      if (change > 0.5) return 'rgba(16, 185, 129, 0.7)';
      return 'rgba(16, 185, 129, 0.4)';
    } else {
      if (change < -2.0) return '#EF4444';
      if (change < -0.5) return 'rgba(239, 68, 68, 0.7)';
      return 'rgba(239, 68, 68, 0.4)';
    }
  };

  const countryMarkers = useMemo(() => {
    const unique = Object.values(data).filter((v: CountryPerformanceData, i: number, a: CountryPerformanceData[]) => 
      a.findIndex((t: CountryPerformanceData) => t.countryCode === v.countryCode) === i
    );
    return unique;
  }, [data]);

  return (
    <div className="w-full h-full relative" onMouseLeave={() => setTooltip(null)}>
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
          <p className="text-text-muted font-bold tracking-tight uppercase text-xs">Initializing Decision Machine...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-lg">Error: {error}</div>
        </div>
      )}

      {/* Map Legend (Collapsible) */}
      <div className={`absolute bottom-6 left-6 z-[1001] transition-all duration-500 ease-in-out flex items-end ${isLegendVisible ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%-48px)]'}`}>
        <div className={`bg-surface border border-border p-5 rounded-2xl shadow-2xl w-64 transition-opacity duration-300 ${isLegendVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold flex items-center space-x-2 uppercase tracking-widest text-text-secondary">
              <Activity size={14} className="text-accent" />
              <span>Performance Hub</span>
            </h4>
            <button 
              onClick={() => setShowPerformance(!showPerformance)} 
              className={`px-2 py-1 rounded border text-[9px] font-black transition-all ${showPerformance ? 'bg-accent/10 border-accent/50 text-accent' : 'bg-surface border-border text-text-muted'}`}
            >
              {showPerformance ? 'HIDELAYER' : 'SHOWLAYER'}
            </button>
          </div>

          {showPerformance && (
            <>
              <div className="flex items-center space-x-1">
                <div className="w-8 h-3 rounded-sm bg-[#EF4444]"></div>
                <div className="w-8 h-3 rounded-sm bg-[#EF4444]/70"></div>
                <div className="w-8 h-3 rounded-sm bg-[#EF4444]/40"></div>
                <div className="w-8 h-3 rounded-sm bg-surface-light border border-border"></div>
                <div className="w-8 h-3 rounded-sm bg-[#10B981]/40"></div>
                <div className="w-8 h-3 rounded-sm bg-[#10B981]/70"></div>
                <div className="w-8 h-3 rounded-sm bg-[#10B981]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-text-secondary mt-2">
                <span>&lt; -2%</span><span>0%</span><span>&gt; +2%</span>
              </div>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-border flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">HUD Mode</span>
              <button onClick={() => setUseSideHUD(!useSideHUD)} className="px-2 py-1 bg-surface border border-border rounded-lg text-[10px] font-black text-text-primary flex items-center space-x-1">
                <span className={`w-2 h-2 rounded-full ${useSideHUD ? 'bg-accent shadow-lg shadow-accent/50' : 'bg-text-secondary'}`}></span>
                <span>{useSideHUD ? 'ON' : 'OFF'}</span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary">Labels</span>
              <button 
                onClick={() => setShowAllLabels(!showAllLabels)}
                className="px-2 py-1 bg-surface border border-border rounded-lg text-[10px] font-black text-text-primary flex items-center space-x-1"
              >
                <span className={`w-2 h-2 rounded-full ${showAllLabels ? 'bg-accent shadow-lg shadow-accent/50' : 'bg-text-secondary'}`}></span>
                <span>{showAllLabels ? 'ALL' : 'AUTO'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-border/50">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block mb-1.5">Market Filter</span>
              <div className="flex space-x-2">
                <div className="flex-1 flex flex-col items-center">
                  <button 
                    onClick={() => setShowActive(!showActive)}
                    className={`w-full px-2 py-1.5 rounded-lg border text-[10px] font-black transition-all ${showActive ? 'bg-green-500/10 border-green-500/50 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-surface border-border text-text-muted opacity-40 hover:opacity-100'}`}
                  >
                    ACTIVE
                  </button>
                  <span className="text-[9px] font-bold text-green-500/80 mt-1">
                    {countryMarkers.filter(m => isMarketOpen(m.countryCode)).length} ON
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <button 
                    onClick={() => setShowClosed(!showClosed)}
                    className={`w-full px-2 py-1.5 rounded-lg border text-[10px] font-black transition-all ${showClosed ? 'bg-slate-500/10 border-slate-500/50 text-slate-300' : 'bg-surface border-border text-text-muted opacity-40 hover:opacity-100'}`}
                  >
                    CLOSED
                  </button>
                  <span className="text-[9px] font-bold text-slate-500 mt-1">
                    {countryMarkers.filter(m => !isMarketOpen(m.countryCode)).length} OFF
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block">Geopolitical Risk</span>
              <Info size={12} className="text-text-muted cursor-help" />
            </div>
            <div className="space-y-1.5">
              {RISK_TYPES.map(risk => {
                const affectedCount = countryMarkers.filter((m: any) => RISK_PROFILES[m.countryCode]?.type.includes(risk.id)).length;
                const isActive = activeRiskFilters.includes(risk.id);
                return (
                  <div key={risk.id} className="flex flex-col space-y-2 py-1 border-b border-border/20 last:border-0 group/risk">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isActive}
                          onChange={() => {
                            setActiveRiskFilters((prev: string[]) => 
                              prev.includes(risk.id) ? prev.filter((r: string) => r !== risk.id) : [...prev, risk.id]
                            );
                          }}
                          className="w-3 h-3 rounded border-border bg-surface text-accent accent-accent transition-all"
                        />
                        <span className={`text-[10px] font-bold transition-colors ${isActive ? 'text-text-primary' : 'text-text-muted group-hover/risk:text-text-secondary'}`}>
                          {risk.label}
                        </span>
                      </label>
                      <span className="text-[9px] font-black opacity-50">{affectedCount}</span>
                    </div>

                    {/* Loop in Loop: Nested Energy Sub-Filters */}
                    {risk.id === 'Oil Dependency' && isActive && (
                      <div className="ml-5 flex flex-col space-y-1.5 border-l-2 border-accent/20 pl-3 py-1">
                        <label className="flex items-center justify-between cursor-pointer group/sub">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={showOilExporters}
                              onChange={() => setShowOilExporters(!showOilExporters)}
                              className="w-2.5 h-2.5 rounded-full border-orange-500/50 appearance-none border checked:bg-orange-500 transition-all" 
                            />
                            <span className="text-[9px] font-black uppercase text-orange-400 opacity-70 group-hover/sub:opacity-100">Exporters</span>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></div>
                        </label>
                        <label className="flex items-center justify-between cursor-pointer group/sub">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={showOilImporters}
                              onChange={() => setShowOilImporters(!showOilImporters)}
                              className="w-2.5 h-2.5 rounded-full border-cyan-500/50 appearance-none border checked:bg-cyan-500 transition-all" 
                            />
                            <span className="text-[9px] font-black uppercase text-cyan-400 opacity-70 group-hover/sub:opacity-100">Importers</span>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend Toggle Button */}
        <button 
          onClick={() => setIsLegendVisible(!isLegendVisible)}
          className={`ml-2 p-3 bg-surface border border-border rounded-2xl shadow-2xl text-text-secondary hover:text-accent transition-all duration-300 mb-0.5`}
        >
          {isLegendVisible ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <MapContainer center={[20, 10]} zoom={2} minZoom={2} maxZoom={8} zoomControl={false} className="w-full h-full z-0" style={{ background: themeMode === 'dark' ? '#05070a' : '#f8fafc' }}>
        <MapController region={activeRegion} />
        <ZoomTracker setZoom={setZoom} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>' />
        <ZoomControl position="topright" />

        {countryMarkers.filter(m => {
          const { countryCode } = m;
          const open = isMarketOpen(countryCode);
          
          // 1. Market Status Filter
          if (open && !showActive) return false;
          if (!open && !showClosed) return false;
          
          // 2. Risk Filter (Match ANY of the selected risks)
          if (activeRiskFilters.length > 0) {
            return activeRiskFilters.some(riskId => {
              if (riskId === 'Oil Dependency') {
                const isProducer = OIL_TRADE_FLOW.producers.some(p => p.code === countryCode);
                const isImporter = OIL_TRADE_FLOW.producers.some(p => p.exports.some(e => e.code === countryCode));
                if (showOilExporters && isProducer) return true;
                if (showOilImporters && isImporter) return true;
                return false;
              }
              return RISK_PROFILES[countryCode]?.type.includes(riskId);
            });
          }
          return true;
        }).map((m: any) => {
          const { countryCode, capitalCoords, name, indices } = m;
          const open = isMarketOpen(countryCode);
          const isHovered = hoveredCountry === countryCode;
          const isVisible = showAllLabels || zoom >= 2.5 || isHovered;
          const _change = indices?.[0]?.change1d || 0;
          const fillColor = getColor(_change);
          const radius = isHovered ? 12 : 8;

          const isProducer = OIL_TRADE_FLOW.producers.some(p => p.code === countryCode);
          const isImporterOfOil = OIL_TRADE_FLOW.producers.some(p => p.exports.some(e => e.code === countryCode));

          return capitalCoords && capitalCoords.lat !== 0 && (
            <React.Fragment key={countryCode}>
              {open && showPerformance && (
                <CircleMarker
                  center={[capitalCoords.lat, capitalCoords.lng]}
                  radius={radius + 8}
                  pathOptions={{ fillColor: fillColor, fillOpacity: 0.1, color: fillColor, weight: 1, className: 'animate-pulse' }}
                />
              )}
              {showPerformance && (
                <CircleMarker
                  center={[capitalCoords.lat, capitalCoords.lng]}
                  radius={radius}
                  pathOptions={{ fillColor: fillColor, fillOpacity: isHovered || selectedCountry === countryCode ? 0.9 : (open ? 0.8 : 0.4), color: themeMode === 'dark' ? '#000' : '#fff', weight: 1 }}
                  eventHandlers={{
                    mouseover: (e) => {
                      setHoveredCountry(countryCode);
                      if (!selectedCountry) setTooltip({ content: m, geoName: name, x: e.originalEvent.clientX, y: e.originalEvent.clientY });
                    },
                    mouseout: () => { setHoveredCountry(null); if (!selectedCountry) setTooltip(null); },
                    click: (e) => {
                      setSelectedCountry(countryCode === selectedCountry ? null : countryCode);
                      if (countryCode !== selectedCountry) {
                        setTooltip({ content: m, geoName: name, x: e.originalEvent.clientX, y: e.originalEvent.clientY });
                        e.target._map.flyTo([capitalCoords.lat, capitalCoords.lng], 5, { duration: 1.5 });
                        // Smart Switching: Auto-open Energy Matrix if Oil Dependency filter is active
                        if (activeRiskFilters.includes('Oil Dependency')) {
                          setActiveHUDTab('ENERGY');
                        }
                      } else {
                        setTooltip(null);
                      }
                    }
                  }}
                  interactive={true}
                >
                  <LeafletTooltip direction="top" offset={[0, -radius]} opacity={isVisible ? 1 : 0} permanent className={`bg-transparent border-none shadow-none p-0 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest bg-black/40 px-1 rounded" style={{ textShadow: '0 1px 2px #000' }}>{name}</span>
                      <span className={`text-[8px] font-bold ${open ? 'text-green-400' : 'text-slate-400'}`}>{open ? '● LIVE' : 'CLOSED'}</span>
                    </div>
                  </LeafletTooltip>
                </CircleMarker>
              )}

              {/* Enhanced Oil Visuals */}
              {showOilContext && isProducer && (
                <CircleMarker
                  center={[capitalCoords.lat, capitalCoords.lng]}
                  radius={radius + 12}
                  pathOptions={{ fillColor: '#FB923C', fillOpacity: 0.1, color: '#FB923C', weight: 2, className: 'animate-pulse' }}
                />
              )}
              {showOilContext && isImporterOfOil && !isProducer && (
                <CircleMarker
                  center={[capitalCoords.lat, capitalCoords.lng]}
                  radius={radius + 12}
                  pathOptions={{ fillColor: '#22D3EE', fillOpacity: hoveredCountry === countryCode ? 0.3 : 0.1, color: '#22D3EE', weight: 2, dashArray: '3, 3' }}
                />
              )}

              {/* Risk Glows */}
              {activeRiskFilters.map((riskId: string, riskIdx: number) => {
                const riskInfo = RISK_TYPES.find(r => r.id === riskId);
                const isProfileMatch = RISK_PROFILES[countryCode]?.type.includes(riskId);
                if (!isProfileMatch || !riskInfo) return null;
                return (
                  <CircleMarker
                    key={`${countryCode}-${riskId}`}
                    center={[capitalCoords.lat, capitalCoords.lng]}
                    radius={radius + 15 + (riskIdx * 5)}
                    pathOptions={{ fillColor: riskInfo.color, fillOpacity: 0.05, color: riskInfo.color, weight: 1.5, dashArray: '5, 5', className: 'animate-pulse' }}
                  />
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Trade Flow Intelligence Layer (Simplified for Visibility) */}
        {showOilContext && (hoveredCountry || selectedCountry) && (() => {
          const activeId = hoveredCountry || selectedCountry;
          if (!activeId) return null;
          const isProd = OIL_TRADE_FLOW.producers.some(p => p.code === activeId);
          const prodData = OIL_TRADE_FLOW.producers.find(p => p.code === activeId);
          
          if (isProd && prodData && showOilExporters) {
            return prodData.exports.map((destination: any) => (
              <React.Fragment key={`supply-${activeId}-${destination.code}`}>
                {/* Fixed Base Line */}
                <Polyline 
                  positions={[prodData.coords as [number, number], destination.coords as [number, number]]} 
                  pathOptions={{ color: '#FF3D00', weight: 2, opacity: 0.4, interactive: false }} 
                />
                {/* Animated Pulse */}
                <Polyline 
                  positions={[prodData.coords as [number, number], destination.coords as [number, number]]} 
                  pathOptions={{ 
                    color: '#FF3D00', weight: 8, opacity: 1, 
                    dashArray: '10, 100', lineCap: 'round', 
                    className: 'animate-oil-flow', interactive: false 
                  }} 
                />
              </React.Fragment>
            ));
          } else if (!isProd && showOilImporters) {
            return OIL_TRADE_FLOW.producers.filter(p => !isProd && p.exports.some(e => e.code === activeId)).map((producer) => {
              const destCoords = producer.exports.find((e: any) => e.code === activeId)?.coords;
              if (!destCoords) return null;
              return (
                <React.Fragment key={`demand-${producer.code}-${activeId}`}>
                  {/* Fixed Base Line */}
                  <Polyline 
                    positions={[producer.coords as [number, number], destCoords as [number, number]]} 
                    pathOptions={{ color: '#00E5FF', weight: 2, opacity: 0.4, interactive: false }} 
                  />
                  {/* Animated Pulse */}
                  <Polyline 
                    positions={[producer.coords as [number, number], destCoords as [number, number]]} 
                    pathOptions={{ 
                      color: '#00E5FF', weight: 8, opacity: 1, 
                      dashArray: '10, 100', lineCap: 'round', 
                      className: 'animate-oil-flow', interactive: false 
                    }} 
                  />
                </React.Fragment>
              );
            });
          }
          return null;
        })()}
      </MapContainer>

      {/* Control Deck */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] flex items-center bg-surface/80 backdrop-blur-xl border border-border p-1.5 rounded-2xl shadow-2xl">
        {(Object.keys(REGIONS) as (keyof typeof REGIONS)[]).map((reg) => (
          <button
            key={reg}
            onClick={() => setActiveRegion(reg)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRegion === reg ? 'bg-accent text-white shadow-lg' : `${themeMode === 'dark' ? 'text-slate-100/50 hover:text-white hover:bg-white/5' : 'text-slate-500/80 hover:text-slate-900 hover:bg-slate-100'}`}`}
          >
            {REGIONS[reg].label}
          </button>
        ))}
      </div>

      {/* Intelligence HUD */}
      {(tooltip || regionalStats) && (
        <div 
          className={useSideHUD 
            ? `absolute right-6 top-6 bottom-6 w-[400px] z-[1001] backdrop-blur-md border rounded-3xl p-6 flex flex-col shadow-2xl animate-in slide-in-from-right-10 duration-300 pointer-events-auto ${themeMode === 'dark' ? 'bg-slate-950/95 border-white/10' : 'bg-white/95 border-slate-200'}` 
            : `fixed pointer-events-none z-[2001] backdrop-blur-md border shadow-2xl rounded-2xl p-5 min-w-[340px] transform translate-x-5 -translate-y-1/2 ${themeMode === 'dark' ? 'bg-slate-950/95 border-white/10' : 'bg-white/95 border-slate-200'}`}
          style={useSideHUD ? {} : { left: tooltip?.x || 0, top: tooltip?.y || 0 }}
        >
          <div className="flex justify-between items-start mb-6 pb-6 border-b border-border/50">
            {tooltip ? (
              <div className="flex items-center space-x-4">
                <img src={`https://flagcdn.com/w80/${tooltip.content.countryCode.toLowerCase()}.png`} className="w-12 h-8 object-cover rounded shadow border border-border/20" alt="flag" />
                <div>
                  <h3 className={`font-extrabold text-2xl drop-shadow-md ${themeMode === 'dark' ? 'text-slate-50' : 'text-slate-900'}`}>{tooltip.geoName}</h3>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest tracking-tighter">{tooltip.content.capital} {selectedCountry ? 'INTELLIGENCE' : 'SNAPSHOT'}</p>
                </div>
              </div>
            ) : regionalStats ? (
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-accent/20 rounded-2xl"><Activity className="text-accent" /></div>
                <div>
                  <h3 className={`font-extrabold text-2xl uppercase tracking-tighter drop-shadow-md ${themeMode === 'dark' ? 'text-slate-50' : 'text-slate-900'}`}>{regionalStats.label}</h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Regional Intelligence Hub</p>
                </div>
              </div>
            ) : null}
            {selectedCountry && (
              <button 
                onClick={() => { setSelectedCountry(null); setTooltip(null); }}
                className={`p-2 rounded-full transition-colors ${themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-200/50'}`}
              >
                <X size={20} className="text-text-muted" />
              </button>
            )}
          </div>
          {/* HUD Tab Navigation (Institutional Split) */}
          {tooltip && (
            <div className={`flex p-1 border rounded-xl mb-6 ${themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
              {(['OVERVIEW', 'ENERGY', 'SECTORS', 'MOVERS'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveHUDTab(tab)}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${activeHUDTab === tab ? 'bg-accent text-white shadow-lg' : `text-text-muted hover:text-text-secondary ${themeMode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-200/50'}`}`}
                >
                  {tab === 'OVERVIEW' ? 'Indices' : tab}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {tooltip ? (
              activeHUDTab === 'OVERVIEW' ? (
                <div className="space-y-4">
                  {(tooltip.content.indices as any[]).map((idx: any) => (
                    <div key={idx.symbol} className={`p-4 rounded-2xl border ${themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between mb-3 text-xs font-black">
                        <span className={themeMode === 'dark' ? 'text-slate-100' : 'text-slate-900'}>{idx.indexName}</span>
                        <span className="text-[10px] text-text-muted">{idx.exchange}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className={`font-mono text-2xl font-bold ${themeMode === 'dark' ? 'text-slate-50' : 'text-slate-900'}`}>{idx.ltp.toLocaleString()}</span>
                        <div className="text-right flex flex-col items-end">
                          <span className={`font-mono text-[11px] font-bold ${idx.changePoints >= 0 ? 'text-green-500/80' : 'text-red-500/80'}`}>
                            {idx.changePoints > 0 ? '+' : ''}{idx.changePoints.toLocaleString()}
                          </span>
                          <span className={`font-mono text-lg font-black ${idx.change1d >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {idx.change1d > 0 ? '+' : ''}{idx.change1d}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Volume Spike Meter */}
                  <div className="bg-accent/5 border border-accent/10 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center">
                        <Clock size={12} className="mr-2" /> Volume Intensity
                      </span>
                      <span className="text-xs font-bold text-accent">{generateDeepIntel(tooltip.content.indices[0]?.change1d || 0).volumeSpike}x Avg</span>
                    </div>
                    <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent animate-pulse" style={{ width: `${Math.min(Number(generateDeepIntel(0).volumeSpike) * 33, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              ) : activeHUDTab === 'ENERGY' ? (
                <div className="space-y-4">
                  {(() => {
                    const countryCode = tooltip.content.countryCode;
                    const producerData = OIL_TRADE_FLOW.producers.find(p => p.code === countryCode);
                    const supplySources = OIL_TRADE_FLOW.producers.filter(p => p.exports.some(e => e.code === countryCode));
                    
                    if (producerData || supplySources.length > 0) {
                      return (
                        <div className="bg-surface-light/30 border border-border/50 rounded-2xl p-5 space-y-5">
                          <div className="flex items-center justify-between border-b border-border/20 pb-3">
                            <h5 className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center">
                              <Navigation size={12} className="mr-2" /> Energy Intelligence Matrix
                            </h5>
                            <span className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-[9px] font-bold text-accent">LIVE LINK</span>
                          </div>

                          {/* Outflow */}
                          {producerData && (
                            <div className="space-y-3">
                              <p className="text-[9px] font-black text-orange-400 uppercase tracking-tighter flex items-center">
                                <ChevronRight size={10} className="mr-1" /> Primary Export Destinations
                              </p>
                              <div className="grid grid-cols-1 gap-2">
                                {producerData.exports.map((exp: any) => (
                                  <div key={exp.code} className={`flex justify-between items-center p-2 rounded-lg border transition-colors group ${themeMode === 'dark' ? 'bg-white/5 border-white/5 hover:border-orange-500/30' : 'bg-slate-100 border-slate-200 hover:border-orange-500/40'}`}>
                                    <div className="flex items-center space-x-2">
                                      <img src={`https://flagcdn.com/w20/${exp.code.toLowerCase()}.png`} className="w-4 h-3 object-cover rounded-sm grayscale group-hover:grayscale-0 transition-all" alt="flag" />
                                      <span className={`text-[11px] font-bold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{exp.name}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-orange-400/70 uppercase">Direct Export</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Inflow */}
                          {supplySources.length > 0 && (
                            <div className="space-y-3">
                              <p className="text-[9px] font-black text-cyan-400 uppercase tracking-tighter flex items-center">
                                <ChevronLeft size={10} className="mr-1" /> Primary Supply Sources
                              </p>
                              <div className="grid grid-cols-1 gap-2">
                                {supplySources.map((src: any) => (
                                  <div key={src.code} className={`flex justify-between items-center p-2 rounded-lg border transition-colors group ${themeMode === 'dark' ? 'bg-white/5 border-white/5 hover:border-cyan-500/30' : 'bg-slate-100 border-slate-200 hover:border-cyan-500/40'}`}>
                                    <div className="flex items-center space-x-2">
                                      <img src={`https://flagcdn.com/w20/${src.code.toLowerCase()}.png`} className="w-4 h-3 object-cover rounded-sm grayscale group-hover:grayscale-0 transition-all" alt="flag" />
                                      <span className={`text-[11px] font-bold ${themeMode === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>{src.name}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-cyan-400/70 uppercase">Active Supply</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border ${themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <Navigation size={24} className="text-text-muted mb-3 opacity-20" />
                        <p className="text-xs font-bold text-text-muted">No Energy Trade Data Available for this Market.</p>
                      </div>
                    );
                  })()}
                </div>
              ) : activeHUDTab === 'SECTORS' ? (
                <div className="grid grid-cols-2 gap-3">
                  {generateDeepIntel(tooltip.content.indices[0]?.change1d || 0).sectors.map((s: any) => (
                    <div key={s.name} className={`p-3 rounded-xl border ${themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <p className="text-[9px] font-black text-text-muted uppercase mb-1">{s.name}</p>
                      <div className={`text-sm font-bold ${s.perf >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {s.perf > 0 ? '+' : ''}{s.perf.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {loadingMovers ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Aggregating Market Flow...</p>
                    </div>
                  ) : moversError ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                      <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl text-[10px] font-bold uppercase">
                        {moversError}
                      </div>
                      <button 
                        onClick={() => tooltip?.content.indices[0]?.indexName && fetchMovers(tooltip.content.indices[0].indexName)}
                        className="px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-xl text-[10px] font-black uppercase hover:bg-accent hover:text-white transition-all shadow-lg"
                      >
                        RETRY SYNC
                      </button>
                    </div>
                  ) : moversData ? (
                    <div className="space-y-4">
                      {/* Movers Toggle Switch */}
                      <div className={`flex p-1 border rounded-xl ${themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        <button
                          onClick={() => setMoversFilter('GAINERS')}
                          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${moversFilter === 'GAINERS' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : `text-text-muted ${themeMode === 'dark' ? 'hover:text-text-secondary' : 'hover:text-slate-900 hover:bg-slate-200'}`}`}
                        >
                          Top Gainers
                        </button>
                        <button
                          onClick={() => setMoversFilter('LOSERS')}
                          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${moversFilter === 'LOSERS' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : `text-text-muted ${themeMode === 'dark' ? 'hover:text-text-secondary' : 'hover:text-slate-900 hover:bg-slate-200'}`}`}
                        >
                          Top Losers
                        </button>
                      </div>

                      {moversFilter === 'GAINERS' ? (
                        <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                          <p className="text-[10px] font-black text-green-500 uppercase mb-3 tracking-widest flex items-center">
                            <TrendingUp size={12} className="mr-2" /> Index Drivers
                          </p>
                          {moversData.gainers.map((m: any) => (
                            <div key={m.symbol} className={`flex justify-between items-center p-3 border-b border-white/5 last:border-0 transition-colors rounded-lg group ${themeMode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}>
                              <div className="flex flex-col w-[35%]">
                                <span className={`text-xs font-bold transition-colors ${themeMode === 'dark' ? 'text-slate-200 group-hover:text-green-400' : 'text-slate-900 group-hover:text-green-600'}`}>{m.name}</span>
                                <span className="text-[9px] font-mono text-slate-500">₹{m.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                              
                              <div className="flex-1 flex justify-center items-center">
                                <VolumeMicroChart data={m.volumeHistory} color="bg-green-500/50" />
                              </div>

                              <div className="text-right flex flex-col items-end w-[35%]">
                                <span className="text-[9px] font-bold text-green-500/80 font-mono mb-0.5">
                                  +{m.change.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="px-2 py-0.5 rounded text-[10px] font-black bg-green-500/10 text-green-500">
                                  +{m.changePercent.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-300">
                          <p className="text-[10px] font-black text-red-500 uppercase mb-3 tracking-widest flex items-center">
                            <TrendingDown size={12} className="mr-2" /> Index Laggards
                          </p>
                          {moversData.losers.map((m: any) => (
                            <div key={m.symbol} className={`flex justify-between items-center p-3 border-b border-white/5 last:border-0 transition-colors rounded-lg group ${themeMode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}>
                              <div className="flex flex-col w-[35%]">
                                <span className={`text-xs font-bold transition-colors ${themeMode === 'dark' ? 'text-slate-200 group-hover:text-red-400' : 'text-slate-900 group-hover:text-red-600'}`}>{m.name}</span>
                                <span className="text-[9px] font-mono text-slate-500">₹{m.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>

                              <div className="flex-1 flex justify-center items-center">
                                <VolumeMicroChart data={m.volumeHistory} color="bg-red-500/50" />
                              </div>

                              <div className="text-right flex flex-col items-end w-[35%]">
                                <span className="text-[9px] font-bold text-red-500/80 font-mono mb-0.5">
                                  {m.change.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                                <div className="px-2 py-0.5 rounded text-[10px] font-black bg-red-500/10 text-red-500">
                                  {m.changePercent.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border ${themeMode === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <p className="text-xs font-bold text-text-muted">Select a market and click Movers to load live data.</p>
                    </div>
                  )}
                </div>
              )
            ) : regionalStats ? (
              <div className="space-y-6 text-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl border transition-all ${themeMode === 'dark' ? 'bg-slate-900/50 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                    <p className="text-[10px] font-bold text-text-muted uppercase mb-2">Adv/Dec</p>
                    <p className="text-2xl font-black text-green-500">{regionalStats.advance} <span className="text-slate-500">/</span> <span className="text-red-500">{regionalStats.decline}</span></p>
                  </div>
                  <div className={`p-5 rounded-2xl border transition-all ${themeMode === 'dark' ? 'bg-slate-900/50 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                    <p className="text-[10px] font-bold text-text-muted uppercase mb-2">Avg Perform</p>
                    <p className={`text-2xl font-black ${Number(regionalStats.avgPerf) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{regionalStats.avgPerf}%</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flow-line {
          from { stroke-dashoffset: 220; }
          to { stroke-dashoffset: 0; }
        }
        .animate-oil-flow {
          animation: flow-line 3s linear infinite;
        }
      `}} />
    </div>
  );
};

export default QuanMapPerformance;
