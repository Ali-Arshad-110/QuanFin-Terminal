import React, { useState } from 'react';
import { useMarketStore } from '../store';
import {
    LayoutDashboard,
    Activity,
    Briefcase,
    Waves,
    Grid3X3,
    Share2,
    Zap,
    LogIn,
    Bell,
    Settings,
    User,
    Shield,
    LayoutGrid,
    PieChart,
    Globe2
} from 'lucide-react';
import TickerSearch from './TickerSearch';
import ThemeToggle from './ThemeToggle';
import DashboardSettings from './DashboardSettings';
import type { ViewState } from '../App';

import { useWorkspaceStore } from '../store/workspaceStore';

interface HeaderProps {
    currentView: ViewState;
    onNavigate: (view: ViewState) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
    const [showSettings, setShowSettings] = useState(false);
    const { ticker, setTicker, isBrokerConnected, setBrokerModalOpen } = useMarketStore();
    const { setGlobalTicker } = useWorkspaceStore();

    const handleTickerSelect = (symbol: string) => {
        setTicker(symbol); // Always update market store
        if (currentView === 'multichart') {
            setGlobalTicker(symbol); // Update workstation store if in multi-chart view
        }
    };

    const navItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
        { id: 'analyzer', label: 'Analyzer', icon: <Activity size={14} /> },
        { id: 'portfolio', label: 'Portfolio', icon: <Briefcase size={14} /> },
        { id: 'commodities', label: 'Commodities', icon: <Waves size={14} /> },
        { id: 'multichart', label: 'Multi-Chart', icon: <Grid3X3 size={14} /> },
        { id: 'networkmap', label: 'Flow Map', icon: <Share2 size={14} /> },
        { id: 'quanmap', label: 'QuanMap', icon: <Globe2 size={14} /> },
        { id: 'options', label: 'Options', icon: <Zap size={14} /> },
        { id: 'stability', label: 'Stability', icon: <Shield size={14} /> },
        { id: 'sunburst', label: 'Sunburst', icon: <PieChart size={14} /> },
        { id: 'sectors', label: 'Sectors', icon: <LayoutGrid size={14} /> },
    ];

    return (
        <header className="h-14 bg-surface/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-[1000] relative shadow-lg">
            <div className="flex items-center gap-41">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('dashboard')}>
                    <div className="flex flex-col items-start">
                        <img
                            src="/logo.jpeg"
                            alt="QuanFin"
                            className="w-32 h-9 rounded-lg object-cover shadow-lg border border-indigo-500/30"
                        />
                        <span className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-widest mt-1.5 ml-1">
                            Data Turn into Capital
                        </span>
                    </div>
                </div>

                <nav className="flex items-center gap-0.5 bg-black/20 p-1 rounded-xl border border-white/5 ml-2">
                    {navItems.map((item) => {
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                title={item.label}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${isActive
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-white/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span className={isActive ? 'scale-110' : 'scale-100'}>
                                    {React.cloneElement(item.icon as React.DetailedReactHTMLElement<any, any>, { size: 16 })}
                                </span>
                                {isActive && (
                                    <span className="text-[11px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-2">
                                        {item.label}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="flex items-center gap-3">
                <div className="w-56">
                    <TickerSearch onSelect={handleTickerSelect} initialValue={ticker} />
                </div>

                <div className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                    <button
                        onClick={() => setBrokerModalOpen(true)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isBrokerConnected
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg active:scale-95'
                            }`}
                    >
                        <LogIn size={11} />
                        {isBrokerConnected ? 'Broker Live' : 'Connect'}
                    </button>

                    <div className="flex items-center gap-1">
                        <button className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors">
                            <Bell size={16} />
                        </button>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-1.5 rounded-lg transition-colors relative ${showSettings ? 'text-indigo-500 bg-white/5 shadow-sm' : 'text-text-muted hover:text-text-primary hover:bg-white/5'}`}
                        >
                            <Settings size={16} />
                            {showSettings && <DashboardSettings onClose={() => setShowSettings(false)} />}
                        </button>
                        <div className="w-px h-5 bg-white/10 mx-1" />
                        <ThemeToggle />
                        <button className="ml-1.5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-muted hover:text-indigo-400 transition-all active:scale-90 overflow-hidden">
                            <User size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
