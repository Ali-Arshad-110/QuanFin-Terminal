import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip, ZoomControl, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Anchor, Ship, Activity, Navigation, ArrowUpRight, Database, Radio, Zap, Layers, Search, Maximize2, X, Fish, Shield } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { MAJOR_PORTS, GLOBAL_FLOWS } from '../../data/maritimeData';
import 'flag-icons/css/flag-icons.min.css';

// Component to handle map movements
const MapController = ({ vessel, zoom }: { vessel: Vessel | null, zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        if (vessel) {
            map.flyTo([Number(vessel.lat), Number(vessel.lng)], zoom, { duration: 1.5 });
        }
    }, [vessel?.mmsi]); // Only trigger when the SELECTED VESSEL identity changes, not its position
    return null;
};

interface QuanMapMaritimeProps {
    onNavigate: (view: string) => void;
}

interface Vessel {
    mmsi: number;
    name: string;
    lat: number;
    lng: number;
    speed: number;
    course: number;
    timestamp: Date;
    // Enriched Fields
    destination?: string;
    eta?: string;
    draft?: number;
    navStatus?: string;
    imo?: number;
    callSign?: string;
    shipType?: string;
    length?: number;
    width?: number;
}

const getCountryFromMMSI = (mmsi: number): { name: string; code: string } => {
    // ... (Existing country logic remains)
    const mid = Math.floor(mmsi / 1000000);
    const midMap: Record<number, { name: string; code: string }> = {
        419: { name: 'India', code: 'IN' },
        563: { name: 'Singapore', code: 'SG' },
        564: { name: 'Singapore', code: 'SG' },
        565: { name: 'Singapore', code: 'SG' },
        636: { name: 'Liberia', code: 'LR' },
        351: { name: 'Panama', code: 'PA' },
        352: { name: 'Panama', code: 'PA' },
        353: { name: 'Panama', code: 'PA' },
        354: { name: 'Panama', code: 'PA' },
        355: { name: 'Panama', code: 'PA' },
        356: { name: 'Panama', code: 'PA' },
        357: { name: 'Panama', code: 'PA' },
        412: { name: 'China', code: 'CN' },
        413: { name: 'China', code: 'CN' },
        414: { name: 'China', code: 'CN' },
        232: { name: 'United Kingdom', code: 'GB' },
        235: { name: 'United Kingdom', code: 'GB' },
        311: { name: 'Bahamas', code: 'BS' },
        538: { name: 'Marshall Islands', code: 'MH' },
        244: { name: 'Netherlands', code: 'NL' },
        245: { name: 'Netherlands', code: 'NL' },
        246: { name: 'Netherlands', code: 'NL' },
    };
    return midMap[mid] || { name: 'International', code: 'UN' };
};

