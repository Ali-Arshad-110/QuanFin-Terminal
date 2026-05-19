import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, ZoomControl } from 'react-leaflet';
import { Loader2, Activity, Zap, ArrowUpRight, ArrowDownRight, ShieldCheck, History, Maximize2, X, Search } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import QuanMapAIInsights from './QuanMapAIInsights';
import { API_BASE } from '../../config/api';

interface FlowData {
  id: string;
  name: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  intensity: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  type: 'FII' | 'DII';
  value: number;
}

interface BigDeal {
  symbol: string;
  clientName: string;
  type: 'BULK' | 'BLOCK';
  transactionType: 'BUY' | 'SELL';
  quantity: number;
  price: number;
}

interface FlowSummary {
  date: string;
  fii_net_cr: number;
  dii_net_cr: number;
  fii_buy: number;
  fii_sell: number;
  dii_buy: number;
  dii_sell: number;
  sentiment: string;
  market_pulse: string;
  is_provisional: boolean;
}

const QuanMapInstitutionalFlow: React.FC = () => {
  const { themeMode } = useTheme();
  const [flows, setFlows] = useState<FlowData[]>([]);
  const [bigDeals, setBigDeals] = useState<BigDeal[]>([]);
  const [summary, setSummary] = useState<FlowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIInsights, setShowAIInsights] = useState(true);

  const insights = useMemo(() => {
    if (!summary) return [];
    const list: any[] = [];
    if (summary.fii_net_cr > 1000) list.push({ id: '1', type: 'positive', text: 'Significant FII accumulation detected. Market breadth expanding.', timestamp: '10:45 AM' });
    if (summary.dii_net_cr < -500) list.push({ id: '2', type: 'warning', text: 'DII profit booking observed in major financial sectors.', timestamp: '11:15 AM' });
    if (summary.market_pulse === 'ACTIVE') list.push({ id: '3', type: 'info', text: 'Real-time FII/DII flow synchronization active for NSE/BSE.', timestamp: 'LIVE' });
    if (bigDeals.length > 5) list.push({ id: '4', type: 'alert', text: 'High-frequency Bulk Deals detected in Mumbai corridor.', timestamp: 'URGENT' });
    return list;
  }, [summary, bigDeals]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/v1/quanmap/institutional-flows`);
        if (!res.ok) throw new Error('Failed to fetch institutional flows');
        const json = await res.json();
        setFlows(json.data.flows || []);
        setBigDeals(json.data.big_deals || []);
        setSummary(json.data.summary || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 40);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const getFlowColor = (sentiment: string) => {
    if (sentiment === 'positive') return '#10B981';
    if (sentiment === 'negative') return '#EF4444';
    return '#64748B';
  };

  const isToday = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A' || dateStr === 'OFFLINE') return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const filteredDeals = bigDeals.filter(d => 
    d.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-background border border-border">
          <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
          <p className="text-text-primary font-black tracking-tight uppercase text-xs">Syncing Exchange Intel...</p>
        </div>
      )}

      {/* Full Screen Deals Modal */}
      {isExpanded && (
        <div className="absolute inset-0 z-[2000] bg-background flex items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="w-full max-w-6xl h-full max-h-[90vh] bg-surface border border-border rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-yellow-500/10 rounded-2xl">
                  <Zap size={24} className="text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-text-primary">Institutional Deal Log</h2>
                  <p className="text-xs text-text-secondary font-extrabold uppercase tracking-widest">{summary?.date ?? 'Current Session'} • Big Deal Intelligence</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search Symbol or Client..." 
                    className="pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 w-64 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="p-3 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all border border-border/50 group"
                >
                  <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className="flex-grow overflow-auto custom-scrollbar p-6">
              <table className="w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[11px] font-black text-text-primary uppercase tracking-widest bg-background sticky top-0 z-10">
                    <th className="px-5 py-3 rounded-l-xl">Symbol</th>
                    <th className="px-5 py-3">Client Name</th>
                    <th className="px-5 py-3 text-center">Type</th>
                    <th className="px-5 py-3 text-right">Quantity</th>
                    <th className="px-5 py-3 text-right">Avg Price</th>
                    <th className="px-5 py-3 text-right">Value (Cr)</th>
                    <th className="px-5 py-3 rounded-r-xl text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredDeals.length > 0 ? (
                    filteredDeals.map((deal, idx) => (
                      <tr key={idx} className="group hover:bg-accent/5 transition-colors">
                        <td className="px-5 py-4 bg-surface rounded-l-xl border-y border-l border-border group-hover:border-accent/40">
                          <span className="font-extrabold tracking-tight text-text-primary">{deal.symbol}</span>
                        </td>
                        <td className="px-5 py-4 bg-surface border-y border-border group-hover:border-accent/40 font-medium text-text-secondary truncate max-w-[300px]">
                          {deal.clientName}
                        </td>
                        <td className="px-5 py-4 bg-surface border-y border-border group-hover:border-accent/40 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deal.type === 'BLOCK' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            {deal.type}
                          </span>
                        </td>
                        <td className="px-5 py-4 bg-surface border-y border-border group-hover:border-accent/40 text-right font-mono font-bold">
                          {deal.quantity.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 bg-surface border-y border-border group-hover:border-accent/40 text-right font-mono font-bold text-accent">
                          ₹{deal.price.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 bg-surface border-y border-border group-hover:border-accent/40 text-right font-mono font-bold text-text-primary">
                          {((deal.quantity * deal.price) / 10000000).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 bg-surface rounded-r-xl border-y border-right border-border group-hover:border-accent/40 text-center">
                          <span className={`inline-flex items-center space-x-1 font-bold text-[10px] px-2 py-1 rounded ${deal.transactionType === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {deal.transactionType === 'BUY' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            <span>{deal.transactionType}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-text-muted font-medium">
                        No deals matched your search criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border bg-surface flex justify-between items-center text-xs text-text-muted">
              <div className="flex items-center space-x-4 font-black">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30"></div>
                  <span className="text-text-primary">Block Deals: {bigDeals.filter(d => d.type === 'BLOCK').length}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/30"></div>
                  <span className="text-text-primary">Bulk Deals: {bigDeals.filter(d => d.type === 'BULK').length}</span>
                </span>
              </div>
              <p className="font-mono uppercase tracking-widest text-[9px] font-black text-text-secondary">QuAnFiN Intelligence Hub • SYNC {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Dashboard Overlay */}
      <div className="absolute top-6 left-6 z-[1001] w-80 space-y-4 max-h-[calc(100vh-100px)] overflow-hidden flex flex-col">
        {/* Main Pulse Card */}
        <div className="bg-surface border border-border p-5 rounded-2xl shadow-2xl shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center space-x-2">
              <Activity size={18} className="text-accent" />
              <span>Institutional Pulse</span>
            </h3>
            <div className="flex flex-col items-end">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 ${summary?.market_pulse === 'ACTIVE' ? 'bg-green-500/20 text-green-500 animate-pulse' : 'bg-surface-light text-text-secondary border border-border'}`}>
                <span className={`w-1 h-1 rounded-full ${summary?.market_pulse === 'ACTIVE' ? 'bg-green-500' : 'bg-text-secondary'}`}></span>
                <span>{summary?.market_pulse === 'ACTIVE' ? 'LIVE' : (isToday(summary?.date || '') ? 'IDLE' : 'LAST SESSION')}</span>
              </span>
              {summary?.is_provisional && (
                <span className="text-[8px] text-text-secondary font-bold flex items-center space-x-1 mt-1">
                  <ShieldCheck size={10} />
                  <span>Provisional Data</span>
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-500/5 rounded-xl border border-green-500/10 hover:border-green-500/30 transition-colors">
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">FII Net Flow</p>
                <p className={`text-lg font-mono font-bold ${(summary?.fii_net_cr ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(summary?.fii_net_cr ?? 0) > 0 ? '+' : ''}{(summary?.fii_net_cr ?? 0).toLocaleString()} <span className="text-xs">Cr</span>
                </p>
                <div className="flex text-[8px] mt-1 space-x-2 text-text-secondary opacity-90 font-bold">
                  <span className="text-green-500">B: {(summary?.fii_buy ?? 0).toFixed(0)}</span>
                  <span className="text-red-500">S: {(summary?.fii_sell ?? 0).toFixed(0)}</span>
                </div>
              </div>
              
              <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 hover:border-blue-500/30 transition-colors">
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">DII Net Flow</p>
                <p className={`text-lg font-mono font-bold ${(summary?.dii_net_cr ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {(summary?.dii_net_cr ?? 0) > 0 ? '+' : ''}{(summary?.dii_net_cr ?? 0).toLocaleString()} <span className="text-xs">Cr</span>
                </p>
                <div className="flex text-[8px] mt-1 space-x-2 text-text-secondary opacity-90 font-bold">
                  <span className="text-green-500">B: {(summary?.dii_buy ?? 0).toFixed(0)}</span>
                  <span className="text-red-500">S: {(summary?.dii_sell ?? 0).toFixed(0)}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary font-semibold">Consensus Sentiment</span>
                <span className={`font-bold px-2 py-0.5 rounded ${summary?.sentiment === 'BULLISH' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                  {summary?.sentiment || 'NEUTRAL'}
                </span>
              </div>
              <div className="flex items-center justify-center space-x-2 mt-2 bg-surface-light py-1 rounded-lg">
                <History size={10} className="text-accent" />
                <p className="text-[10px] font-bold text-text-secondary tracking-tight">
                  {isToday(summary?.date || '') ? 'Intraday Session' : `Session: ${summary?.date || 'N/A'}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Big Deals Section */}
        <div className="bg-surface border border-border rounded-2xl shadow-2xl flex-grow flex flex-col min-h-0 overflow-hidden">
          <div className="p-3 border-b border-border bg-surface flex items-center justify-between">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-text-secondary flex items-center space-x-2">
              <Zap size={12} className="text-yellow-500" />
              <span>Institutional Big Deals</span>
            </h4>
            <div className="flex items-center space-x-2">
              <span className="text-[8px] text-text-muted font-mono">{bigDeals.length} Deals</span>
              <button 
                onClick={() => setIsExpanded(true)}
                className="p-1 hover:bg-accent/10 hover:text-accent rounded transition-colors"
                title="Expand View"
              >
                <Maximize2 size={12} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-grow p-2 space-y-2">
            {bigDeals.length > 0 ? (
              bigDeals.slice(0, 10).map((deal, idx) => (
                <div key={idx} className="bg-surface border border-border/60 p-2 rounded-lg hover:border-accent/40 transition-colors group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs group-hover:text-accent transition-colors">{deal.symbol}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 ${deal.transactionType === 'BUY' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {deal.transactionType === 'BUY' ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
                      <span>{deal.transactionType}</span>
                    </span>
                  </div>
                  <div className="text-[9px] text-text-muted font-medium mb-2 line-clamp-1">{deal.clientName}</div>
                  <div className="flex justify-between text-[8px] font-mono text-text-secondary">
                    <span>Qty: {deal.quantity.toLocaleString()}</span>
                    <span>₹{deal.price.toLocaleString()}</span>
                    <span className="text-accent underline decoration-accent/20">{deal.type}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-20 flex items-center justify-center text-[10px] text-text-muted">
                No big deals reported in current session
              </div>
            )}
            {bigDeals.length > 10 && (
              <button 
                onClick={() => setIsExpanded(true)}
                className="w-full py-1.5 text-[10px] text-accent font-bold hover:bg-accent/5 rounded-lg transition-colors border border-accent/10"
              >
                View All {bigDeals.length} Deals
              </button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-surface border border-border p-3 rounded-xl flex items-center justify-around text-[10px] font-bold shrink-0 shadow-xl">
          <div className="flex items-center space-x-2 font-mono">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span className="text-green-500">Inflow</span>
          </div>
          <div className="flex items-center space-x-2 font-mono">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span className="text-red-500">Outflow</span>
          </div>
          <div className="flex items-center space-x-2 text-text-secondary font-bold group">
            <ShieldCheck size={10} className="group-hover:text-accent transition-colors" />
            <span>Official Reports</span>
          </div>
        </div>

        {/* AI Insights Floating Panel */}
        <div className={`absolute top-6 right-6 z-[1001] transition-all duration-500 transform ${showAIInsights ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
          <QuanMapAIInsights 
            title="Institutional AI Desk"
            insights={insights}
            sentiment={(summary?.sentiment as any) || 'NEUTRAL'}
          />
        </div>

        {/* Toggle Controls */}
        <div className="absolute bottom-6 right-20 z-[1001] flex items-center space-x-2">
          <button 
            onClick={() => setShowAIInsights(!showAIInsights)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shadow-xl ${showAIInsights ? 'bg-accent text-white border-accent' : 'bg-surface text-text-primary border-border hover:bg-surface-light'}`}
          >
            {showAIInsights ? 'Hide AI Desk' : 'Show AI Desk'}
          </button>
        </div>
      </div>

      <MapContainer
        center={[20, 40]}
        zoom={2.5}
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

        {flows.map((f) => (
          <React.Fragment key={f.id}>
            <Polyline
              positions={[
                [f.origin.lat, f.origin.lng],
                [f.destination.lat, f.destination.lng]
              ]}
              pathOptions={{
                color: getFlowColor(f.sentiment),
                weight: 1.5,
                opacity: 0.6,
                dashArray: '5, 10',
                dashOffset: String(-pulsePhase * (f.intensity || 1) * 2)
              }}
            />
            
            <Polyline
              positions={[
                [f.origin.lat, f.origin.lng],
                [f.destination.lat, f.destination.lng]
              ]}
              pathOptions={{
                color: getFlowColor(f.sentiment),
                weight: 4,
                opacity: 0.1,
              }}
            />

            <CircleMarker
              center={[f.origin.lat, f.origin.lng]}
              radius={4}
              pathOptions={{
                fillColor: getFlowColor(f.sentiment),
                fillOpacity: 0.8,
                color: '#fff',
                weight: 1
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                <div className="text-[10px] font-bold">
                  {f.name} ({f.type})
                  <div className={f.value >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {f.value > 0 ? '+' : ''}{f.value}% Sentiment
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          </React.Fragment>
        ))}

        <CircleMarker
          center={[18.9220, 72.8347]}
          radius={8}
          pathOptions={{
            fillColor: '#FFD700',
            fillOpacity: 0.4,
            color: '#FFD700',
            weight: 2,
            className: "animate-ping"
          }}
        />
        <CircleMarker
          center={[18.9220, 72.8347]}
          radius={5}
          pathOptions={{
            fillColor: '#FFD700',
            fillOpacity: 1,
            color: '#000',
            weight: 1
          }}
        >
          <Tooltip permanent direction="bottom" offset={[0, 10]}>
            <span className="font-extrabold text-[10px] uppercase text-accent">NSE/BSE Hub</span>
          </Tooltip>
        </CircleMarker>
      </MapContainer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--accent-rgb), 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--accent-rgb), 0.4);
        }
      `}</style>
    </div>
  );
};

export default QuanMapInstitutionalFlow;
