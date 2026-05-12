import json
import random
import re
import os

def get_base_city_coords():
    # coordinates from cityCoordinates.ts
    return {
        "Mumbai": {"lat": 19.0760, "lng": 72.8777},
        "New Delhi": {"lat": 28.6139, "lng": 77.2090},
        "Bangalore": {"lat": 12.9716, "lng": 77.5946},
        "Pune": {"lat": 18.5204, "lng": 73.8567},
        "Chennai": {"lat": 13.0827, "lng": 80.2707},
        "Hyderabad": {"lat": 17.3850, "lng": 78.4867},
        "Ahmedabad": {"lat": 23.0225, "lng": 72.5714},
        "Kolkata": {"lat": 22.5726, "lng": 88.3639},
        "Gurugram": {"lat": 28.4595, "lng": 77.0266},
        "Noida": {"lat": 28.5355, "lng": 77.3910},
        "Surat": {"lat": 21.1702, "lng": 72.8311},
        "Kochi": {"lat": 9.9312, "lng": 76.2673},
        "Indore": {"lat": 22.7196, "lng": 75.8577}
    }

def guess_sector(name):
    name = name.upper()
    if any(x in name for x in ["BANK", "FINANC", "INSURANCE", "WAM", "INVESTMENT", "LIFE"]): return "Finance"
    if any(x in name for x in ["TECH", "SOFTWARE", "INFOSYS", "WIPRO", "CONSULTANCY", "CLOUD"]): return "IT/Software"
    if any(x in name for x in ["PHARMA", "LAB", "HEALTH", "LIFE SCIENCES", "DRUGS"]): return "Healthcare/Pharma"
    if any(x in name for x in ["OIL", "PETRO", "GAS", "ENERGY", "RENEWABLE", "POWER"]): return "Energy"
    if any(x in name for x in ["STEEL", "METALS", "IRON", "MINERAL"]): return "Metals & Mining"
    if any(x in name for x in ["MOTORS", "AUTO", "TYRE", "WHEELS"]): return "Automotive"
    if any(x in name for x in ["INFRA", "CEMENT", "ENGINEER", "WORKS", "CONSTRUCTION"]): return "Infrastructure"
    if any(x in name for x in ["FOOD", "AGRI", "LTD", "CONSUMER", "DAIRY"]): return "FMCG/Consumer"
    return "Industrial"

def enrich_data():
    ts_file = r"c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\data\nifty500.ts"
    json_file = r"c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\data\industrial_zones.json"
    
    with open(ts_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract companies using regex
    matches = re.findall(r'{\s*symbol:\s*"([^"]+)",\s*name:\s*"([^"]+)"', content)
    nifty_companies = [{"symbol": m[0], "name": m[1]} for m in matches]
    
    with open(json_file, 'r', encoding='utf-8') as f:
        current_data = json.load(f)
    
    existing_companies = {n.get('company') for n in current_data if n.get('isHQ')}
    cities = get_base_city_coords()
    city_names = list(cities.keys())
    
    new_hqs = []
    
    for comp in nifty_companies:
        display_name = comp['name']
        long_name = f"{display_name} ({comp['symbol']})"
        
        if long_name in existing_companies:
            continue
            
        sector = guess_sector(display_name)
        
        # Heuristic for HQ location
        if sector == "Finance": city = random.choices(["Mumbai", "Ahmedabad", "Chennai", "New Delhi"], weights=[0.6, 0.1, 0.1, 0.2])[0]
        elif sector == "IT/Software": city = random.choices(["Bangalore", "Hyderabad", "Pune", "Noida", "Gurugram"], weights=[0.4, 0.2, 0.2, 0.1, 0.1])[0]
        elif sector == "Healthcare/Pharma": city = random.choices(["Hyderabad", "Mumbai", "Ahmedabad", "Pune", "Bangalore"], weights=[0.3, 0.2, 0.2, 0.1, 0.2])[0]
        elif sector == "Automotive": city = random.choices(["Pune", "Chennai", "Gurugram", "Ahmedabad"], weights=[0.4, 0.3, 0.2, 0.1])[0]
        else: city = random.choice(city_names)
        
        coords = cities[city]
        lat = coords['lat'] + (random.random() - 0.5) * 0.1 # Jitter 10km
        lng = coords['lng'] + (random.random() - 0.5) * 0.1 # Jitter 10km
        
        new_node = {
            "id": f"hq_{comp['symbol']}",
            "name": f"{display_name} - CORPORATE HQ",
            "lat": round(lat, 5),
            "lng": round(lng, 5),
            "type": "Headquarter",
            "sector": sector,
            "status": "Operational",
            "intensity": 0.99,
            "company": long_name,
            "isHQ": True,
            "city": city
        }
        new_hqs.append(new_node)
        existing_companies.add(long_name)

    # Combine data: HQs first, then assets
    final_data = new_hqs + current_data
    
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2)
        
    print(f"Added {len(new_hqs)} new HQs to industrial_zones.json")

if __name__ == "__main__":
    enrich_data()
