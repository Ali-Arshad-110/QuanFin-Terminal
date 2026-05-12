path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'
with open(path, 'rb') as f:
    raw = f.read()

idx = raw.find(b'CITY INTELLIGENCE HUB')
print(repr(raw[idx-50:idx+1200]))