const QuanMapMaritime: React.FC<QuanMapMaritimeProps> = ({ onNavigate }) => {
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');
    const [hoveredPort, setHoveredPort] = useState<string | null>(null);
    const [selectedPort, setSelectedPort] = useState<string | null>(null);
    const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFlows, setShowFlows] = useState(true);
    const [showSatellite, setShowSatellite] = useState(false);
    const [isLiveStreamActive, setIsLiveStreamActive] = useState(false);
    const [vessels, setVessels] = useState<Map<number, Vessel>>(new Map());
    const [filterType, setFilterType] = useState('ALL');
    const [isFocus, setIsFocus] = useState(false);
    const [isFullScreenFleet, setIsFullScreenFleet] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState('ALL');

    const ports = MAJOR_PORTS;

    // Sidebar Filter: Focused on Indian Operational Centers
    const sidebarVessels = Array.from(vessels.values()).filter(v => {
        const isIndian = getCountryFromMMSI(v.mmsi).code === 'IN';
        const matchesSearch = searchQuery === '' || 
                             v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             v.mmsi.toString().includes(searchQuery);
        return isIndian && matchesSearch;
    });

    // Global Fleet Filter (for Full Screen Directory) - Multi-Dimensional Matrix
    const globalFilteredVessels = Array.from(vessels.values()).filter(v => {
        const matchesSearch = searchQuery === '' || 
                             v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             v.mmsi.toString().includes(searchQuery);
        
        const typeStr = (v.shipType || '').toUpperCase();
        const matchesType = filterType === 'ALL' || 
                           (filterType === 'TANKER' && typeStr.includes('TANKER')) || 
                           (filterType === 'CARGO' && (typeStr.includes('CARGO') || typeStr.includes('CONTAINER'))) ||
                           (filterType === 'FISHING' && typeStr.includes('FISHING')) ||
                           (filterType === 'MILITARY' && (typeStr.includes('MILITARY') || typeStr.includes('NAVY') || typeStr.includes('STRATEGIC') || typeStr.includes('COAST GUARD'))) ||
                           (filterType === 'INDIA' && getCountryFromMMSI(v.mmsi).code === 'IN');
        
        const matchesCountry = selectedCountry === 'ALL' || 
                              getCountryFromMMSI(v.mmsi).name === selectedCountry;
                           
        return matchesSearch && matchesType && matchesCountry;
    });

    // Dynamic Country List from Active Fleet
    const activeCountries = Array.from(new Set(Array.from(vessels.values()).map(v => getCountryFromMMSI(v.mmsi).name))).sort();

    // Real-time Satellite AIS Engine (Secure Backend Bridge)
    useEffect(() => {
        if (!isLiveStreamActive) return;

        const socket = new WebSocket("ws://localhost:8000/api/v1/maritime/ws");
        
        socket.onmessage = (event) => {
            try {
                const aisData = JSON.parse(event.data);
                const meta = aisData.MetaData || {};
                const mmsi = meta.MMSI || meta.mmsi;
                if (!mmsi) return;

                const msg = aisData.Message;
                const staticData = msg?.ShipStaticData || msg?.StaticDataReport;
                
                setVessels(prev => {
                    const newMap = new Map(prev);
                    const existing = newMap.get(mmsi);
                    
                    // Advanced Ship Type Decoder (AIS Standard Ranges)
                    const rawType = staticData?.ShipType || 0;
                    let vesselType = "Other Vessel";
                    
                    if (rawType >= 70 && rawType <= 79) vesselType = "Cargo";
                    else if (rawType >= 80 && rawType <= 89) vesselType = "Tanker";
                    else if (rawType === 30) vesselType = "Fishing";
                    else if (rawType === 35) vesselType = "Military";
                    else if (rawType >= 50 && rawType <= 55) vesselType = "Strategic";
                    else if (existing?.shipType) vesselType = existing.shipType;

                    // Dimensions (A=Bow, B=Stern, C=Port, D=Starboard)
                    const dim = staticData?.Dimension || {};
                    const vLength = (dim.A || 0) + (dim.B || 0);
                    const vWidth = (dim.C || 0) + (dim.D || 0);

                    // Nav Status Logic
                    let navStatus = existing?.navStatus || "ACTIVE";
                    const report = msg?.PositionReport || msg?.StandardClassBPositionReport;
                    if (report?.NavigationalStatus !== undefined) {
                        const statusMap: Record<number, string> = {0: "UNDERWAY", 1: "ANCHORED", 5: "MOORED", 15: "ACTIVE"};
                        navStatus = statusMap[report.NavigationalStatus] || "ACTIVE";
                    }

                    const updatedVessel: Vessel = {
                        mmsi,
                        name: (meta.ShipName || meta.ship_name || existing?.name || "Vessel").trim(),
                        lat: Number(meta.Latitude || meta.latitude || existing?.lat || 0),
                        lng: Number(meta.Longitude || meta.longitude || existing?.lng || 0),
                        speed: report?.Sog ?? report?.sog ?? existing?.speed ?? 0,
                        course: report?.Cog ?? report?.cog ?? existing?.course ?? 0,
                        timestamp: new Date(),
                        destination: (staticData?.Destination || existing?.destination || "").trim(),
                        draft: staticData?.MaximumStaticDraft || existing?.draft || 0,
                        eta: staticData?.Eta || existing?.eta || '--/--',
                        imo: staticData?.ImoNumber || existing?.imo,
                        callSign: (staticData?.CallSign || existing?.callSign || "").trim(),
                        shipType: vesselType,
                        navStatus: navStatus,
                        length: vLength || existing?.length,
                        width: vWidth || existing?.width
                    };
                    
                    newMap.set(mmsi, updatedVessel);

                    // Clean up old nodes if limit reached
                    if (newMap.size > 500) {
                        const firstKey = newMap.keys().next().value;
                        if (firstKey !== undefined) newMap.delete(firstKey);
                    }
                    return newMap;
                });
            } catch (err) {}
        };

        socket.onerror = (err) => console.error("AIS Link Error:", err);
        socket.onclose = () => console.log("AIS Satellite Link Severed");

        return () => socket.close();
    }, [isLiveStreamActive]);


    const getColor = (mmt: number) => {
        if (mmt > 100) return '#10B981'; // High Density (Emerald)
        if (mmt > 50) return '#3B82F6'; // Medium (Blue)
        return '#8B5CF6'; // Normal (Purple)
    };

    const getRadius = (mmt: number, hovered: boolean) => {
        const base = Math.sqrt(mmt) * 1.5;
        return hovered ? base + 4 : base;
    };

    return (
        <div className="w-full h-full relative font-sans">
            {/* Intelligence Command Console (Vertical Sidebar) */}
            <div className={`absolute top-6 left-6 z-[1002] w-80 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-3xl p-5 shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] animate-in slide-in-from-left-4 duration-300`}>
                {/* Header: Terminal Identity */}
                <div className="flex items-center justify-between mb-6 border-b border-slate-800/20 pb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center border ${isDark ? 'border-emerald-500/20' : 'border-emerald-100'}`}>
                            <Anchor size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>India Priorities</h4>
                            <div className={`text-[8px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase`}>Intelligence Terminal v4.2</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsFullScreenFleet(true)}
                        className={`p-2 rounded-lg border shadow-sm transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                        title="Expand Global Fleet Directory"
                    >
                        <Maximize2 size={16} />
                    </button>
                </div>

                {/* Universal Fleet Console */}
                <div className="space-y-4 flex-1 flex flex-col min-h-0">
                    <div className="space-y-3">
                        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all ${isFocus ? 'ring-2 ring-emerald-500/20 border-emerald-500' : (isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200')}`}>
                            <Search size={14} className={isFocus ? 'text-emerald-500' : 'text-slate-500'} />
                            <input 
                                type="text" 
                                placeholder="Search Fleet (Name/MMSI)..."
                                className={`bg-transparent border-none outline-none text-[10px] font-black ${isDark ? 'text-white' : 'text-slate-900'} w-full placeholder:opacity-50`}
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                }}
                                onFocus={() => setIsFocus(true)}
                                onBlur={() => setTimeout(() => setIsFocus(false), 200)}
                            />
                        </div>

                        {/* Filter Hub Toolbar */}
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                {id: 'ALL', label: 'All', icon: <Layers size={10}/>},
                                {id: 'TANKER', label: 'Tankers', icon: <Zap size={10}/>},
                                {id: 'CARGO', label: 'Cargo', icon: <Database size={10}/>},
                                {id: 'INDIA', label: 'India', icon: <Anchor size={10}/>}
                            ].map(chip => (
                                <button 
                                    key={chip.id}
                                    onClick={() => setFilterType(chip.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[8px] font-black uppercase transition-all ${
                                        filterType === chip.id 
                                        ? (isDark ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-emerald-600 text-white border-emerald-700')
                                        : (isDark ? 'bg-slate-950/50 border-slate-800 text-slate-500 hover:border-slate-700' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300')
                                    }`}
                                >
                                    {chip.icon}
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Vessel Intelligence List (India Priority) */}
                    <div className="flex-1 overflow-y-auto mt-2 pr-2 custom-scrollbar border-t border-slate-800/10 pt-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className={`text-[8px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-[0.2em]`}>India Flag Directory</span>
                            <span className={`text-[8px] font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{sidebarVessels.length} Nodes</span>
                        </div>
                        <div className="space-y-2">
                        {sidebarVessels.length > 0 ? sidebarVessels.map(v => {
                            const country = getCountryFromMMSI(v.mmsi);
                            return (
                                <button 
                                    key={v.mmsi}
                                    onClick={() => {
                                        setSelectedVessel(v);
                                        setSearchQuery('');
                                    }}
                                    className={`w-full flex items-center justify-between p-3 ${isDark ? 'bg-slate-950/30 hover:bg-emerald-500/10 border-slate-800' : 'bg-slate-50 hover:bg-emerald-50 border-slate-100'} border rounded-xl transition-all group/item`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`fi fi-${country.code.toLowerCase()} rounded-[2px] shadow-sm`}></span>
                                        <div className="flex flex-col items-start text-left">
                                            <span className={`text-[10px] font-black ${isDark ? 'text-white' : 'text-slate-900'} group-hover/item:text-emerald-500 truncate w-24`}>{v.name}</span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className={`text-[7px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-500'} uppercase`}>{v.shipType || 'VESSEL'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{v.speed}</span>
                                        <ArrowUpRight size={10} className={`${isDark ? 'text-slate-700' : 'text-slate-300'} group-hover/item:text-emerald-400`} />
                                    </div>
                                </button>
                            );
                        }) : (
                            <div className="py-12 text-center">
                                <p className={`text-[8px] font-black ${isDark ? 'text-slate-700' : 'text-slate-400'} uppercase italic`}>Signal Buffer Empty...</p>
                            </div>
                        )}
                        </div>
                    </div>
                </div>

                {/* Footer: Terminal Metrics & Toggles */}
                <div className="mt-6 pt-5 border-t border-slate-800/20 space-y-4">
                    <div className="flex justify-between items-end">
                        <div className="text-left">
                            <div className={`text-[8px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-widest`}>Fiscal MMT Vol</div>
                            <div className={`text-sm font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>672.69 <span className="text-[8px] opacity-40">MMT</span></div>
                        </div>
                        <div className="flex items-center text-emerald-400 font-bold text-[9px] mb-0.5">
                            <ArrowUpRight size={10} /> 8.2%
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => setShowFlows(!showFlows)}
                            className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-[8px] font-black uppercase transition-all ${showFlows ? (isDark ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-indigo-50 border-indigo-500 text-indigo-600') : (isDark ? 'bg-slate-950 border-slate-800 text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-400')}`}
                        >
                            <Navigation size={12} /> Corridors
                        </button>
                        <button 
                            onClick={() => setShowSatellite(!showSatellite)}
                            className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-[8px] font-black uppercase transition-all ${showSatellite ? (isDark ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-orange-50 border-orange-500 text-orange-600') : (isDark ? 'bg-slate-950 border-slate-800 text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-400')}`}
                        >
                            <Layers size={12} /> Satellite
                        </button>
                    </div>

                    <button 
                        onClick={() => setIsLiveStreamActive(!isLiveStreamActive)} 
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                            isLiveStreamActive 
                            ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                            : (isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500')
                        }`}
                    >
                        <Radio size={12} className={isLiveStreamActive ? 'animate-pulse' : ''} />
                        {isLiveStreamActive ? 'Satellite Active' : 'Connect AIS'}
                    </button>
                </div>
            </div>

            {/* Map Component */}
            <MapContainer 
                center={[20, 78]} 
                zoom={5} 
                minZoom={3} 
                maxZoom={18} 
                zoomControl={false} 
                className="w-full h-full z-0" 
                style={{ background: isDark ? '#05070a' : '#f1f5f9' }}
            >
                {/* One-time Focus Controller (Selection Triggered) */}
                {selectedVessel && (
                    <MapController 
                        vessel={selectedVessel} 
                        zoom={12} 
                    />
                )}

                {showSatellite ? (
                    <TileLayer 
                        key="satellite-layer"
                        url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" 
                        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        maxZoom={20}
                        attribution='&copy; Google Maps' 
                    />
                ) : (
                    <TileLayer 
                        key="vector-layer"
                        url={`https://{s}.basemaps.cartocdn.com/${isDark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`} 
                        attribution='&copy; CARTO' 
                    />
                )}
                <ZoomControl position="topright" />

                {/* Live AIS Vessels - Comprehensive Global Tracking */}
                {isLiveStreamActive && Array.from(vessels.values()).map((v: Vessel) => {
                        const country = getCountryFromMMSI(v.mmsi);
                        const shipIcon = L.divIcon({
                            className: 'custom-ship-icon',
                            html: `
                                <div class="ship-container" style="transform: rotate(${v.course || 0}deg); transition: transform 0.8s ease-in-out;">
                                    <div class="ship-radar-ping"></div>
                                    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 2L13 12V34H27V12L20 2Z" fill="${selectedVessel?.mmsi === v.mmsi ? '#10B981' : '#1e293b'}" stroke="#000" stroke-width="0.5"/>
                                        <rect x="15" y="14" width="10" height="4" fill="#ef4444" rx="0.5"/>
                                        <rect x="15" y="19" width="10" height="4" fill="#3b82f6" rx="0.5"/>
                                        <rect x="15" y="24" width="10" height="4" fill="#F59E0B" rx="0.5"/>
                                        <rect x="16" y="29" width="8" height="4" fill="#94a3b8" rx="0.5"/>
                                        <rect x="18" y="29.5" width="4" height="1.5" fill="#e2e8f0"/>
                                        <circle cx="20" cy="5" r="0.8" fill="white"/>
                                    </svg>
                                </div>
                            `,
                            iconSize: [32, 32],
                            iconAnchor: [16, 16]
                        });

                        return (
                            <Marker
                                key={v.mmsi}
                                position={[Number(v.lat), Number(v.lng)]}
                                icon={shipIcon}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedVessel(v);
                                        setSelectedPort(null); // Close port sidebar if open
                                    }
                                }}
                            >
                                <LeafletTooltip direction="top" opacity={1} sticky={true} className="vessel-tooltip-custom">
                                    <div className={`p-3 ${isDark ? 'bg-slate-950 border-emerald-500/40 text-white' : 'bg-white border-emerald-600 text-slate-900'} border rounded-xl shadow-2xl`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <h6 className="text-[10px] font-black uppercase tracking-wider">{v.name}</h6>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] mb-1">
                                            <span className={`fi fi-${country.code.toLowerCase()}`}></span>
                                            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-bold uppercase`}>{country.name}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'} font-bold uppercase`}>Speed</span>
                                            <span className={`text-[9px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-black text-right`}>{v.speed} KTS</span>
                                            <span className={`text-[9px] ${isDark ? 'text-orange-400' : 'text-orange-600'} font-black text-right`}>{v.navStatus || 'ACTIVE'}</span>
                                        </div>
                                    </div>
                                </LeafletTooltip>
                            </Marker>
                        );
                    })}

                {/* Ports */}
                {ports.map((port) => {
                    const isHovered = hoveredPort === port.id;
                    const isSelected = selectedPort === port.id;
                    const color = getColor(port.trafficMMT);
                    
                    return (
                        <CircleMarker
                            key={port.id}
                            center={[port.latitude, port.longitude]}
                            radius={getRadius(port.trafficMMT, isHovered || isSelected)}
                            pathOptions={{ 
                                fillColor: color, 
                                fillOpacity: isHovered || isSelected ? 0.9 : 0.6, 
                                color: isDark ? '#000' : '#475569', 
                                weight: isHovered ? (isDark ? 2 : 1.5) : 1,
                                className: port.trafficMMT > 100 ? 'animate-pulse' : ''
                            }}
                            eventHandlers={{
                                mouseover: () => setHoveredPort(port.id),
                                mouseout: () => setHoveredPort(null),
                                click: () => {
                                    setSelectedPort(port.id === selectedPort ? null : port.id);
                                    setSelectedVessel(null); // Close vessel sidebar if open
                                }
                            }}
                        >
                            <LeafletTooltip direction="top" offset={[0, -10]} opacity={1} permanent={isHovered} className="port-tooltip-custom">
                                <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} shadow-2xl`}>
                                    <h5 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mb-1`}>{port.name}</h5>
                                    <div className="flex items-center justify-between gap-4 mb-2">
                                        <span className="text-[18px] font-black font-mono">{port.trafficMMT} <span className="text-[9px] uppercase opacity-60">MMT</span></span>
                                        <div className="flex items-center text-emerald-400 font-black text-[10px]">
                                            <ArrowUpRight size={12} className="mr-0.5" />
                                            {port.yearOnYear}%
                                        </div>
                                    </div>
                                </div>
                            </LeafletTooltip>
                        </CircleMarker>
                    );
                })}

                {/* Global Trade Flows */}
                {showFlows && GLOBAL_FLOWS.map((flow, i) => (
                    <React.Fragment key={`flow-${i}`}>
                        <Polyline 
                            positions={[flow.fromCoords, flow.toCoords]}
                            pathOptions={{ 
                                color: isDark ? '#6366f1' : '#4f46e5', 
                                weight: 1.5, 
                                opacity: isDark ? 0.3 : 0.5, 
                                dashArray: '5, 10', 
                                className: 'animate-trade-flow' 
                            }}
                        />
                        <CircleMarker 
                            center={flow.toCoords}
                            radius={3}
                            pathOptions={{ fillColor: '#6366f1', fillOpacity: 0.8, color: '#fff', weight: 1 }}
                        >
                             <LeafletTooltip direction="top" opacity={1} className="hub-tooltip-custom">
                                <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${isDark ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200'} border`}>Global Hub: {flow.to}</div>
                             </LeafletTooltip>
                        </CircleMarker>
                    </React.Fragment>
                ))}
            </MapContainer>

            {/* Vessel Intelligence Sidebar - HIGH DENSITY GRID */}
            {selectedVessel && (
                <div className={`absolute right-6 top-6 bottom-6 w-[380px] z-[1001] ${isDark ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-slate-200'} border rounded-[2rem] p-6 flex flex-col shadow-2xl animate-in slide-in-from-right-10 duration-500`}>
                    {/* Header: Identity Core */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center border ${isDark ? 'border-emerald-500/20' : 'border-emerald-100'}`}>
                                <Ship size={24} />
                            </div>
                            <div>
                                <h3 className={`text-lg font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'} leading-none truncate w-48`}>{selectedVessel.name}</h3>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className={`fi fi-${getCountryFromMMSI(selectedVessel.mmsi).code.toLowerCase()} rounded-sm`}></span>
                                    <span className={`text-[9px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase`}>MMSI: {selectedVessel.mmsi}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setSelectedVessel(null)} className={`p-2 ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-50 text-slate-400'} rounded-full transition-all`}>
                            <Activity size={18} className="rotate-45" />
                        </button>
                    </div>

                    <div className="flex-1 space-y-4">
                        {/* 3x3 Intelligence Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Identity Row */}
                            <div className={`col-span-1 p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <span className={`text-[8px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-1`}>IMO Number</span>
                                <div className={`text-[10px] font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedVessel.imo || '---'}</div>
                            </div>
                            <div className={`col-span-1 p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <span className={`text-[8px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-1`}>Call Sign</span>
                                <div className={`text-[10px] font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedVessel.callSign || 'N/A'}</div>
                            </div>
                            <div className={`col-span-1 p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <span className={`text-[8px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-1`}>Vessel Type</span>
                                <div className={`text-[9px] font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'} uppercase`}>{selectedVessel.shipType || 'GENERAL'}</div>
                            </div>

                            {/* Physical Row */}
                            <div className={`col-span-1 p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <span className={`text-[8px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-1`}>Length (m)</span>
                                <div className={`text-[11px] font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedVessel.length || '--'}</div>
                            </div>
                            <div className={`col-span-1 p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <span className={`text-[8px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-1`}>Width (m)</span>
                                <div className={`text-[11px] font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedVessel.width || '--'}</div>
                            </div>
                            <div className={`col-span-1 p-3 rounded-xl border ${isDark ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                                <span className={`text-[8px] font-black ${isDark ? 'text-orange-600/60' : 'text-orange-500'} uppercase block mb-1`}>Current Draft</span>
                                <div className={`text-[11px] font-mono font-black ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{selectedVessel.draft || '0'}m</div>
                            </div>

                            {/* Voyage Row */}
                            <div className={`col-span-2 p-3 rounded-xl border ${isDark ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                                <span className={`text-[8px] font-black ${isDark ? 'text-indigo-400' : 'text-indigo-500'} uppercase block mb-1`}>Declared Destination</span>
                                <div className={`text-[10px] font-black ${isDark ? 'text-white' : 'text-slate-900'} uppercase truncate`}>{selectedVessel.destination || 'SEARCHING...'}</div>
                            </div>
                            <div className={`col-span-1 p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                                <span className={`text-[8px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-1`}>ETA</span>
                                <div className={`text-[10px] font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{selectedVessel.eta || '--/--'}</div>
                            </div>
                        </div>

                        {/* Dynamics Radar */}
                        <div className={`${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-4`}>
                            <div className="flex justify-between items-center mb-4 border-b border-dashed border-slate-800 pb-2">
                                <h4 className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Motion Dynamics</h4>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[8px] font-black text-emerald-500 uppercase">Live Satellite Link</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-around">
                                <div className="text-center">
                                    <div className={`text-xl font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{selectedVessel.speed}</div>
                                    <div className={`text-[7px] font-black ${isDark ? 'text-slate-600' : 'text-slate-500'} uppercase`}>Knots (SOG)</div>
                                </div>
                                <div className={`w-px h-8 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                                <div className="text-center">
                                    <div className={`text-xl font-mono font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedVessel.course}°</div>
                                    <div className={`text-[7px] font-black ${isDark ? 'text-slate-600' : 'text-slate-500'} uppercase`}>Heading (COG)</div>
                                </div>
                                <div className={`w-px h-8 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
                                <div className="text-center">
                                    <Navigation size={20} className={`${isDark ? 'text-orange-400' : 'text-orange-600'} mx-auto mb-1`} transform={`rotate(${selectedVessel.course}deg)`} />
                                    <div className={`text-[7px] font-black ${isDark ? 'text-slate-600' : 'text-slate-500'} uppercase`}>Orientation</div>
                                </div>
                            </div>
                        </div>

                        {/* Supply Chain Impact - Dense View */}
                        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Database size={12} className="text-indigo-400" />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Intelligence Insight</span>
                            </div>
                            <p className={`text-[9px] font-bold leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'} uppercase italic`}>
                                {selectedVessel.shipType?.includes('Tanker') 
                                    ? "Critical Energy Asset: Strategic monitoring for cargo flow stability in Indian corridors."
                                    : "High-Volume Logistics: Key constituent for manufacturing supply chain resilience."}
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={() => onNavigate('dashboard')}
                        className={`mt-4 w-full py-3.5 rounded-xl ${isDark ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-700'} text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-all active:scale-[0.98]`}
                    >
                        Terminal Analysis Deep-Dive
                    </button>
                </div>
            )}

            {/* Maritime Intelligence HUD (Ports) */}
            {selectedPort && !selectedVessel && (
                <div className={`absolute right-6 top-6 bottom-6 w-[360px] z-[1001] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-3xl p-6 flex flex-col shadow-2xl animate-in slide-in-from-right-10 duration-300`}>
                    {MAJOR_PORTS.filter(p => p.id === selectedPort).map(port => (
                        <div key={port.id} className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'} flex items-center justify-center shadow-lg`}>
                                        <Ship size={24} />
                                    </div>
                                    <div>
                                        <h3 className={`text-xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'} leading-none`}>{port.name}</h3>
                                        <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-600'} mt-1 uppercase tracking-widest`}>{port.city}, {port.state}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPort(null)} className={`p-2 ${isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-50 text-slate-400'} rounded-full transition-colors`}>
                                    <Activity size={20} className="rotate-45" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className={`${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'} border p-4 rounded-2xl`}>
                                    <span className={`text-[9px] font-black ${isDark ? 'text-slate-600' : 'text-slate-500'} uppercase tracking-widest block mb-2`}>Annual Traffic</span>
                                    <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{port.trafficMMT}</div>
                                    <span className={`text-[8px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-500'} uppercase`}>Million Metric Tonnes</span>
                                </div>
                                <div className={`${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'} border p-4 rounded-2xl relative overflow-hidden group`}>
                                    {isLiveStreamActive && (
                                        <div className="absolute top-2 right-2 flex items-center gap-1 group-hover:scale-110 transition-transform">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <Zap size={10} className="text-emerald-500" />
                                        </div>
                                    )}
                                    <span className={`text-[9px] font-black ${isDark ? 'text-slate-600' : 'text-slate-500'} uppercase tracking-widest block mb-1`}>Satellite Link</span>
                                    <div className={`text-2xl font-black font-mono ${isLiveStreamActive ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-slate-600' : 'text-slate-400')}`}>
                                        {isLiveStreamActive ? 'ACTIVE' : 'READY'}
                                    </div>
                                    <span className={`text-[8px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-500'} uppercase tracking-widest`}>
                                        {isLiveStreamActive ? `${vessels.size} Nodes Live` : 'Signal Buffer Standby'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'} relative`}>
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mb-3 flex items-center gap-2`}>
                                        <Database size={12} /> Strategic Port Profile
                                    </h4>
                                    <p className={`text-[10px] font-bold leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'} uppercase`}>
                                        {port.description} This port acts as a primary logistical node for {port.state === 'Gujarat' ? 'western energy corridors' : 'eastern corporate hubs'}.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <span className={`text-[10px] font-black ${isDark ? 'text-slate-500' : 'text-slate-600'} uppercase tracking-[0.2em] block`}>Institutional Trade Flow</span>
                                    {GLOBAL_FLOWS.filter(f => f.from === port.id.toUpperCase() || f.from === port.name.split(' ')[0].toUpperCase()).map((flow, i) => (
                                        <div key={i} className={`flex items-center justify-between p-3 ${isDark ? 'bg-slate-950/40 border-slate-800 hover:border-emerald-500/30' : 'bg-white border-slate-100 hover:border-emerald-200'} border rounded-xl group transition-all`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'} font-bold`}><Ship size={12} /></div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[11px] font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight`}>{flow.to} Corridor</span>
                                                    <span className={`text-[9px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-500'} uppercase`}>{flow.commodity} High Traffic</span>
                                                </div>
                                            </div>
                                            <ArrowUpRight size={14} className={`text-slate-500 group-hover:${isDark ? 'text-emerald-400' : 'text-emerald-600'} transition-all`} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={() => onNavigate('dashboard')}
                                className={`mt-8 w-full py-4 rounded-2xl ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-900 hover:bg-black'} text-white text-[11px] font-black uppercase tracking-[0.3em] shadow-xl transition-all`}
                            >
                                Deep-Dive Commodities
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes trade-flow {
                    from { stroke-dashoffset: 100; }
                    to { stroke-dashoffset: 0; }
                }
                .animate-trade-flow {
                    animation: trade-flow 5s linear infinite;
                }
                .ship-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .ship-radar-ping {
                    position: absolute;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: ${isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(5, 150, 105, 0.05)'};
                    border: 1px solid ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.1)'};
                    animation: ship-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                    z-index: -1;
                }
                @keyframes ship-ping {
                    0% { transform: scale(1); opacity: 0.8; }
                    100% { transform: scale(3.5); opacity: 0; }
                }
                /* Leaflet Overrides for Solid Theme */
                .leaflet-tooltip.vessel-tooltip-custom, 
                .leaflet-tooltip.port-tooltip-custom,
                .leaflet-tooltip.hub-tooltip-custom {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                }
                .leaflet-tooltip-pane { z-index: 1000 !important; }
                
                /* Custom Scrollbar for Solid Theme */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: ${isDark ? '#0f172a' : '#f8fafc'};
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDark ? '#334155' : '#cbd5e1'};
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: ${isDark ? '#475569' : '#94a3b8'};
                }
            ` }} />            {/* Full-Screen Global Fleet Navigator Overlay - Institutional Architecture */}
            {isFullScreenFleet && (
                <div className={`fixed inset-0 z-[2000] ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} flex flex-col p-8 animate-in fade-in zoom-in-95 duration-500 overflow-hidden`}>
                    {/* Background Technical Grid Pattern */}
                    <div className={`absolute inset-0 pointer-events-none opacity-[0.03] ${isDark ? 'invert' : ''}`} style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                    
                    {/* Navigator Header (Fix: Priority Visibility) */}
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={() => setIsFullScreenFleet(false)}
                                className={`p-4 rounded-3xl border shadow-xl transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-emerald-400 hover:scale-105 active:scale-95' : 'bg-white border-slate-200 text-emerald-600 hover:scale-105 active:scale-95'}`}
                                title="Return to Map Command (Esc)"
                            >
                                <X size={28} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Global Fleet Navigator</h2>
                                    <div className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'} text-[8px] font-black uppercase tracking-widest leading-none`}>Live Stream</div>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 font-bold uppercase text-[9px] tracking-[0.15em] opacity-40">
                                    <span>Satellite Hub Linked</span>
                                    <span>•</span>
                                    <span>Active Nodes: {vessels.size}</span>
                                    <span>•</span>
                                    <span className="text-emerald-500">Search Ready</span>
                                </div>
                            </div>
                        </div>

                        {/* Universal Control Center (Multi-Dimensional) */}
                        <div className="flex flex-col gap-5 flex-1 max-w-5xl px-12">
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border flex-1 transition-all ${isDark ? 'bg-slate-900/80 border-slate-800 focus-within:border-emerald-500/50' : 'bg-white border-slate-200 focus-within:border-emerald-500'}`}>
                                    <Search size={22} className="text-slate-500" />
                                    <input 
                                        type="text" 
                                        placeholder="Execute Universal Search (Name, MMSI, Voyage, Ship-Type)..."
                                        className={`bg-transparent border-none outline-none text-base font-black w-full placeholder:opacity-30 ${isDark ? 'text-white' : 'text-slate-900'}`}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`text-[8px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Fleet Base:</label>
                                    <select 
                                        value={selectedCountry}
                                        onChange={(e) => setSelectedCountry(e.target.value)}
                                        className={`px-4 py-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} text-[10px] font-black uppercase outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/10`}
                                    >
                                        <option value="ALL">All Nations</option>
                                        {activeCountries.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                {[
                                    {id: 'ALL', label: 'All Fleet', icon: <Layers size={14}/>},
                                    {id: 'INDIA', label: 'India Priority', icon: <Anchor size={14}/>},
                                    {id: 'TANKER', label: 'Tankers', icon: <Zap size={14}/>},
                                    {id: 'CARGO', label: 'Cargo', icon: <Database size={14}/>},
                                    {id: 'FISHING', label: 'Fishing', icon: <Fish size={14}/>},
                                    {id: 'MILITARY', label: 'Strategic', icon: <Shield size={14}/>}
                                ].map(chip => (
                                    <button 
                                        key={chip.id}
                                        onClick={() => setFilterType(chip.id)}
                                        className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                                            filterType === chip.id 
                                            ? (isDark ? 'bg-emerald-500 text-white border-emerald-400 shadow-xl shadow-emerald-500/20' : 'bg-emerald-600 text-white border-emerald-700 shadow-lg')
                                            : (isDark ? 'bg-slate-900/50 border-slate-800/80 text-slate-500 hover:border-slate-700 hover:text-slate-300' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300')
                                        }`}
                                    >
                                        {chip.icon}
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Navigator Grid - High Density Architecture */}
                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-8">
                            {globalFilteredVessels.map(v => {
                                const country = getCountryFromMMSI(v.mmsi);
                                return (
                                    <button 
                                        key={v.mmsi}
                                        onClick={() => {
                                            setSelectedVessel(v);
                                            setIsFullScreenFleet(false);
                                        }}
                                        className={`p-6 rounded-[2rem] border text-left transition-all group relative overflow-hidden ${
                                            isDark 
                                            ? 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900 hover:border-emerald-500/30 shadow-lg hover:shadow-emerald-500/5' 
                                            : 'bg-white border-slate-200/80 hover:border-emerald-400 shadow-sm hover:shadow-xl'
                                        }`}
                                    >
                                        {/* Status Bar */}
                                        <div className={`absolute top-0 left-0 w-full h-1 ${v.navStatus ? 'bg-emerald-500/20' : 'bg-indigo-500/20'}`}></div>
                                        
                                        <div className="flex justify-between items-start mb-5">
                                            <div className="flex flex-col gap-1.5">
                                                <div className={`w-12 h-12 rounded-2xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'} border flex items-center justify-center shadow-inner`}>
                                                    <span className={`fi fi-${country.code.toLowerCase()} text-xl shadow-sm rounded-[2px]`}></span>
                                                </div>
                                                <span className={`text-[7px] font-black uppercase tracking-widest ${isDark ? 'text-slate-700' : 'text-slate-400'} mt-1`}>{country.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-mono font-black tracking-tighter ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{v.speed} <span className="text-[10px] font-sans opacity-40 uppercase tracking-normal">Kts</span></div>
                                                <div className={`flex items-center justify-end gap-1.5 mt-1`}>
                                                    <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'} animate-pulse`}></span>
                                                    <span className={`text-[8px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase`}>Live Satellite</span>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className={`text-base font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} group-hover:text-emerald-500 transition-colors mb-4 line-clamp-1`}>{v.name}</h3>
                                        
                                        {/* Strategic Asset Details (Mono Grid) */}
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 rounded-2xl bg-black/5 dark:bg-black/20 border border-slate-800/10 mb-5 font-mono">
                                            <div>
                                                <label className={`text-[7px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-0.5`}>Ship Type</label>
                                                <span className={`text-[10px] font-black ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase block line-clamp-1`}>{v.shipType || 'UNSPECIFIED'}</span>
                                            </div>
                                            <div className="text-right">
                                                <label className={`text-[7px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-0.5`}>MMSI Protocol</label>
                                                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} block`}>{v.mmsi}</span>
                                            </div>
                                            <div>
                                                <label className={`text-[7px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-0.5`}>Tactical Status</label>
                                                <span className={`text-[9px] font-black ${isDark ? 'text-emerald-500/80' : 'text-emerald-600'} uppercase truncate block`}>{v.navStatus || 'UNDER-WAY'}</span>
                                            </div>
                                            <div className="text-right">
                                                <label className={`text-[7px] font-black ${isDark ? 'text-slate-600' : 'text-slate-400'} uppercase block mb-0.5`}>Asset CallSign</label>
                                                <span className={`text-[10px] font-black ${isDark ? 'text-slate-300' : 'text-slate-700'} block uppercase tracking-wider`}>{v.callSign || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pb-1">
                                            <div className="flex flex-col max-w-[70%]">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Navigation size={10} className="text-indigo-500" />
                                                    <span className={`text-[7px] font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'} uppercase tracking-widest`}>Voyage Target</span>
                                                </div>
                                                <span className={`text-[11px] font-black ${isDark ? 'text-slate-200' : 'text-slate-800'} uppercase truncate`}>{v.destination || 'AWAITING ORDER'}</span>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-slate-800 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-slate-50 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                                                <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuanMapMaritime;
