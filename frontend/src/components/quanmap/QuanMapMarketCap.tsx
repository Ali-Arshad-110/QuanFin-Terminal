import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, ZoomControl } from 'react-leaflet';
import { Loader2, Activity } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';

import { cityCoordinates } from '../../data/cityCoordinates';
import { API_BASE } from '../../config/api';

const capitalMapping: Record<string, string> = {
  'US': 'New York', 'CN': 'Beijing', 'JP': 'Tokyo', 'IN': 'Mumbai', 'GB': 'London',
  'FR': 'Paris', 'DE': 'Frankfurt', 'CA': 'Toronto', 'AU': 'Sydney', 'BR': 'São Paulo', // mapped close enough
  'KR': 'Seoul', 'IT': 'Rome', 'ES': 'Madrid', 'NL': 'Veldhoven', 'CH': 'Zurich',
  'SE': 'Stockholm', 'ZA': 'Johannesburg', 'MX': 'Mexico City', 'AE': 'Dubai', 'SA': 'Dhahran',
  'SG': 'Singapore', 'HK': 'Hong Kong', 'TW': 'Taipei', 'ID': 'Jakarta', 'MY': 'Kuala Lumpur',
  'TH': 'Bangkok', 'PH': 'Manila', 'RU': 'Moscow', 'TR': 'Istanbul', 'AR': 'Buenos Aires',
  'DK': 'Bagsværd', 'NO': 'Oslo', 'NZ': 'Wellington', 'PK': 'Karachi', 'EG': 'Cairo',
  'NG': 'Lagos'
};

interface MarketCapData {
  countryCode: string;
  country: string;
  marketCapUSDT: number;
  exchange: string;
}

