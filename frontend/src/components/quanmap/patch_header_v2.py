path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'
with open(path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()

lines = content.split('\r\n')

# Replace lines 357-382 (0-indexed) with the compact header
new_header_lines = [
    '                   {/* CITY INTELLIGENCE HUB \u2014 Compact Header */}',
    '                   <div className="px-5 py-3 border-b border-border bg-background flex items-center gap-4">',
    '                      <div className="flex items-center gap-1.5 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 flex-shrink-0">',
    '                         <MapPin size={11} className="text-orange-500" />',
    '                         <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">City Hub</span>',
    '                      </div>',
    '                      <h2 className="text-[13px] font-black text-text-primary tracking-tighter uppercase truncate flex-1 min-w-0">{cityIntelligence.name}</h2>',
    '                      <div className="flex items-center gap-3 flex-shrink-0">',
    '                         <div className="flex items-center gap-1">',
    '                            <span className="text-[13px] font-black text-accent">{cityIntelligence.totalOffices}</span>',
    '                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Offices</span>',
    '                         </div>',
    '                         <div className="w-px h-4 bg-border" />',
    '                         <div className="flex items-center gap-1">',
    '                            <span className="text-[13px] font-black text-text-primary">{cityIntelligence.sectorBreakdown.length}</span>',
    '                            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Sectors</span>',
    '                         </div>',
    '                         <div className="w-px h-4 bg-border" />',
    '                         <button onClick={() => setIsSidebarFullScreen(!isSidebarFullScreen)} className="p-1.5 hover:bg-surface rounded-lg transition-all text-text-muted hover:text-accent" title="Toggle Full Screen">',
    '                            <Maximize2 size={14} />',
    '                         </button>',
    '                         <button onClick={() => { setSelectedPlant(null); setSelectedCity(null); setActiveSectorFilter(null); setIsSidebarFullScreen(false); }} className="p-1.5 hover:bg-surface rounded-lg transition-all text-text-muted hover:text-red-500">',
    '                            <X size={14} />',
    '                         </button>',
    '                      </div>',
    '                   </div>',
]

# Replace lines 357 to 382 inclusive (0-indexed)
lines[357:383] = new_header_lines

new_content = '\r\n'.join(lines)
with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(new_content)

print(f"SUCCESS: replaced {383-357} lines with {len(new_header_lines)} compact header lines")
