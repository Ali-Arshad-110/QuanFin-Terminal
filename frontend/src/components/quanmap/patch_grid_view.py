import os

path = r"c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_content = """                       {/* Registered Companies List */}
                       <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                             <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-2">
                               <Building size={12} className="text-orange-500" /> {activeSectorFilter ? activeSectorFilter : 'Registered Office Directory'}
                             </h3>
                             {activeSectorFilter && isSidebarFullScreen && (
                               <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
                                 <button 
                                   onClick={() => setCityViewMode('list')}
                                   className={`p-1.5 rounded-md transition-all ${cityViewMode === 'list' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                   title="List View"
                                 >
                                   <List size={12} />
                                 </button>
                                 <button 
                                   onClick={() => setCityViewMode('grid')}
                                   className={`p-1.5 rounded-md transition-all ${cityViewMode === 'grid' ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                   title="Grid View"
                                 >
                                   <LayoutGrid size={12} />
                                 </button>
                               </div>
                             )}
                          </div>

                          {activeSectorFilter ? (
                             <div className={`${isSidebarFullScreen ? "w-full" : "space-y-2"}`}>
                                {cityViewMode === 'list' || !isSidebarFullScreen ? (
                                   <div className={`${isSidebarFullScreen ? "flex flex-col w-full" : "space-y-2"}`}>
                                      {/* TABLE HEADER for FULL SCREEN */}
                                      {isSidebarFullScreen && (
                                        <div className="flex w-full px-2 py-1 border-b border-border/50 mb-1">
                                          <div className="text-[8px] font-black text-text-muted uppercase tracking-widest flex items-center">COMPANY</div>
                                        </div>
                                      )}

                                      {cityIntelligence.companies
                                         .filter(company => company.sector === activeSectorFilter)
                                         .map((company, idx) => {
                                            const symbol = company.node.id.replace('hq_', '').toUpperCase();
                                            const companyFullName = company.name.replace(' - CORPORATE HQ', '');
                                            return (
                                         <div 
                                            key={company.node.id} 
                                            onClick={() => { setSelectedPlant(company.node); setSidebarTab('COMPANY'); }}
                                            className={
                                              isSidebarFullScreen
                                              ? `flex w-full px-4 py-2 border-b border-border/40 hover:bg-surface/50 transition-all cursor-pointer items-center relative group`
                                              : `p-2 rounded-xl border transition-all cursor-pointer group ${selectedPlant?.id === company.node.id ? 'bg-accent/10 border-accent' : 'bg-background border-border hover:border-accent/40'}`
                                            }
                                          >
                                            {/* Left Colored Tick Line for Full screen strictly */}
                                            {isSidebarFullScreen && (
                                               <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${idx % 2 === 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            )}

                                            {isSidebarFullScreen ? (
                                               <>
                                                  <div className="flex-1 flex items-center gap-3 py-0.5">
                                                     <StockLogo symbol={symbol} name={companyFullName} size={8} />
                                                     <div className="flex flex-col">
                                                        <p className="text-[10px] font-black text-text-primary group-hover:text-accent transition-colors tracking-tight truncate">{companyFullName}</p>
                                                        <p className="text-[8px] font-black text-text-muted mt-0.5 truncate">{symbol}</p>
                                                     </div>
                                                  </div>
                                               </>
                                            ) : (
                                               <>
                                                  <div className="flex justify-between items-center">
                                                     <p className="text-[11px] font-black text-text-primary group-hover:text-accent transition-colors uppercase tracking-tight">{companyFullName}</p>
                                                     <Building2 size={12} className="text-text-muted group-hover:text-accent transition-colors" />
                                                  </div>
                                                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-1">{company.sector}</p>
                                               </>
                                            )}
                                         </div>
                                      )})}
                                   </div>
                                ) : (
                                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                      {cityIntelligence.companies
                                         .filter(company => company.sector === activeSectorFilter)
                                         .map((company) => {
                                            const symbol = company.node.id.replace('hq_', '').toUpperCase();
                                            const companyFullName = company.name.replace(' - CORPORATE HQ', '');
                                            const isSelected = selectedPlant?.id === company.node.id;
                                            return (
                                         <div 
                                            key={company.node.id} 
                                            onClick={() => { setSelectedPlant(company.node); setSidebarTab('COMPANY'); }}
                                            className={`bg-surface/30 border p-4 rounded-xl flex flex-col items-center text-center space-y-3 transition-all cursor-pointer hover:border-accent/40 hover:bg-surface/50 group ${isSelected ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border/60'}`}
                                          >
                                            <div className="relative">
                                               <StockLogo symbol={symbol} name={companyFullName} size={12} className="rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
                                               {isSelected && (
                                                 <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background shadow-sm" />
                                               )}
                                            </div>
                                            <div className="flex flex-col w-full overflow-hidden">
                                               <p className="text-[10px] font-black text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-tight uppercase tracking-tight w-full px-1">{companyFullName}</p>
                                               <p className="text-[8px] font-black text-text-muted tracking-widest mt-1">{symbol}</p>
                                            </div>
                                         </div>
                                      )})}
                                   </div>
                                )}
                             </div>"""

# Find Start
start_marker = "{/* Registered Companies List */}"
start_line = -1
for i, line in enumerate(lines):
    if start_marker in line:
        start_line = i
        break

# Find End (the ') : (' marker after the list)
end_line = -1
if start_line != -1:
    for i in range(start_line, len(lines)):
        if ") : (" in lines[i]:
            end_line = i
            break

if start_line != -1 and end_line != -1:
    # We replace from start_line to end_line (exclusive of end_line)
    lines[start_line:end_line] = [new_content + "\\n"]
    
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"Successfully patched Grid View from line {start_line} to {end_line}")
else:
    print(f"Could not find markers: {start_line=}, {end_line=}")
