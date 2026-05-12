import React, { useEffect, useRef } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { useMarketStore } from '../store';

interface DashboardSettingsProps {
    onClose: () => void;
}

const DashboardSettings: React.FC<DashboardSettingsProps> = ({ onClose }) => {
    const { dashboardSettings, updateDashboardSettings } = useMarketStore();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const settings = [
        {
            id: 'showWatchlist',
            label: 'Watchlist Panel',
            icon: dashboardSettings.showWatchlist ? <Eye size={14} /> : <EyeOff size={14} />,
            active: dashboardSettings.showWatchlist
        },
        {
            id: 'showIndices',
            label: 'Indices & Scanners',
            icon: dashboardSettings.showIndices ? <Eye size={14} /> : <EyeOff size={14} />,
            active: dashboardSettings.showIndices
        }
    ];

    return (
        <div ref={menuRef} className="absolute top-12 right-0 w-64 bg-card border border-border-primary rounded-xl shadow-2xl z-[2000] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-border-primary flex items-center justify-between bg-surface/50">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Dashboard Settings</h3>
            </div>
            
            <div className="p-2 space-y-1">
                {settings.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => updateDashboardSettings({ [item.id as any]: !item.active })}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all hover:bg-surface text-text-muted hover:text-text-primary"
                    >
                        <div className="flex items-center gap-3">
                            <span className={item.active ? 'text-indigo-500' : 'text-text-muted'}>
                                {item.icon}
                            </span>
                            <span className="font-medium">{item.label}</span>
                        </div>
                        {item.active && (
                            <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                <Check size={10} className="text-indigo-500" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="p-2 bg-surface/30 border-t border-border-primary">
                <p className="text-[10px] text-text-muted text-center italic">
                    Preferences are saved automatically
                </p>
            </div>
        </div>
    );
};

export default DashboardSettings;
