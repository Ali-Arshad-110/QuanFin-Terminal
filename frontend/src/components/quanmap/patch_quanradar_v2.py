import re
import os

file_path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Imports
if 'import { useMarketPulse }' not in content:
    content = content.replace("import StockLogo from '../StockLogo';", "import StockLogo from '../StockLogo';\nimport { useMarketPulse } from '../../hooks/useMarketPulse';")
    content = content.replace("MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl, useMap", "MapContainer, TileLayer, CircleMarker, Tooltip, ZoomControl, useMap, Polyline, Circle")
    content = content.replace("Building, RotateCcw, LayoutGrid, List", "Building, RotateCcw, LayoutGrid, List, Flame, Share2")

# 2. Add HeatmapLayer and FlowLines Components
if 'const HeatmapLayer' not in content:
    layers_code = """
// --- UTILS ---
const calculateBearing = (startLat: number, startLng: number, destLat: number, destLng: number) => {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;
  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) - Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

// --- NEW INTELLIGENCE LAYERS ---
const HeatmapLayer: React.FC<{ nodes: IndustrialNode[]; activeSector: string | null }> = ({ nodes, activeSector }) => {
  const clusters = React.useMemo(() => nodes.filter(n => !activeSector || n.sector === activeSector), [nodes, activeSector]);
  return (
    <>
      {clusters.map((node) => (
        <Circle
          key={`heat_${node.id}`}
          center={[node.lat, node.lng]}
          radius={50000 * (node.intensity || 0.5)}
          pathOptions={{
            fillColor: node.sector === 'Finance' ? '#3b82f6' : node.sector === 'IT/Software' ? '#8b5cf6' : node.sector === 'Manufacturing' ? '#f59e0b' : '#ef4444',
            fillOpacity: 0.15,
            color: 'transparent',
            className: 'blur-[30px] pointer-events-none'
          }}
        />
      ))}
    </>
  );
};

const FlowLines: React.FC<{ hq: IndustrialNode | null; allNodes: IndustrialNode[] }> = ({ hq, allNodes }) => {
  if (!hq) return null;
  const assets = React.useMemo(() => {
    const companyName = hq.company.split('(')[0].trim();
    return allNodes.filter(n => !n.isHQ && n.company.includes(companyName));
  }, [hq, allNodes]);

  return (
    <>
      {assets.map((asset) => (
        <Polyline
          key={`flow_${hq.id}_${asset.id}`}
          positions={[[hq.lat, hq.lng], [asset.lat, asset.lng]]}
          pathOptions={{
            color: 'rgba(var(--accent-rgb), 0.6)',
            weight: 1.5,
            dashArray: '5, 10',
            className: 'animate-flow-dash'
          }}
        />
      ))}
    </>
  );
};
"""
    content = content.replace("const MapController", layers_code + "\nconst MapController")

# 3. Add Pulse Badges in List View
list_item_pattern = r'\{isSidebarFullScreen \?\s*\(\s*<>\s*<div className="flex-1 flex items-center gap-3 py-0\.5">\s*<StockLogo symbol=\{symbol\} name=\{companyFullName\} size=\{8\} />'
list_item_replacement = r'''{isSidebarFullScreen ? (
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
                                                  </div>'''

if 'quotes[symbol]' not in content:
    content = re.sub(list_item_pattern, list_item_replacement, content)

# 4. Integrate Layers in MapContainer
if 'showHeatmap &&' not in content:
    content = content.replace("{/* Stable Controller (Prevent Shaking) */}", "{showHeatmap && <HeatmapLayer nodes={activeNodes} activeSector={activeSectorFilter} />}\n           {showFlows && <FlowLines hq={selectedPlant && selectedPlant.isHQ ? selectedPlant : null} allNodes={activeNodes} />}\n           {/* Stable Controller (Prevent Shaking) */}")

# 5. Add Dash Animation to Style
if 'animate-flow-dash' not in content:
    content = content.replace(".leaflet-pane-marker { z-index: 600 !important; }", ".leaflet-pane-marker { z-index: 600 !important; }\n        @keyframes flow-dash { to { stroke-dashoffset: -50; } }\n        .animate-flow-dash { animation: flow-dash 3s linear infinite; }\n        .blur-\[30px\] { filter: blur(30px); }")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully.")
