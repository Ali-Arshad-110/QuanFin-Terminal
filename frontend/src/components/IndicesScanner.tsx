import React, { useState, useEffect } from 'react';
import { X, Search, ChevronRight, LayoutGrid, List, ArrowUp, ArrowDown, ChevronsUpDown, Globe } from 'lucide-react';
import AdvanceHeatMap from './AdvanceHeatMap';
import { useMarketStore } from '../store';
import { useTheme } from '../theme/ThemeProvider';
import { API_BASE } from '../config/api';

interface Props {
    onClose: () => void;
}

const NSE_INDICES = [
    { name: "NIFTY 50", id: "^NSEI" },
    { name: "BANK NIFTY", id: "^NSEBANK" },
    { name: "NIFTY IT", id: "^CNXIT" },
    { name: "NIFTY AUTO", id: "^CNXAUTO" },
    { name: "NIFTY FMCG", id: "^CNXFMCG" },
    { name: "NIFTY PHARMA", id: "^CNXPHARMA" },
    { name: "NIFTY METAL", id: "^CNXMETAL" },
    { name: "NIFTY REALTY", id: "^CNXREALTY" },
    { name: "NIFTY ENERGY", id: "^CNXENERGY" },
    { name: "NIFTY PSE", id: "^CNXPSE" },
    { name: "NIFTY INFRA", id: "^CNXINFRA" },
    { name: "NIFTY SERVICES", id: "^CNXSERVICE" },
];

const BSE_INDICES = [
    { name: "BSE SENSEX", id: "^BSESN" },
    { name: "BSE 100", id: "^BSE100" },
    { name: "BSE 200", id: "^BSE200" },
    { name: "BSE 500", id: "^BSE500" },
    { name: "BSE LargeCap", id: "BSE-LARGECAP" },
    { name: "BSE MidCap", id: "BSE-MIDCAP" },
    { name: "BSE SmallCap", id: "BSE-SMALLCAP" },
    { name: "BSE Bankex", id: "BSE-BANK" },
    { name: "BSE Financial Services", id: "BSE-FIN" },
    { name: "BSE IT", id: "BSE-IT" },
    { name: "BSE Healthcare", id: "BSE-HLTH" },
    { name: "BSE FMCG", id: "BSE-FMCG" },
    { name: "BSE Auto", id: "BSE-AUTO" },
    { name: "BSE Metal", id: "BSE-METAL" },
    { name: "BSE Realty", id: "BSE-REALTY" },
    { name: "BSE Oil & Gas", id: "BSE-OILGAS" },
    { name: "BSE Power", id: "BSE-POWER" },
    { name: "BSE Capital Goods", id: "BSE-CG" },
];

