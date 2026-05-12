
import re
import os

source_path = r"c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\data\nifty500.ts"
dest_path = r"c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\backend\app\data\nifty500.py"

def generate():
    with open(source_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Regex to find objects like { symbol: "360ONE", name: "360 ONE WAM Ltd.", label: "..." },
    pattern = r'\{\s*symbol:\s*"(.*?)",\s*name:\s*"(.*?)",\s*label:\s*"(.*?)"\s*\}'
    matches = re.findall(pattern, content)

    print(f"Found {len(matches)} stocks.")

    py_content = 'NIFTY_500 = [\n'
    for m in matches:
        symbol, name, label = m
        # We store minimal info needed for search
        py_content += f'    {{"symbol": "{symbol}", "name": "{name}", "label": "{label}"}},\n'
    py_content += ']\n'

    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with open(dest_path, "w", encoding="utf-8") as f:
        f.write(py_content)
    
    print(f"Generated {dest_path}")

if __name__ == "__main__":
    generate()
