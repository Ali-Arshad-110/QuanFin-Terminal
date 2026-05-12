import re

file_path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove Imports
content = content.replace(", Polyline, Circle", "")
content = content.replace(",\n  Flame, Share2 // New icons for Heatmap and Flows", "")
# Potential simpler lucide-react cleanup
content = content.replace(", Flame, Share2", "")

# 2. Remove Helper Components (Calculation and Layers)
# Remove HeatmapLayer and FlowLines and calculateBearing (the one I added)
# Using regex to find the blocks starting from // --- UTILS --- to const QuanRadar: React.FC
pattern_utils_layers = r'// --- UTILS ---\nconst calculateBearing = \(startLat: number, startLng: number, destLat: number, destLng: number\) => \{[\s\S]*?const QuanRadar: React\.FC'
content = re.sub(pattern_utils_layers, 'const QuanRadar: React.FC', content)

# 3. Remove State
content = content.replace("  const [showHeatmap, setShowHeatmap] = useState(false);\n", "")
content = content.replace("  const [showFlows, setShowFlows] = useState(true);\n", "")

# 4. Remove UI Header Buttons
# Targeted replace for the toggles I added
header_toggle_pattern = r'<div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0\.5">\s*<button \s*onClick=\{\(\) => setShowHeatmap\(!showHeatmap\)\}[\s\S]*?<\/div>\s*<div className="w-px h-4 bg-border mx-1" \/>'
content = re.sub(header_toggle_pattern, '', content)

# 5. Remove Map Layers in Container
content = content.replace("{showHeatmap && <HeatmapLayer nodes={activeNodes} activeSector={activeSectorFilter} />}\n", "")
content = content.replace("{showFlows && <FlowLines hq={selectedPlant && selectedPlant.isHQ ? selectedPlant : null} allNodes={activeNodes} />}\n", "")

# 6. Remove Styles
content = content.replace("@keyframes flow-dash { to { stroke-dashoffset: -50; } }\n        .animate-flow-dash { animation: flow-dash 3s linear infinite; }\n        .blur-\[30px\] { filter: blur(30px); }\n", "")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Heatmap and Flow features removed successfully.")
