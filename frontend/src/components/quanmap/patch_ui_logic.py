import re

path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. State Addition
if 'const [isSidebarFullScreen' not in text:
    text = text.replace(
        "const [sidebarTab, setSidebarTab] = useState<'COMPANY' | 'CITY'>('COMPANY');",
        "const [sidebarTab, setSidebarTab] = useState<'COMPANY' | 'CITY'>('COMPANY');\n  const [isSidebarFullScreen, setIsSidebarFullScreen] = useState(false);"
    )

# 2. Main Wrapper Adjustments
text = text.replace(
    "className={`absolute top-0 right-0 h-full w-[400px] bg-surface border-l border-border z-[1005] transition-transform duration-700 ease-elastic ${selectedPlant && isSidebarOpen ? 'translate-x-0 shadow-[-20px_0_60px_rgba(0,0,0,0.4)]' : 'translate-x-full'}`}",
    "className={`absolute top-0 right-0 h-full bg-surface border-l border-border transition-transform duration-700 ease-elastic flex flex-col ${isSidebarFullScreen ? 'w-full z-[1050]' : 'w-[400px] z-[1005]'} ${selectedPlant && isSidebarOpen ? 'translate-x-0 shadow-[-20px_0_60px_rgba(0,0,0,0.4)]' : 'translate-x-[calc(100%+32px)]'}`}"
)

# 3. Sidebar Toggle Fix
text = text.replace(
    "onClick={() => setIsSidebarOpen(false)}",
    "onClick={() => setIsSidebarOpen(!isSidebarOpen)}"
)
text = text.replace(
    "<ChevronRight size={16} />",
    "{isSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}"
)

# 4. Insert Maximize Buttons
city_close_block = """                         <div className="flex items-center space-x-2">
                           <button onClick={() => { setSelectedPlant(null); setSelectedCity(null); }} className="p-2 hover:bg-background rounded-full transition-all text-text-muted">
                              <X size={24} />
                           </button>
                         </div>"""
city_close_replacement = """                         <div className="flex items-center space-x-2">
                           <button onClick={() => setIsSidebarFullScreen(!isSidebarFullScreen)} className="p-2 hover:bg-background rounded-full transition-all text-text-muted text-accent" title="Toggle Full Screen">
                              <Maximize2 size={16} />
                           </button>
                           <button onClick={() => { setSelectedPlant(null); setSelectedCity(null); setIsSidebarFullScreen(false); }} className="p-2 hover:bg-background rounded-full transition-all text-text-muted hover:text-red-500">
                              <X size={24} />
                           </button>
                         </div>"""
text = text.replace(city_close_block, city_close_replacement)

company_close_block = """                         <button onClick={() => { setSelectedPlant(null); setSelectedCity(null); }} className="p-2 hover:bg-background rounded-full transition-all text-text-muted">
                            <X size={24} />
                         </button>"""
company_close_replacement = """                         <div className="flex items-center space-x-2">
                           <button onClick={() => setIsSidebarFullScreen(!isSidebarFullScreen)} className="p-2 hover:bg-background rounded-full transition-all text-text-muted hover:text-accent" title="Toggle Full Screen">
                              <Maximize2 size={16} />
                           </button>
                           <button onClick={() => { setSelectedPlant(null); setSelectedCity(null); setIsSidebarFullScreen(false); }} className="p-2 hover:bg-background rounded-full transition-all text-text-muted hover:text-red-500">
                              <X size={24} />
                           </button>
                         </div>"""
text = text.replace(company_close_block, company_close_replacement)

# 5. Grid adjustments for full screen (CITY TAB)
text = text.replace(
    '<div className="grid grid-cols-2 gap-3">',
    '<div className={`grid ${isSidebarFullScreen ? "grid-cols-4" : "grid-cols-2"} gap-3`}>'
)
text = text.replace(
    '<div className="space-y-2">',
    '<div className={`${isSidebarFullScreen ? "grid grid-cols-3 gap-3" : "space-y-2"}`}>'
)

