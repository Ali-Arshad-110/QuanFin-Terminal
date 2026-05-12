path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'
with open(path, 'rb') as f:
    raw = f.read()

idx = raw.find(b'CITY INTELLIGENCE HUB')
chunk = raw[idx-50:idx+1200]
# Write to a temp text file for full inspection
with open(r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\header_chunk.txt', 'wb') as f:
    f.write(chunk)
print("Written to header_chunk.txt")
