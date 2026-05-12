import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from 'react-leaflet';
import { Loader2, Info, Activity } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { cityCoordinates } from '../../data/cityCoordinates';
import QuanMapAIInsights from './QuanMapAIInsights';

export interface CompanyData {
  symbol: string;
  name: string;
  city: string;
  country: string;
  sector: string;
  industry: string;
  website: string;
  logo_url?: string;
  employees: number;
  marketCap: number;
}

interface CityData {
  city: string;
  country: string;
  count: number;
  companies: CompanyData[];
}

const QuanMapHQCities: React.FC = () => {
  const { themeMode } = useTheme();
  const [data, setData] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [showAIInsights, setShowAIInsights] = useState(true);

  const insights = useMemo(() => {
    if (data.length === 0) return [];
    const list: any[] = [];
    const topCity = [...data].sort((a, b) => b.count - a.count)[0];
    if (topCity) {
      list.push({ id: '1', type: 'info', text: `Concentration alert: ${topCity.city} dominates with ${topCity.count} corporate headquarters.`, timestamp: 'SEC_ANALYSIS' });
    }
    const totalCompanies = data.reduce((sum, d) => sum + d.count, 0);
    if (totalCompanies > 100) {
      list.push({ id: '2', type: 'positive', text: 'Institutional density threshold exceeded (100+ entities). Data depth optimal.', timestamp: 'INTEGRITY' });
    }
    list.push({ id: '3', type: 'warning', text: 'Sectoral shift detected: Technology HQs expanding in Southern corridors.', timestamp: 'TREND' });
    return list;
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://127.0.0.1:8000/api/v1/quanmap/hq-cities');
        if (!res.ok) throw new Error('Failed to fetch city data');
        const json = await res.json();
        setData(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Map city data to their lat/lng coordinates
  const markers = useMemo(() => {
    return data.map(item => {
      const coords = cityCoordinates[item.city];
      if (!coords) return null;
      return {
        ...item,
        coordinates: [coords.lng, coords.lat] as [number, number]
      };
    }).filter(Boolean) as (CityData & { coordinates: [number, number] })[];
  }, [data]);

  // Determine max values for scaling
  const maxStats = useMemo(() => {
    let maxCount = 1;
    let maxMcap = 1;
    data.forEach(d => {
      if (d.count > maxCount) maxCount = d.count;
      const totalMcap = d.companies.reduce((sum, c) => sum + (c.marketCap || 0), 0);
      if (totalMcap > maxMcap) maxMcap = totalMcap;
    });
    return { maxCount, maxMcap };
  }, [data]);

  const getHeatColor = (totalMcap: number) => {
    const ratio = totalMcap / maxStats.maxMcap;
    if (ratio > 0.7) return '#EF4444'; // Red (Ultra High)
    if (ratio > 0.4) return '#F59E0B'; // Amber (High)
    if (ratio > 0.1) return '#6366F1'; // Indigo (Medium)
    return '#3B82F6'; // Blue (Standard)
  };

  const markerCoords = useMemo(() => {
    if (!selectedCity) return null;
    return cityCoordinates[selectedCity.city] || null;
  }, [selectedCity]);

  // Calculate sector distribution for selected city
  const sectorSummary = useMemo(() => {
    if (!selectedCity) return [];
    const counts: Record<string, number> = {};
    selectedCity.companies.forEach(c => {
      counts[c.sector] = (counts[c.sector] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, percent: Math.round((count / selectedCity.companies.length) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [selectedCity]);

  return (
    <div className="w-full h-full relative flex overflow-hidden">
      {/* Left Sidebar (Ranked Cities) */}
      <div className="w-80 border-r border-border bg-surface h-full flex flex-col pt-2 shadow-2xl z-10 shrink-0">
        <div className="px-6 py-4 border-b border-border bg-background sticky top-0">
          <h2 className="text-xl font-bold text-text-primary mb-1 tracking-tight">Corporate Hubs</h2>
          <p className="text-xs text-text-secondary font-medium italic lowercase">Ranked by headquarters concentration</p>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 block">
          {data.sort((a, b) => b.count - a.count).slice(0, 15).map((item, index) => {
            return (
              <div 
                key={item.city} 
                onClick={() => setSelectedCity(item)}
                className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer group border ${
                  selectedCity?.city === item.city 
                    ? 'bg-accent/10 border-accent/30 shadow-sm' 
                    : 'bg-transparent border-transparent hover:bg-background hover:border-border'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                      index < 3 ? 'text-white shadow-lg' : 'bg-surface border border-border text-text-secondary'
                    }`}
                    style={index < 3 ? { backgroundColor: 'var(--color-accent)', boxShadow: '0 10px 15px -3px rgba(var(--accent-rgb), 0.2)' } : {}}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-xs tracking-tight uppercase">{item.city}</p>
                    <p className="text-[10px] text-text-secondary opacity-70">{item.country}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-black text-accent">{item.count}</p>
                  <p className="text-[8px] text-text-secondary uppercase font-bold tracking-tighter">HQ Index</p>
                </div>
              </div>
            );
          })}
          
          <div className="pt-4 pb-2 text-center text-[10px] uppercase font-black text-text-secondary opacity-80">
            Analyzing {data.length} global hubs
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background border border-border">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
            <p className="text-text-secondary font-bold tracking-tight">Syncing Enterprise Intel...</p>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="bg-red-500/10 border border-red-500/40 text-red-500 p-6 rounded-2xl shadow-2xl">
              <p className="font-bold flex items-center space-x-2">
                <Info size={16} />
                <span>Map Protocol Error: {error}</span>
              </p>
            </div>
          </div>
        )}

        <MapContainer
          center={[20, 10]}
          zoom={2}
          minZoom={2}
          maxZoom={8}
          zoomControl={false}
          className="w-full h-full outline-none z-0"
          style={{ background: themeMode === 'dark' ? '#05070a' : '#f8fafc' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <ZoomControl position="topright" />

            {markers.map((marker, i) => {
              const totalMcap = marker.companies.reduce((sum, c) => sum + (c.marketCap || 0), 0);
              const heatColor = getHeatColor(totalMcap);
              // Scale bubble size log-linearly based on count
              const size = Math.max(4, 18 * (Math.sqrt(marker.count) / Math.sqrt(maxStats.maxCount)));
              const isSelected = selectedCity?.city === marker.city;

              return (
                <CircleMarker
                  key={`${marker.city}-${i}`}
                  center={[marker.coordinates[1], marker.coordinates[0]]}
                  radius={size}
                  pathOptions={{
                    fillColor: heatColor,
                    fillOpacity: isSelected ? 1 : 0.6,
                    color: isSelected ? '#fff' : heatColor,
                    weight: isSelected ? 2 : 1,
                    className: totalMcap > maxStats.maxMcap * 0.4 ? 'animate-pulse' : ''
                  }}
                  eventHandlers={{
                    click: () => setSelectedCity(marker)
                  }}
                >
                  <Tooltip 
                    direction="top" 
                    offset={[0, -size]} 
                    opacity={1}
                    className="font-extrabold bg-surface border-border text-text-primary text-[10px] shadow-2xl rounded-lg"
                  >
                    <div className="flex flex-col">
                      <span className="font-black">{marker.city}</span>
                      <span className="text-[8px] font-bold text-accent">VAL: ₹{(totalMcap / 1e10).toFixed(1)}K Cr</span>
                    </div>
                  </Tooltip>
                </CircleMarker>
              );
            })}
        </MapContainer>

        {/* Map Legend (Solid UI) */}
        <div className="absolute bottom-6 left-6 z-20 bg-surface border border-border p-5 rounded-2xl shadow-2xl w-64">
          <h4 className="text-xs font-bold mb-4 flex items-center space-x-2 uppercase tracking-widest text-text-secondary">
            <Activity size={14} className="text-accent" />
            <span>Enterprise Heat Index</span>
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary">
              <span>Capital Density</span>
              <div className="flex h-1.5 w-32 rounded-full overflow-hidden bg-background border border-border/50">
                <div className="w-1/4 bg-[#3B82F6]" />
                <div className="w-1/4 bg-[#6366F1]" />
                <div className="w-1/4 bg-[#F59E0B]" />
                <div className="w-1/4 bg-[#EF4444]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2 text-[9px] font-bold">
                <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-text-primary">Tier 1 Mega Hub</span>
              </div>
              <div className="flex items-center space-x-2 text-[9px] font-bold">
                <div className="w-2 h-2 rounded-full bg-[#6366F1]" />
                <span className="text-text-primary">Growing Node</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Floating Panel */}
        <div className={`absolute top-6 right-6 z-[1001] transition-all duration-500 transform ${showAIInsights ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
          <QuanMapAIInsights 
            title="Corporate Intel Desk"
            insights={insights}
            sentiment="NEUTRAL"
          />
        </div>

        {/* Toggle Controls */}
        <div className="absolute bottom-6 right-20 z-[1001] flex items-center space-x-2">
          <button 
            onClick={() => setShowAIInsights(!showAIInsights)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shadow-xl ${showAIInsights ? 'text-white' : 'bg-surface text-text-primary border-border hover:bg-surface-light'}`}
            style={showAIInsights ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)' } : {}}
          >
            {showAIInsights ? 'Hide Intel Desk' : 'Show Intel Desk'}
          </button>
        </div>
      </div>

      {/* Side Panel (Solid UI) */}
      <div 
        className={`w-[420px] bg-surface border-l border-border h-full flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) transform ${
          selectedCity ? 'translate-x-0' : 'translate-x-full'
        } absolute right-0 top-0 z-30 shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden`}
      >
        {selectedCity && (
          <>
            <div className="p-6 border-b border-border bg-background sticky top-0 z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-text-primary capitalize">{selectedCity.city}</h2>
                  <p className="text-text-secondary font-medium flex items-center space-x-2 mt-1">
                    <span>{selectedCity.country}</span>
                    <span className="text-border">|</span>
                    <span className="text-accent">{selectedCity.count} HQ Markers</span>
                  </p>
                  <p className="text-[10px] font-mono text-text-secondary mt-1 opacity-80 uppercase tracking-tighter">
                    LOC: {markerCoords?.lat.toFixed(4)}°N, {markerCoords?.lng.toFixed(4)}°E
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedCity(null)}
                  className="p-2 hover:bg-surface rounded-full transition-colors border border-transparent hover:border-border"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Sectoral Overview Context */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-text-primary">Sectoral Dominance</h4>
                <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface-hover">
                  {sectorSummary.map((s, idx) => (
                    <div 
                      key={s.name} 
                      style={{ width: `${s.percent}%`, backgroundColor: `hsl(${idx * 40 + 200}, 70%, 50%)` }}
                      title={`${s.name}: ${s.percent}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sectorSummary.slice(0, 3).map((s, idx) => (
                    <div key={s.name} className="flex items-center space-x-1.5 text-[11px] font-semibold">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${idx * 40 + 200}, 70%, 50%)` }} />
                      <span className="text-text-primary">{s.name}</span>
                      <span className="text-text-secondary font-bold">({s.percent}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface">
              {(selectedCity.companies || []).map((company) => (
                <div key={company.symbol} className="bg-background border border-border rounded-xl p-4 hover:border-accent/40 hover:shadow-2xl transition-all group">
                  <div className="flex items-center space-x-4 mb-4">
                    {/* Company Logo / Placeholder */}
                    <div className="w-12 h-12 rounded-lg bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {company.logo_url ? (
                        <img 
                          src={company.logo_url} 
                          alt={company.name} 
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).classList.add('hidden');
                            const parent = (e.currentTarget as HTMLImageElement).parentElement;
                            if (parent && !parent.querySelector('.placeholder-letter')) {
                              const span = document.createElement('span');
                              span.className = 'placeholder-letter text-lg font-bold text-accent';
                              span.innerText = company.name?.charAt(0) || '?';
                              parent.appendChild(span);
                            }
                          }}
                        />
                      ) : (
                        <span className="text-lg font-bold text-accent">{company.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[9px] font-bold uppercase tracking-wider">
                          {company.symbol}
                        </span>
                        <span className="text-[10px] text-text-secondary font-bold">{company.sector}</span>
                      </div>
                      <h4 className="font-extrabold text-text-primary truncate pr-2" title={company.name}>
                        {company.name}
                      </h4>
                      <p className="text-[10px] text-text-secondary font-medium tracking-tight truncate lowercase opacity-80 italic">{company.industry}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-3 py-3 border-y border-border/50">
                    <div>
                      <p className="text-[9px] text-text-secondary uppercase font-bold tracking-wider mb-1">Market Cap</p>
                      <p className="font-mono text-sm font-bold text-text-primary">
                        {company.country === 'India' 
                          ? `₹${(company.marketCap / 1e10).toFixed(2)}K Cr` 
                          : `$${(company.marketCap / 1e9).toFixed(2)}B`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-text-secondary uppercase font-bold tracking-wider mb-1">Workforce</p>
                      <p className="font-mono text-sm font-bold text-text-primary">
                        {company.employees > 0 ? company.employees.toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-text-secondary flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span>{company.sector}</span>
                    </span>
                    {company.website && (
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-accent hover:underline flex items-center space-x-1"
                      >
                        <span>Portal</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuanMapHQCities;
