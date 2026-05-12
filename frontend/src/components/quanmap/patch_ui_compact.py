import os

path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Title and Remove Bullish/Bearish
title_block_old = """                         <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Building size={12} className="text-orange-500" /> {activeSectorFilter ? `${activeSectorFilter} F&O Directory` : 'Registered Office Directory'}
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
                         
title_block_new = """                         <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <Building size={12} className="text-orange-500" /> {activeSectorFilter ? activeSectorFilter : 'Registered Office Directory'}
                         </h3>"""

text = text.replace(title_block_old, title_block_new)

# 2. Update Table Header
header_old = """                               {/* TABLE HEADER for FULL SCREEN */}
                               {isSidebarFullScreen && (
                                 <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border mb-2">
                                   <div className="col-span-4 text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center">F&O SCRIP</div>
                                   <div className="col-span-3 text-[9px] font-black text-text-muted uppercase tracking-widest text-right">LTP (INTENSITY)</div>
                                   <div className="col-span-3 text-[9px] font-black text-text-muted uppercase tracking-widest text-center">OPEN INTEREST</div>
                                   <div className="col-span-2 text-[9px] font-black text-text-muted uppercase tracking-widest text-right">VOLUME</div>
                                 </div>
                               )}"""
                               
header_new = """                               {/* TABLE HEADER for FULL SCREEN */}
                               {isSidebarFullScreen && (
                                 <div className="grid grid-cols-12 gap-2 px-2 py-2 border-b border-border mb-2">
                                   <div className="col-span-5 text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center">COMPANY</div>
                                   <div className="col-span-4 text-[9px] font-black text-text-muted uppercase tracking-widest text-right">LIVE PRICE</div>
                                   <div className="col-span-3 text-[9px] font-black text-text-muted uppercase tracking-widest text-right">VOLUME</div>
                                 </div>
                               )}"""

text = text.replace(header_old, header_new)

# 3. Update Mapped Row and its classes
row_old = """                                     className={
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
                                        </>"""
                                        
row_new = """                                     className={
                                       isSidebarFullScreen
                                       ? `grid grid-cols-12 gap-2 px-2 py-2 border-b border-border/40 hover:bg-surface/50 transition-all cursor-pointer items-center relative group`
                                       : `p-2 rounded-xl border transition-all cursor-pointer group ${selectedPlant?.id === company.node.id ? 'bg-accent/10 border-accent' : 'bg-background border-border hover:border-accent/40'}`
                                     }
                                   >
                                     {/* Left Colored Tick Line for Full screen strictly */}
                                     {isSidebarFullScreen && (
                                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${idx % 2 === 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                     )}

                                     {isSidebarFullScreen ? (
                                        <>
                                           <div className="col-span-5 flex flex-col py-1">
                                              <p className="text-[10px] font-black text-text-primary group-hover:text-accent transition-colors tracking-tight truncate">{company.name.replace(' - CORPORATE HQ', '')}</p>
                                              <p className="text-[8px] font-black text-text-muted mt-0.5 truncate">{company.name.split(' ')[0]}</p>
                                           </div>
                                           <div className="col-span-4 flex justify-end items-center gap-1.5">
                                              <span className={`text-[10px] font-black ${idx % 2 === 0 ? 'text-emerald-500' : 'text-red-500'}`}>₹{(company.node.intensity * 1000).toFixed(2)}</span>
                                              <span className={`text-[9px] font-black px-1 rounded bg-black/20 ${idx % 2 === 0 ? 'text-emerald-500' : 'text-red-500'}`}>{idx % 2 === 0 ? '+' : '-'}{(company.node.intensity * 2).toFixed(2)}%</span>
                                           </div>
                                           <div className="col-span-3 text-right flex items-center justify-end">
                                              <span className="text-[10px] font-medium text-text-primary/80 font-mono">{(company.node.intensity * 80).toFixed(2)} L</span>
                                           </div>
                                        </>"""

text = text.replace(row_old, row_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updates applied successfully.")
