import re

file_path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines)

# 1. Fix List View Duplication & Add Badge to Normal Sidebar
# This is a bit tricky due to the duplication I introduced. I'll search for the duplicated block.
# The problematic block starts around line 570
pattern_to_fix = r'<div className="flex-1 flex items-center gap-3 py-0\.5">\s*<StockLogo symbol=\{symbol\} name=\{companyFullName\} size=\{8\} />\s*<div className="flex flex-col">\s*<div className="flex items-center gap-2">\s*<p className="text-\[10px\] font-black text-text-primary group-hover:text-accent transition-colors tracking-tight truncate">\{companyFullName\}</p>\s*\{quotes\[symbol\] && \(\s*<span className=\{`text-\[8px\] font-black px-1\.5 py-0\.5 rounded-full \$\{quotes\[symbol\]\.changePercent >= 0 \? \'bg-emerald-500/10 text-emerald-500\' : \'bg-red-500/10 text-red-500\'\}`\}>\s*\{quotes\[symbol\]\.changePercent >= 0 \? \'\+\' : \'\'\}\{quotes\[symbol\]\.changePercent\.toFixed\(2\)\}%\s*</span>\s*\)\}\s*</div>\s*<p className="text-\[8px\] font-black text-text-muted mt-0\.5 truncate">\{symbol\}</p>\s*</div>\s*</div>\s*<div className="flex flex-col">\s*<p className="text-\[10px\] font-black text-text-primary group-hover:text-accent transition-colors tracking-tight truncate">\{companyFullName\}</p>\s*<p className="text-\[8px\] font-black text-text-muted mt-0\.5 truncate">\{symbol\}</p>\s*</div>'

fixed_block = r'''<div className="flex-1 flex items-center gap-3 py-0.5">
                                                     <StockLogo symbol={symbol} name={companyFullName} size={8} />
                                                     <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                           <p className="text-[10px] font-black text-text-primary group-hover:text-accent transition-colors tracking-tight truncate">{companyFullName}</p>
                                                           {quotes[symbol] && (
                                                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${quotes[symbol].changePercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                 {quotes[symbol].changePercent >= 0 ? '+' : ''}{quotes[symbol].changePercent.toFixed(2)}%
                                                              </span>
                                                           )}
                                                        </div>
                                                        <p className="text-[8px] font-black text-text-muted mt-0.5 truncate">{symbol}</p>
                                                     </div>'''

content = re.sub(pattern_to_fix, fixed_block, content)

# 2. Add Badge to Normal (Small) Sidebar View
normal_view_pattern = r'<p className="text-\[11px\] font-black text-text-primary group-hover:text-accent transition-colors uppercase tracking-tight">\{companyFullName\}</p>'
normal_view_replacement = r'''<div className="flex items-center gap-2">
                                                         <p className="text-[11px] font-black text-text-primary group-hover:text-accent transition-colors uppercase tracking-tight">{companyFullName}</p>
                                                         {quotes[symbol] && (
                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${quotes[symbol].changePercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                               {quotes[symbol].changePercent >= 0 ? '+' : ''}{quotes[symbol].changePercent.toFixed(2)}%
                                                            </span>
                                                         )}
                                                      </div>'''

content = re.sub(normal_view_pattern, normal_view_replacement, content)

# 3. Add Badge to Grid View
grid_view_pattern = r'<p className="text-\[10px\] font-black text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-tight uppercase tracking-tight w-full px-1">\{companyFullName\}</p>'
grid_view_replacement = r'''<p className="text-[10px] font-black text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-tight uppercase tracking-tight w-full px-1">{companyFullName}</p>
                                                {quotes[symbol] && (
                                                  <div className={`text-[9px] font-black px-2 py-0.5 mt-1 rounded-full inline-block ${quotes[symbol].changePercent >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                     {quotes[symbol].changePercent >= 0 ? '+' : ''}{quotes[symbol].changePercent.toFixed(2)}%
                                                  </div>
                                                )}'''
content = re.sub(grid_view_pattern, grid_view_replacement, content)

# 4. Add Header Toggles (before Full Screen button)
header_pattern = r'<button onClick=\{\(\) => setIsSidebarFullScreen\(!isSidebarFullScreen\)\} className="p-1\.5 hover:bg-surface rounded-lg transition-all text-text-muted hover:text-accent" title="Toggle Full Screen">'
header_replacement = r'''<div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
                             <button 
                                onClick={() => setShowHeatmap(!showHeatmap)}
                                className={`p-1.5 rounded-md transition-all ${showHeatmap ? 'bg-orange-500 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                title="Industrial Heatmap"
                             >
                                <Flame size={12} />
                             </button>
                             <button 
                                onClick={() => setShowFlows(!showFlows)}
                                className={`p-1.5 rounded-md transition-all ${showFlows ? 'bg-blue-500 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                title="Corporate Network Flows"
                             >
                                <Share2 size={12} />
                             </button>
                          </div>
                          <div className="w-px h-4 bg-border mx-1" />
                          <button onClick={() => setIsSidebarFullScreen(!isSidebarFullScreen)} className="p-1.5 hover:bg-surface rounded-lg transition-all text-text-muted hover:text-accent" title="Toggle Full Screen">'''

content = re.sub(header_pattern, header_replacement, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Final patch and cleanup successful.")
