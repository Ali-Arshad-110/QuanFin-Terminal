import os

path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Sector Card inside mapping
sector_old = """                               <div 
                                  key={sector} 
                                  onClick={() => setActiveSectorFilter(activeSectorFilter === sector ? null : sector)}
                                  className={`bg-background border p-4 rounded-2xl shadow-sm transition-all cursor-pointer ${activeSectorFilter === sector ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-accent/40'}`}
                               >
                                  <div className="flex items-center justify-between mb-2">
                                     <span className="text-[9px] font-black text-text-muted uppercase truncate mr-2">{sector}</span>
                                     <span className="text-xs font-black text-accent">{count}</span>
                                  </div>
                                  <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                                     <div 
                                        className="h-full bg-accent" 
                                        style={{ width: `${(count / cityIntelligence.totalOffices) * 100}%` }} 
                                     />
                                  </div>
                               </div>"""

sector_new = """                               <div 
                                  key={sector} 
                                  onClick={() => setActiveSectorFilter(activeSectorFilter === sector ? null : sector)}
                                  className={`p-4 rounded-xl shadow-sm transition-all cursor-pointer relative ${isSidebarFullScreen ? (activeSectorFilter === sector ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500 border-t border-r border-b border-border/50' : 'bg-surface/50 border border-border hover:border-accent/40 hover:bg-surface') : (activeSectorFilter === sector ? 'bg-background border border-accent ring-1 ring-accent/30' : 'bg-background border border-border hover:border-accent/40')}`}
                               >
                                  <div className="flex items-start justify-between mb-4">
                                     <span className="text-[11px] font-black text-text-primary uppercase truncate pr-4">{sector}</span>
                                     {isSidebarFullScreen && <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeSectorFilter === sector ? 'bg-emerald-500' : 'bg-text-muted/30'}`} />}
                                  </div>
                                  <div className="flex flex-col">
                                     {!isSidebarFullScreen && (
                                       <span className="text-xs font-black text-accent self-end mb-2">{count}</span>
                                     )}
                                     {isSidebarFullScreen && (
                                       <div className="flex items-end justify-between w-full mt-2">
                                          <div className="flex flex-col">
                                             <span className="text-[9px] font-black text-text-muted mb-0.5">OFFICES</span>
                                             <div className="flex items-center gap-1">
                                                <TrendingUp size={12} className={activeSectorFilter === sector ? 'text-emerald-500' : 'text-accent'} />
                                                <span className={`text-[12px] font-black ${activeSectorFilter === sector ? 'text-emerald-500' : 'text-accent'} tracking-tighter`}>+{count}</span>
                                             </div>
                                          </div>
                                       </div>
                                     )}
                                  </div>
                                  
                                  {!isSidebarFullScreen && (
                                    <div className="w-full h-1 bg-border rounded-full overflow-hidden mt-1">
                                       <div className="h-full bg-accent" style={{ width: `${(count / cityIntelligence.totalOffices) * 100}%` }} />
                                    </div>
                                  )}
                               </div>"""

text = text.replace(sector_old, sector_new)


# 2. Add Top Filter Header (Bullish/Bearish Toolbar) in full screen
header_title_old = """                           <Building size={12} className="text-orange-500" /> {activeSectorFilter ? `${activeSectorFilter} Directory` : 'Registered Office Directory'}
                         </h3>"""
header_title_new = """                           <Building size={12} className="text-orange-500" /> {activeSectorFilter ? `${activeSectorFilter} F&O Directory` : 'Registered Office Directory'}
                         </h3>
                         {isSidebarFullScreen && activeSectorFilter && (
                           <div className="flex items-center justify-end space-x-4 mb-4 pb-2 border-b border-border/30 px-2">
                              {/* Mock Table utility row from image */}
                              <div className="flex items-center space-x-1 text-[9px] font-bold text-text-muted">
                                <Activity size={10} className="text-emerald-500" /> <span>Bullish</span>
                              </div>
                              <div className="flex items-center space-x-1 text-[9px] font-bold text-text-muted">
                                <Activity size={10} className="text-red-500" /> <span>Bearish</span>
                              </div>
                           </div>
                         )}"""

text = text.replace(header_title_old, header_title_new)

