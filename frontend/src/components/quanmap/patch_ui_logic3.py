import os

path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update the parent layout wrapper to side-by-side when full screen
wrapper_old = """                       <div className={`space-y-10 ${isSidebarFullScreen ? "max-w-6xl mx-auto w-full" : ""}`}>"""
wrapper_new = """                       <div className={`${isSidebarFullScreen ? "grid grid-cols-[1fr_2fr] gap-8 max-w-6xl mx-auto w-full items-start" : "space-y-10"}`}>"""
text = text.replace(wrapper_old, wrapper_new)

# 2. Update Sector grid columns because it's now occupying 1/3 of the screen instead of full width
sector_grid_old = """<div className={`grid ${isSidebarFullScreen ? "grid-cols-4" : "grid-cols-2"} gap-3`}>"""
sector_grid_new = """<div className="grid grid-cols-2 gap-3">"""
text = text.replace(sector_grid_old, sector_grid_new)

# 3. Add Empty State logic and update Companies grid columns
companies_block_old = """                         <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Building size={12} className="text-orange-500" /> Registered Office Directory
                         </h3>
                         <div className={`${isSidebarFullScreen ? "grid grid-cols-3 gap-3" : "space-y-2"}`}>
                            {cityIntelligence.companies
                               .filter(company => activeSectorFilter ? company.sector === activeSectorFilter : true)
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

companies_block_new = """                         <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Building size={12} className="text-orange-500" /> {activeSectorFilter ? `${activeSectorFilter} Directory` : 'Registered Office Directory'}
                         </h3>
                         {activeSectorFilter ? (
                            <div className={`${isSidebarFullScreen ? "grid grid-cols-2 gap-3" : "space-y-2"}`}>
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
                            </div>
                         ) : (
                            <div className="flex flex-col items-center justify-center p-12 mt-4 bg-background border border-dashed border-border rounded-2xl animate-in fade-in duration-500">
                               <Activity size={32} className="text-border mb-4" />
                               <p className="text-xs font-black text-text-muted uppercase tracking-widest text-center">Select an operational sector<br/>to reveal registered entities.</p>
                            </div>
                         )}"""

text = text.replace(companies_block_old, companies_block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Patch applied for structural layout adjustment.")