# 6. Adjust Company Detail Screen Layout for Full view
company_bottom_part = """                   <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-background border border-border p-5 rounded-[2rem]">
                            <div className="flex items-center space-x-3 mb-4">
                               {selectedPlant.isHQ ? <MapPin size={16} className="text-accent" /> : <Thermometer size={16} className="text-orange-500" />}
                               <span className="text-[9px] font-black uppercase text-text-muted">{selectedPlant.isHQ ? 'Region' : 'Heat Intel'}</span>
                            </div>
                            <p className="text-xl font-black text-text-primary tracking-tighter leading-none uppercase">
                              {selectedPlant.isHQ ? selectedPlant.city : `${(selectedPlant.intensity * 1000).toFixed(0)} μW`}
                            </p>
                         </div>
                         <div className="bg-background border border-border p-5 rounded-[2rem]">
                            <div className="flex items-center space-x-3 mb-4">
                               <TrendingUp size={16} className="text-emerald-500" />
                               <span className="text-[9px] font-black uppercase text-text-muted">F&O Delta</span>
                            </div>
                            <p className="text-xl font-black text-emerald-500 tracking-tighter leading-none">{(selectedPlant.intensity * 100).toFixed(1)} <span className="text-xs font-black opacity-30">%</span></p>
                         </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-background border border-border p-4 rounded-2xl flex items-center gap-4 hover:border-accent/40 transition-all cursor-pointer group">
                           <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-accent/20 transition-all"><Clock size={16} className="text-blue-500 group-hover:text-accent" /></div>
                           <div>
                              <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Active State</p>
                              <p className="text-[11px] font-black text-text-primary uppercase group-hover:text-accent transition-colors">{selectedPlant.isHQ ? 'Corporate Support Active' : 'Live Operations'}</p>
                           </div>
                        </div>

                        {selectedPlant.isHQ && (
                           <div className="p-5 bg-accent/5 border border-accent/20 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500 mt-4">
                              <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3">Institutional Insight</p>
                              <p className="text-[11px] text-text-primary/80 leading-relaxed font-medium">
                                Strategically located in <span className="text-accent font-black">{selectedPlant.city}</span>, 
                                this facility serves as the centralized steering hub for <span className="text-text-primary font-black">{selectedPlant.company}</span>. 
                                Satellite telemetery confirms 100% operational stability.
                              </p>
                           </div>
                        )}
                      </div>
                   </div>"""

company_bottom_part_new = """                   <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar ${isSidebarFullScreen ? "grid grid-cols-2 gap-8 items-start" : "space-y-10"}`}>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-background border border-border p-5 rounded-[2rem]">
                              <div className="flex items-center space-x-3 mb-4">
                                 {selectedPlant.isHQ ? <MapPin size={16} className="text-accent" /> : <Thermometer size={16} className="text-orange-500" />}
                                 <span className="text-[9px] font-black uppercase text-text-muted">{selectedPlant.isHQ ? 'Region' : 'Heat Intel'}</span>
                              </div>
                              <p className="text-xl font-black text-text-primary tracking-tighter leading-none uppercase">
                                {selectedPlant.isHQ ? selectedPlant.city : `${(selectedPlant.intensity * 1000).toFixed(0)} μW`}
                              </p>
                           </div>
                           <div className="bg-background border border-border p-5 rounded-[2rem]">
                              <div className="flex items-center space-x-3 mb-4">
                                 <TrendingUp size={16} className="text-emerald-500" />
                                 <span className="text-[9px] font-black uppercase text-text-muted">F&O Delta</span>
                              </div>
                              <p className="text-xl font-black text-emerald-500 tracking-tighter leading-none">{(selectedPlant.intensity * 100).toFixed(1)} <span className="text-xs font-black opacity-30">%</span></p>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-background border border-border p-4 rounded-2xl flex items-center gap-4 hover:border-accent/40 transition-all cursor-pointer group">
                           <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-accent/20 transition-all"><Clock size={16} className="text-blue-500 group-hover:text-accent" /></div>
                           <div>
                              <p className="text-[8px] font-black text-text-muted uppercase tracking-widest">Active State</p>
                              <p className="text-[11px] font-black text-text-primary uppercase group-hover:text-accent transition-colors">{selectedPlant.isHQ ? 'Corporate Support Active' : 'Live Operations'}</p>
                           </div>
                        </div>

                        {selectedPlant.isHQ && (
                           <div className="p-5 bg-accent/5 border border-accent/20 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500 mt-4">
                              <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3">Institutional Insight</p>
                              <p className="text-[11px] text-text-primary/80 leading-relaxed font-medium">
                                Strategically located in <span className="text-accent font-black">{selectedPlant.city}</span>, 
                                this facility serves as the centralized steering hub for <span className="text-text-primary font-black">{selectedPlant.company}</span>. 
                                Satellite telemetery confirms 100% operational stability.
                              </p>
                           </div>
                        )}
                      </div>
                   </div>"""

text = text.replace(company_bottom_part, company_bottom_part_new)

# 7. Hover Tooltip
tooltip_block = """                  <Tooltip direction="top" offset={[0, -5]} opacity={1} permanent={isSelected || (node.isHQ && activeNodes.length < 50)}>
                    <div className="px-3 py-1.5 bg-surface border border-border/80 rounded-xl shadow-xl text-[9px] font-black uppercase text-text-primary tracking-widest">
                       {node.isHQ ? `BASE: ${node.city}` : node.name}
                    </div>
                  </Tooltip>"""

tooltip_replacement = """                  <Tooltip direction="top" offset={[0, -5]} opacity={1} permanent={isSelected || (node.isHQ && activeNodes.length < 50)}>
                    <div className="px-3 py-1.5 bg-surface border border-border/80 rounded-xl shadow-xl text-[9px] font-black uppercase text-text-primary tracking-widest">
                       {node.isHQ ? node.company.replace(' - CORPORATE HQ', '') : node.name}
                    </div>
                  </Tooltip>"""
text = text.replace(tooltip_block, tooltip_replacement)


with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Patch applied successfully.")
