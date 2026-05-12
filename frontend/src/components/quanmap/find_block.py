path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'
with open(path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()

# The file uses \r\n. Find the block by searching for known sub-strings and replace line by line
lines = content.split('\r\n')

# Find start and end lines of the header block
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if '{/* CITY INTELLIGENCE HUB */}' in line and start_idx is None:
        start_idx = i
    if start_idx is not None and i > start_idx and line.strip() == '</div>' and end_idx is None:
        # This is the closing </div> of the main outer div block (p-8)
        # We need the one that closes the <div className="p-8..."> wrapper
        # Count open/close divs from start_idx
        pass

# Better approach: count divs
depth = 0
in_block = False
for i, line in enumerate(lines):
    if '{/* CITY INTELLIGENCE HUB */}' in line:
        in_block = True
        start_idx = i
    if in_block:
        depth += line.count('<div') - line.count('</div>')
        if in_block and i > start_idx and depth == 0:
            end_idx = i
            break

print(f"Block from line {start_idx} to {end_idx}")
print("--- START ---")
for l in lines[start_idx:end_idx+1]:
    print(repr(l))
print("--- END ---")
