import React, { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl } from 'react-leaflet';
import { ExternalLink, Gavel, Scale, FileText, Building2 } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { regulators } from '../../data/regulators';
import type { Regulator } from '../../data/regulators';

const QuanMapRegulators: React.FC = () => {
  const { themeMode } = useTheme();
  const [selectedRegulator, setSelectedRegulator] = useState<Regulator | null>(null);

  const regulatorList = Object.values(regulators);

  return (
    <div className="w-full h-full relative flex">
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

          {regulatorList.map((reg, i) => {
            const isSelected = selectedRegulator?.countryCode === reg.countryCode;
            
            return (
              <CircleMarker
                key={`${reg.countryCode}-${i}`}
                center={[reg.lat, reg.lng]}
                radius={isSelected ? 10 : 6}
                pathOptions={{
                  fillColor: isSelected ? '#3B82F6' : (themeMode === 'dark' ? '#60A5FA' : '#3B82F6'),
                  fillOpacity: isSelected ? 1 : 0.6,
                  color: themeMode === 'dark' ? '#1e3a8a' : '#bfdbfe',
                  weight: isSelected ? 2 : 1
                }}
                eventHandlers={{
                  click: () => setSelectedRegulator(reg)
                }}
                className="cursor-pointer transition-all duration-300"
              >
                <Tooltip 
                  direction="top" 
                  offset={[0, -10]} 
                  opacity={1}
                  className="font-bold bg-surface border-border text-text-primary text-[10px]"
                >
                  {reg.acronym} - {reg.country}
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Regulator Info Side Panel (Solid UI) */}
      <div 
        className={`w-[450px] bg-surface border-l border-border h-full flex flex-col transition-all duration-300 transform ${
          selectedRegulator ? 'translate-x-0' : 'translate-x-full'
        } absolute right-0 top-0 z-30 shadow-[0_0_50px_rgba(0,0,0,0.3)]`}
      >
        {selectedRegulator && (
          <div className="flex flex-col h-full animate-in slide-in-from-right fade-in duration-300">
            {/* Header */}
            <div className="p-8 border-b border-border bg-background relative overflow-hidden">
              <div className="absolute right-[-40px] top-[-30px] opacity-5">
                <Scale size={200} />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-xs font-bold tracking-wider uppercase">
                    {selectedRegulator.countryCode} • {selectedRegulator.country}
                  </span>
                  <a 
                    href={selectedRegulator.website} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 bg-surface hover:bg-accent hover:text-white rounded-full transition-colors border border-border group"
                    title="Official Website"
                  >
                    <ExternalLink size={16} className="text-text-secondary group-hover:text-white" />
                  </a>
                </div>
                
                <h1 className="text-4xl font-black text-text-primary tracking-tighter mb-2">
                  {selectedRegulator.acronym}
                </h1>
                <h2 className="text-lg font-medium text-text-muted leading-tight">
                  {selectedRegulator.name}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              
              <div>
                <h3 className="text-sm uppercase tracking-widest text-text-muted mb-3 flex items-center">
                  <Gavel size={14} className="mr-2 text-accent" />
                  Jurisdictional Authority
                </h3>
                <div className="bg-background rounded-xl p-4 border border-border shadow-sm">
                  <p className="text-text-primary font-medium">{selectedRegulator.jurisdiction}</p>
                  <div className="mt-3 pt-3 border-t border-border flex justify-between">
                    <span className="text-text-muted text-sm">Founded</span>
                    <span className="font-mono text-text-primary">{selectedRegulator.founded}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-widest text-text-muted mb-3 flex items-center">
                  <Building2 size={14} className="mr-2 text-accent" />
                  Market Operations
                </h3>
                <div className="bg-background rounded-xl p-4 border border-border shadow-sm">
                  <p className="text-text-secondary text-sm mb-1">Primary Underlying Exchanges</p>
                  <p className="text-text-primary font-bold text-lg">{selectedRegulator.primaryExchange}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-widest text-text-muted mb-3 flex items-center">
                  <FileText size={14} className="mr-2 text-accent" />
                  Circuit Breaker / Halts
                </h3>
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/50"></div>
                  <p className="text-text-primary leading-relaxed text-sm">
                    {selectedRegulator.circuitBreakerNote}
                  </p>
                </div>
              </div>
              
            </div>
            
            <div className="mt-auto p-4 border-t border-border bg-background text-center text-xs text-text-secondary font-medium">
              Select another region to update regulatory intelligence.
            </div>
          </div>
        )}
        
        {!selectedRegulator && (
          <div className="flex h-full items-center justify-center p-8 text-center bg-background">
            <div className="space-y-4">
              <Scale size={48} className="mx-auto text-border" />
              <p className="text-text-secondary font-medium italic">Select a highlighted country to view its regulatory authority framework.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuanMapRegulators;