const QuanMapMarketCap: React.FC = () => {
  const { themeMode } = useTheme();
  const [data, setData] = useState<Record<string, MarketCapData>>({});
  const [rankedList, setRankedList] = useState<MarketCapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ content: MarketCapData; x: number; y: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/v1/quanmap/market-cap`);
        if (!res.ok) throw new Error('Failed to fetch market cap data');
        const json = await res.json();
        
        setRankedList(json.data || []);

        // Convert array to Record keyed by ISO2 country code
        const dataMap: Record<string, MarketCapData> = {};
        (json.data || []).forEach((item: MarketCapData) => {
          dataMap[item.countryCode] = item;
        });
        
        // TopoJSON world-atlas uses 'name'
        const nameMapping: Record<string, string> = {
          'United States of America': 'US', 'China': 'CN', 'Japan': 'JP', 'India': 'IN', 'United Kingdom': 'GB',
          'France': 'FR', 'Germany': 'DE', 'Canada': 'CA', 'Australia': 'AU', 'Brazil': 'BR',
          'South Korea': 'KR', 'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL', 'Switzerland': 'CH',
          'Sweden': 'SE', 'South Africa': 'ZA', 'Mexico': 'MX', 'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA',
          'Singapore': 'SG', 'Hong Kong': 'HK', 'Taiwan': 'TW', 'Indonesia': 'ID', 'Malaysia': 'MY',
          'Thailand': 'TH', 'Philippines': 'PH', 'Russia': 'RU', 'Turkey': 'TR', 'Argentina': 'AR',
          'Denmark': 'DK', 'Norway': 'NO', 'New Zealand': 'NZ', 'Pakistan': 'PK', 'Egypt': 'EG',
          'Nigeria': 'NG'
        };
        
        // Enrich map with Name keys too
        const enrichedDataMap = { ...dataMap };
        Object.entries(nameMapping).forEach(([name, iso2]) => {
          if (dataMap[iso2]) {
            enrichedDataMap[name] = dataMap[iso2];
          }
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

  const getColor = (value: number) => {
    // USD Trillion mapping
    if (value > 40) return '#4f46e5'; // Indigo 600 - Vast (US)
    if (value > 10) return '#6366f1'; // Indigo 500
    if (value > 5)  return '#818cf8'; // Indigo 400 (China, Japan)
    if (value > 2)  return '#a5b4fc'; // Indigo 300 (India, UK, France)
    if (value > 0.5) return '#c7d2fe'; // Indigo 200
    if (value > 0)  return '#e0e7ff'; // Indigo 100
    return themeMode === 'dark' ? '#1f2937' : '#e5e7eb'; // Default gray
  };

  return (
    <div className="w-full h-full relative" onMouseLeave={() => setTooltip(null)}>
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background border border-border">
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
          <p className="text-text-muted font-bold tracking-tight">Analyzing global valuations...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-lg">
            Error loading map data: {error}
          </div>
        </div>
      )}

      {/* Main Map Content Layer */}
      <div className="flex w-full h-full">
        {/* Left Sidebar Ranking */}
        <div className="w-80 border-r border-border bg-surface h-full flex flex-col pt-2 shadow-2xl z-10">
          <div className="px-6 py-4 border-b border-border bg-background sticky top-0">
            <h2 className="text-xl font-bold text-text-primary mb-1 tracking-tight">Global Market Cap</h2>
            <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Valuations in USD Trillions • Source: WFE 2024</p>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 block">
            {rankedList.slice(0, 15).map((item, index) => (
              <div 
                key={item.countryCode} 
                className="flex items-center justify-between p-3 rounded-lg hover:bg-background border border-transparent hover:border-border transition-all cursor-crosshair group"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index < 3 ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-surface border border-border text-text-muted group-hover:bg-accent/10 group-hover:text-accent'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary text-sm tracking-tight">{item.country}</p>
                    <p className="text-[10px] uppercase text-text-muted truncate w-32">{item.exchange}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-bold text-text-primary">${item.marketCapUSDT}T</p>
                </div>
              </div>
            ))}
            
            <div className="pt-4 pb-2 text-center text-xs italic text-text-muted opacity-60">
              Only showing top 15 economies
            </div>
          </div>
        </div>

        {/* Map View */}
        <div className="flex-1 relative">
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

            {Object.values(data).map((countryData, i) => {
              const cityName = capitalMapping[countryData.countryCode];
              const coords = cityName ? cityCoordinates[cityName] : null;
              
              if (!coords) return null; // Skip if no mapped coordinates
              
              const val = countryData.marketCapUSDT;
              // Size calculation: base + scaled log
              const size = val > 0 ? Math.max(4, 8 + Math.log(val) * 6) : 4;
              const fillColor = getColor(val);

              return (
                <CircleMarker
                  key={`${countryData.countryCode}-${i}`}
                  center={[coords.lat, coords.lng]}
                  radius={size}
                  pathOptions={{
                    fillColor: fillColor,
                    fillOpacity: 0.6,
                    color: themeMode === 'dark' ? '#111827' : '#ffffff',
                    weight: 1
                  }}
                  eventHandlers={{
                    mouseover: (e) => {
                      setTooltip({
                        content: countryData,
                        x: e.originalEvent.clientX,
                        y: e.originalEvent.clientY
                      });
                    },
                    mouseout: () => setTooltip(null)
                  }}
                  className="transition-all duration-300 hover:brightness-125 cursor-pointer"
                />
              );
            })}
          </MapContainer>

          <div className="absolute bottom-6 left-6 z-20 bg-surface border border-border p-5 rounded-2xl shadow-2xl w-64">
            <h4 className="text-xs font-bold mb-4 flex items-center space-x-2 uppercase tracking-widest text-text-secondary">
              <Activity size={14} className="text-accent" />
              <span>Valuation Overlay (USD T)</span>
            </h4>
            <div className="flex items-center space-x-1">
              <div className="w-8 h-3 rounded-sm bg-[#e0e7ff]"></div>
              <div className="w-8 h-3 rounded-sm bg-[#c7d2fe]"></div>
              <div className="w-8 h-3 rounded-sm bg-[#a5b4fc]"></div>
              <div className="w-8 h-3 rounded-sm bg-[#818cf8]"></div>
              <div className="w-8 h-3 rounded-sm bg-[#6366f1]"></div>
              <div className="w-8 h-3 rounded-sm bg-[#4f46e5]"></div>
            </div>
            <div className="flex justify-between text-[10px] uppercase font-black text-text-primary mt-2">
              <span>$0.5T</span>
              <span>$5T</span>
              <span>+$20T</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tooltip (Solid UI) */}
      {tooltip && (
        <div 
          className="fixed pointer-events-none z-50 bg-background border border-border shadow-[0_20px_100px_rgba(0,0,0,0.5)] rounded-xl p-4 w-56 transform -translate-x-1/2 -translate-y-[110%]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
            <h3 className="font-bold text-lg leading-tight truncate mr-2">{tooltip.content.country}</h3>
            <span className="px-2 py-0.5 bg-surface rounded text-[10px] font-mono shrink-0 border border-border">
              {tooltip.content.countryCode}
            </span>
          </div>
          
          <div className="space-y-3 mt-3">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Equity Valuation</p>
              <div className="flex items-baseline">
                <span className="text-2xl font-light font-mono text-accent tracking-tighter mr-1">${tooltip.content.marketCapUSDT}</span>
                <span className="text-sm font-semibold text-text-secondary">Trillion</span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1">Domestic Exchanges</p>
              <p className="text-sm font-medium leading-snug">{tooltip.content.exchange}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanMapMarketCap;