# 3. Modify Company Iterator to render Table
companies_old = """                            <div className={`${isSidebarFullScreen ? "grid grid-cols-2 gap-3" : "space-y-2"}`}>
                               {cityIntelligence.companies
                                  .filter(company => company.sector === activeSectorFilter)
                                  .map((company) => (
                                  <div 
                                     key={company.node.id} 
                                     onClick={() => { setSelectedPlant(company.node); setSidebarTab('COMPANY'); }}
                                     className={`p-2 rounded-xl border transition-all cursor-pointer group ${selectedPlant.id === company.node.id ? 'bg-accent/10 border-accent' : 'bg-background border-border hover:border-accent/40'}`}
                                   >
                                     <div className="flex justify-between items-center">
                                        <p className="text-[11px] font-black text-text-primary group-hover:text-accent transition-colors uppercase tracking-tight">{company.name.replace(' - CORPORATE HQ', '')}</p>
                                        <Building2 size={12} className="text-text-muted group-hover:text-accent transition-colors" />
                                     </div>
                                     <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-1">{company.sector}</p>
                                  </div>
                               ))}
                            </div>"""

# Ensure TrendingDown is imported (It might not be imported yet, I'll add replacement for import later, but if it is I'll use it.)
# Just use Activity or ArrowDown if TrendingDown misses. Let me just use chevron or check what is imported. 
# Better: Just use string or inline SVG or standard lucide-react. I'll add TrendingDown to lucide-react import explicitly.

companies_new = """                            <div className={`${isSidebarFullScreen ? "flex flex-col w-full" : "space-y-2"}`}>
                               
                               {/* TABLE HEADER for FULL SCREEN */}
                               {isSidebarFullScreen && (
                                 <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border mb-2">
                                   <div className="col-span-4 text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center">F&O SCRIP</div>
                                   <div className="col-span-3 text-[9px] font-black text-text-muted uppercase tracking-widest text-right">LTP (INTENSITY)</div>
                                   <div className="col-span-3 text-[9px] font-black text-text-muted uppercase tracking-widest text-center">OPEN INTEREST</div>
                                   <div className="col-span-2 text-[9px] font-black text-text-muted uppercase tracking-widest text-right">VOLUME</div>
                                 </div>
                               )}

                               {cityIntelligence.companies
                                  .filter(company => company.sector === activeSectorFilter)
                                  .map((company, idx) => (
                                  <div 
                                     key={company.node.id} 
                                     onClick={() => { setSelectedPlant(company.node); setSidebarTab('COMPANY'); }}
                                     className={
                                       isSidebarFullScreen
                                       ? `grid grid-cols-12 gap-4 px-4 py-3 border-b border-border/40 hover:bg-surface/50 transition-all cursor-pointer items-center relative group`
                                       : `p-2 rounded-xl border transition-all cursor-pointer group ${selectedPlant?.id === company.node.id ? 'bg-accent/10 border-accent' : 'bg-background border-border hover:border-accent/40'}`
                                     }
                                   >
                                     {/* Left Colored Tick Line for Full screen strictly */}
                                     {isSidebarFullScreen && (
                                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${idx % 2 === 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                     )}

                                     {isSidebarFullScreen ? (
                                        <>
                                           <div className="col-span-4 flex flex-col py-1">
                                              <p className="text-[11px] font-black text-text-primary group-hover:text-accent transition-colors tracking-tight truncate">{company.name.replace(' - CORPORATE HQ', '')}</p>
                                              <p className="text-[8px] font-black text-text-muted mt-0.5 truncate">{company.name.split(' ')[0]}</p>
                                           </div>
                                           <div className="col-span-3 flex justify-end items-center gap-1.5">
                                              <span className={`text-[11px] font-black ${idx % 2 === 0 ? 'text-emerald-500' : 'text-red-500'}`}>₹{(company.node.intensity * 1000).toFixed(2)}</span>
                                              <span className={`text-[9px] font-black px-1 rounded bg-black/20 ${idx % 2 === 0 ? 'text-emerald-500' : 'text-red-500'}`}>{idx % 2 === 0 ? '+' : '-'}{(company.node.intensity * 2).toFixed(2)}%</span>
                                           </div>
                                           <div className="col-span-3 flex justify-center items-center text-[11px] font-medium text-text-muted">
                                              --
                                           </div>
                                           <div className="col-span-2 text-right">
                                              <span className="text-[11px] font-medium text-text-primary/80 font-mono">{(company.node.intensity * 80).toFixed(2)} L</span>
                                           </div>
                                        </>
                                     ) : (
                                        <>
                                           <div className="flex justify-between items-center">
                                              <p className="text-[11px] font-black text-text-primary group-hover:text-accent transition-colors uppercase tracking-tight">{company.name.replace(' - CORPORATE HQ', '')}</p>
                                              <Building2 size={12} className="text-text-muted group-hover:text-accent transition-colors" />
                                           </div>
                                           <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-1">{company.sector}</p>
                                        </>
                                     )}
                                  </div>
                               ))}
                            </div>"""

text = text.replace(companies_old, companies_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Table View UI injected.")
