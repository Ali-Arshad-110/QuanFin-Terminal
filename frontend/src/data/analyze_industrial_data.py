import json
import os
from collections import defaultdict

def analyze_industrial_data(input_file, output_file):
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found.")
        return

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"--- ANALYZING {len(data)} NODES ---")
    
    # 1. Structural Analysis
    sample = data[0] if data else {}
    mapping = {k: str(type(v).__name__) for k, v in sample.items()}
    print(f"Data Fields & Types: {mapping}")

    # 2. HQ vs Asset Distribution
    hqs = [n for n in data if n.get('isHQ')]
    assets = [n for n in data if not n.get('isHQ')]
    print(f"HQs: {len(hqs)}")
    print(f"Assets: {len(assets)}")

    # 3. Clustering Logic (City-Sector Mapping)
    clusters = defaultdict(lambda: {"total": 0, "hqs": 0, "sectors": defaultdict(int), "companies": []})

    for node in data:
        city_full = node.get('city', 'Unknown')
        city_base = city_full.split('(')[0].strip() or "Unknown"
        
        clusters[city_base]["total"] += 1
        if node.get('isHQ'):
            clusters[city_base]["hqs"] += 1
            clusters[city_base]["companies"].append({
                "name": node.get('company'),
                "sector": node.get('sector'),
                "id": node.get('id')
            })
        
        clusters[city_base]["sectors"][node.get('sector', 'Other')] += 1

    # Format for JSON Export
    export_result = {
        "metadata": {
            "total_nodes": len(data),
            "total_hqs": len(hqs),
            "total_assets": len(assets),
            "mapping": mapping
        },
        "city_clusters": {city: {
            "node_count": info["total"],
            "hq_count": info["hqs"],
            "sector_distribution": dict(info["sectors"]),
            "official_hqs": info["companies"]
        } for city, info in clusters.items()}
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(export_result, f, indent=3)

    print(f"--- ANALYSIS COMPLETE. Cluster data saved to {output_file} ---")

if __name__ == "__main__":
    path = r"c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\data\industrial_zones.json"
    analyze_industrial_data(path, "industrial_analysis.json")
