import os

path = r'c:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\frontend\src\components\quanmap\QuanRadar.tsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. State Addition
if 'const [activeSectorFilter' not in text:
    text = text.replace(
        "const [isSidebarFullScreen, setIsSidebarFullScreen] = useState(false);",
        "const [isSidebarFullScreen, setIsSidebarFullScreen] = useState(false);\n  const [activeSectorFilter, setActiveSectorFilter] = useState<string | null>(null);"
    )

# Reset active sector filter when close/reset is triggered
text = text.replace(
    "setSelectedCity(null); setIsSidebarFullScreen(false);",
    "setSelectedCity(null); setIsSidebarFullScreen(false); setActiveSectorFilter(null);"
)

text = text.replace(
    "setSelectedPlant(null); setSelectedCity(null);",
    "setSelectedPlant(null); setSelectedCity(null); setActiveSectorFilter(null);"
)

# Wait! The above replace is global. Let's make sure it doesn't duplicate.
# Better way: Search and replace exact function body
text = text.replace(
    "= () => {\n    setSelectedPlant(null);\n    setSelectedCity(null);\n    setSearchQuery('');\n    setResetView(true);",
    "= () => {\n    setSelectedPlant(null);\n    setSelectedCity(null);\n    setActiveSectorFilter(null);\n    setSearchQuery('');\n    setResetView(true);"
)

# 2. Add tighter layout (max-w-5xl mx-auto) in CITY Tab
city_header = """                   <div className="p-8 border-b border-border bg-background">
                      <div className="flex justify-between items-start mb-6">"""
city_header_new = """                   <div className="p-8 border-b border-border bg-background">
                      <div className={isSidebarFullScreen ? "max-w-6xl mx-auto w-full" : ""}>
                      <div className="flex justify-between items-start mb-6">"""
text = text.replace(city_header, city_header_new)

# Close the new div at the end of city header
city_header_close = """                        </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">"""
city_header_close_new = """                        </div>
                      </div>
                     </div>

                     <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className={`space-y-10 ${isSidebarFullScreen ? "max-w-6xl mx-auto w-full" : ""}`}>"""
text = text.replace(city_header_close, city_header_close_new)

city_scroll_close = """                           </div>
                        </div>
                     </div>
                   </>"""
city_scroll_close_new = """                           </div>
                        </div>
                        </div>
                     </div>
                   </>"""
text = text.replace(city_scroll_close, city_scroll_close_new)


# 3. Add tighter layout in COMPANY Tab
company_header = """                   <div className="p-8 border-b border-border bg-background">
                      <div className="flex justify-between items-start mb-6">"""
company_header_new = """                   <div className="p-8 border-b border-border bg-background">
                      <div className={isSidebarFullScreen ? "max-w-6xl mx-auto w-full" : ""}>
                      <div className="flex justify-between items-start mb-6">"""
text = text.replace(company_header, company_header_new)

company_header_close = """                      </p>
                   </div>

                   <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar ${isSidebarFullScreen ? "grid grid-cols-2 gap-8 items-start" : "space-y-10"}`}>"""
company_header_close_new = """                      </p>
                      </div>
                   </div>

                   <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar`}>
                      <div className={`${isSidebarFullScreen ? "grid grid-cols-2 gap-8 items-start max-w-6xl mx-auto w-full" : "space-y-10"}`}>"""
text = text.replace(company_header_close, company_header_close_new)

company_scroll_close = """                        )}
                      </div>
                   </div>
                 </>"""
company_scroll_close_new = """                        )}
                      </div>
                      </div>
                   </div>
                 </>"""
text = text.replace(company_scroll_close, company_scroll_close_new)


# 4. Filter Click Implementation
sector_block = """                               <div key={sector} className="bg-background border border-border p-4 rounded-2xl shadow-sm hover:border-accent/20 transition-all">"""
sector_block_new = """                               <div 
                                  key={sector} 
                                  onClick={() => setActiveSectorFilter(activeSectorFilter === sector ? null : sector)}
                                  className={`bg-background border p-4 rounded-2xl shadow-sm transition-all cursor-pointer ${activeSectorFilter === sector ? 'border-accent ring-1 ring-accent/30' : 'border-border hover:border-accent/40'}`}
                               >"""
text = text.replace(sector_block, sector_block_new)

filter_map_block = """{cityIntelligence.companies.map((company) => ("""
filter_map_block_new = """{cityIntelligence.companies
                               .filter(company => activeSectorFilter ? company.sector === activeSectorFilter : true)
                               .map((company) => ("""
text = text.replace(filter_map_block, filter_map_block_new)


with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("UI tightened and filter applied.")