const IndicesScanner: React.FC<Props> = ({ onClose }) => {
    const [marketType, setMarketType] = useState<'NSE' | 'BSE'>('NSE');
    const [selectedIndex, setSelectedIndex] = useState(NSE_INDICES[0]);
    const [constituents, setConstituents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'changePercent', direction: 'desc' });
    const { setTicker } = useMarketStore();
    useTheme();

    // Reset selection when market type changes
    useEffect(() => {
        if (marketType === 'NSE') {
            setSelectedIndex(NSE_INDICES[0]);
        } else {
            setSelectedIndex(BSE_INDICES[0]);
        }
    }, [marketType]);

    useEffect(() => {
        fetchConstituents(selectedIndex.id);
    }, [selectedIndex]);

    const fetchConstituents = async (symbol: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/network-map/constituents/${encodeURIComponent(symbol)}`);
            if (res.ok) {
                const data = await res.json();
                setConstituents(data.constituents || []);
            }
        } catch (err) {
            console.error("Failed to fetch index constituents", err);
        } finally {
            setLoading(false);
        }
    };

    // Sorting Logic
    const sortedConstituents = React.useMemo(() => {
        if (!sortConfig) return constituents;

        return [...constituents].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [constituents, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ChevronsUpDown size={12} className="opacity-30" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-emerald-500" /> : <ArrowDown size={12} className="text-emerald-500" />;
    };

    const currentList = marketType === 'NSE' ? NSE_INDICES : BSE_INDICES;
    const filteredIndices = currentList.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-background w-full max-w-6xl h-[80vh] rounded-2xl border border-border-primary shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Left Sidebar: Navigation */}
                <div className="w-64 bg-surface border-r border-border-primary flex flex-col">
                    <div className="p-4 border-b border-border-primary">
                        <h2 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
                            <Globe size={18} className="text-indigo-500" />
                            Indices Scanner
                        </h2>

                        {/* Market Toggle */}
                        <div className="flex bg-background p-1 rounded-lg mb-3 border border-border-primary">
                            <button
                                onClick={() => setMarketType('NSE')}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${marketType === 'NSE'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-text-muted hover:text-text-primary'
                                    }`}
                            >
                                NSE
                            </button>
                            <button
                                onClick={() => setMarketType('BSE')}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${marketType === 'BSE'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-text-muted hover:text-text-primary'
                                    }`}
                            >
                                BSE
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                            <input
                                type="text"
                                placeholder={`Search ${marketType}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-background border border-border-primary rounded-lg pl-8 pr-3 py-2 text-xs text-text-primary focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {filteredIndices.map(idx => (
                            <button
                                key={idx.id}
                                onClick={() => setSelectedIndex(idx)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${selectedIndex.id === idx.id
                                    ? 'bg-indigo-600/10 text-indigo-500 font-semibold shadow-sm border border-indigo-500/20'
                                    : 'text-text-muted hover:bg-background hover:text-text-primary'
                                    }`}
                            >
                                <span className="truncate">{idx.name}</span>
                                {selectedIndex.id === idx.id && <ChevronRight size={14} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Content: Details & Heatmap */}
                <div className="flex-1 flex flex-col bg-background">
                    {/* Header */}
                    <div className="h-16 border-b border-border-primary flex items-center justify-between px-6 bg-surface/50 backdrop-blur">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-surface text-[10px] font-bold text-text-muted border border-border-primary">{marketType}</span>
                                <h3 className="text-lg font-bold text-text-primary mb-0.5">{selectedIndex.name} Components</h3>
                            </div>
                            <span className="text-text-muted text-[10px] sm:text-xs font-mono">
                                {constituents.length} Stocks • Market Cap Weighted
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Sorting shortcuts */}
                            {viewMode === 'list' && (
                                <div className="hidden md:flex items-center gap-2 mr-4 bg-surface p-1 rounded-lg border border-border-primary">
                                    <button
                                        onClick={() => setSortConfig({ key: 'changePercent', direction: 'desc' })}
                                        className={`px-2 py-1 text-[10px] font-semibold rounded transition-all ${sortConfig?.key === 'changePercent' && sortConfig.direction === 'desc' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-text-muted hover:text-text-primary'}`}
                                    >
                                        Top Gainers
                                    </button>
                                    <button
                                        onClick={() => setSortConfig({ key: 'changePercent', direction: 'asc' })}
                                        className={`px-2 py-1 text-[10px] font-semibold rounded transition-all ${sortConfig?.key === 'changePercent' && sortConfig.direction === 'asc' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'text-text-muted hover:text-text-primary'}`}
                                    >
                                        Top Losers
                                    </button>
                                </div>
                            )}

                            {/* Toggle View */}
                            <div className="flex bg-surface rounded-lg p-1 border border-border-primary">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                    title="List View"
                                >
                                    <List size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                                    title="Grid View"
                                >
                                    <LayoutGrid size={16} />
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full bg-surface hover:bg-card flex items-center justify-center text-text-muted hover:text-text-primary border border-border-primary transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-4 overflow-hidden relative bg-card/10">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-text-muted">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-2"></div>
                                Fetching Data...
                            </div>
                        ) : viewMode === 'grid' ? (
                            <AdvanceHeatMap 
                                constituents={constituents} 
                                onStockClick={(symbol) => {
                                    setTicker(symbol);
                                    document.getElementById('dashboard-chart-view')?.scrollIntoView({ behavior: 'smooth' });
                                    onClose();
                                }} 
                            />
                        ) : (
                            // List View Table
                            <div className="h-full overflow-y-auto custom-scrollbar border border-border-primary rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-surface sticky top-0 z-10 text-[10px] md:text-xs text-text-muted font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th onClick={() => requestSort('name')} className="px-4 py-3 cursor-pointer hover:bg-background/50 transition-colors border-b border-border-primary">
                                                <div className="flex items-center gap-1">Symbol {getSortIcon('name')}</div>
                                            </th>
                                            <th onClick={() => requestSort('ltp')} className="px-4 py-3 text-right cursor-pointer hover:bg-background/50 transition-colors border-b border-border-primary">
                                                <div className="flex items-center justify-end gap-1">LTP {getSortIcon('ltp')}</div>
                                            </th>
                                            <th onClick={() => requestSort('change')} className="px-4 py-3 text-right cursor-pointer hover:bg-background/50 transition-colors border-b border-border-primary">
                                                <div className="flex items-center justify-end gap-1">Change {getSortIcon('change')}</div>
                                            </th>
                                            <th onClick={() => requestSort('changePercent')} className="px-4 py-3 text-right cursor-pointer hover:bg-background/50 transition-colors border-b border-border-primary">
                                                <div className="flex items-center justify-end gap-1">Change % {getSortIcon('changePercent')}</div>
                                            </th>
                                            <th className="px-4 py-3 text-right border-b border-border-primary">Open</th>
                                            <th className="px-4 py-3 text-right border-b border-border-primary">High</th>
                                            <th className="px-4 py-3 text-right border-b border-border-primary">Low</th>
                                            <th className="px-4 py-3 text-right border-b border-border-primary whitespace-nowrap">Prev Close</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-primary bg-background/30">
                                        {sortedConstituents.map((stock) => (
                                            <tr
                                                key={stock.symbol}
                                                onClick={() => {
                                                    setTicker(stock.symbol);
                                                    document.getElementById('dashboard-chart-view')?.scrollIntoView({ behavior: 'smooth' });
                                                    onClose();
                                                }}
                                                className="hover:bg-surface/50 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-4 py-3 font-medium text-text-primary group-hover:text-indigo-500 text-xs md:text-sm">
                                                    {stock.name}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-mono text-xs md:text-sm ${stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    ₹{stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-mono text-xs md:text-sm ${stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-mono text-xs md:text-sm ${stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs md:text-sm text-text-muted">
                                                    {stock.open.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs md:text-sm text-text-muted">
                                                    {stock.high.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs md:text-sm text-text-muted">
                                                    {stock.low.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs md:text-sm text-text-muted">
                                                    {stock.close.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IndicesScanner;
