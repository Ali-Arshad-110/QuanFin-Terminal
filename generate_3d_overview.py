import os
import json

def generate_graph(root_dir):
    nodes = []
    links = []
    
    ignore_dirs = {'.git', 'node_modules', '.venv', '__pycache__', 'dist', 'build', '.gemini', '.nx', '.vscode'}
    
    # Root node
    root_id = "QuanFin_Terminal"
    nodes.append({"id": root_id, "name": root_id, "group": 0, "val": 25})
    
    def get_group(path):
        path_lower = path.lower()
        if 'frontend' in path_lower: return 1
        if 'backend' in path_lower: return 2
        return 3

    for root, dirs, files in os.walk(root_dir):
        # modify dirs in-place to skip ignored directories
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        rel_root = os.path.relpath(root, root_dir)
        parent_id = root_id if rel_root == "." else rel_root
        
        # Add dirs as nodes
        for d in dirs:
            dir_path = os.path.join(rel_root, d) if rel_root != "." else d
            nodes.append({"id": dir_path, "name": d, "group": get_group(dir_path), "val": 10})
            links.append({"source": parent_id, "target": dir_path})
            
        # Add files as nodes
        for f in files:
            if f.endswith('.pyc') or f.endswith('.pyo') or f.endswith('.log') or f == 'package-lock.json': continue
            file_path = os.path.join(rel_root, f) if rel_root != "." else f
            
            # Larger node if it's a main file or important component
            val = 3
            if f in ['main.py', 'App.tsx', 'index.tsx', 'engine.py', 'Dashboard.tsx']:
                val = 8
                
            nodes.append({"id": file_path, "name": f, "group": get_group(file_path), "val": val})
            links.append({"source": parent_id, "target": file_path})

    return {"nodes": nodes, "links": links}

data = generate_graph('.')

html_content = f"""
<!DOCTYPE html>
<html>
<head>
  <style> 
    body {{ margin: 0; padding: 0; background: #000011; }}
    #info {{ position: absolute; top: 10px; left: 10px; color: white; font-family: sans-serif; pointer-events: none; z-index: 10; font-size: 14px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px; border: 1px solid #333; }}
  </style>
  <script src="https://unpkg.com/3d-force-graph"></script>
</head>
<body>
  <div id="info">
    <h2 style="margin: 0 0 5px 0; color: #60a5fa;">QuanFin Repository 3D Overview</h2>
    Legend:<br>
    <span style="color: #4ade80;">●</span> Frontend (React)<br>
    <span style="color: #f87171;">●</span> Backend (FastAPI)<br>
    <span style="color: #94a3b8;">●</span> Config/Other<br><br>
    <i>Scroll to zoom, drag to rotate. Hover nodes to see filenames.</i>
  </div>
  <div id="3d-graph"></div>
  <script>
    const gData = {json.dumps(data)};
    
    // Group Colors
    const colorMap = {{
        0: '#ffffff', // Root
        1: '#4ade80', // Frontend
        2: '#f87171', // Backend
        3: '#94a3b8'  // Internal/Other
    }};

    const Graph = ForceGraph3D()
      (document.getElementById('3d-graph'))
        .graphData(gData)
        .nodeLabel('name')
        .nodeColor(node => colorMap[node.group] || '#cccccc')
        .nodeVal('val')
        .linkWidth(0.5)
        .linkColor(() => '#333344')
        .backgroundColor('#000011')
        .onNodeClick(node => {{
            // Aim at node from outside it
            const distance = 40;
            const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

            Graph.cameraPosition(
                {{ x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }}, // new position
                node, // lookAt ({{ x, y, z }})
                3000  // ms transition duration
            );
        }});
  </script>
</body>
</html>
"""

with open("project_3d_overview.html", "w", encoding="utf-8") as f:
    f.write(html_content)
    
print("Successfully generated project_3d_overview.html")
