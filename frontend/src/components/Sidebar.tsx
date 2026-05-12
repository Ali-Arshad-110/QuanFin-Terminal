import { LayoutDashboard, LineChart, Wallet, LogOut, Coins } from 'lucide-react';

interface SidebarProps {
    currentView: 'dashboard' | 'analyzer' | 'portfolio' | 'commodities';
    onNavigate: (view: 'dashboard' | 'analyzer' | 'portfolio' | 'commodities') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
    return (
        <div className="h-screen w-16 hover:w-64 bg-background border-r border-border-primary flex flex-col justify-between py-4 transition-all duration-300 ease-in-out z-50 fixed left-0 top-0 group shadow-2xl overflow-hidden">
            <div>
                <div className="flex items-center gap-3 mb-8 px-2 justify-start overflow-hidden whitespace-nowrap relative">
                    <div className="relative group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                        {/* Logo Icon with High Intensity Glow */}
                        <div className="absolute -inset-1 bg-emerald-500 rounded-full blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        <img
                            src="/logo.jpg"
                            alt="QuanFin"
                            className="relative h-10 w-10 min-w-[2.5rem] object-cover rounded-lg shadow-lg border border-emerald-500/30"
                        />
                    </div>

                    <div className="flex flex-col ml-2 overflow-hidden transition-all duration-300 ease-in-out w-0 opacity-0 group-hover:w-32 group-hover:opacity-100">
                        <span className="font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] whitespace-nowrap">
                            QuanFin
                        </span>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-text-muted font-bold -mt-1 ml-0.5 whitespace-nowrap">Terminal</span>
                    </div>
                </div>

                <nav className="flex flex-col gap-2">
                    <NavItem
                        icon={<LayoutDashboard size={20} />}
                        label="Dashboard"
                        active={currentView === 'dashboard'}
                        onClick={() => onNavigate('dashboard')}
                    />
                    <NavItem
                        icon={<LineChart size={20} />}
                        label="Analysis"
                        active={currentView === 'analyzer'}
                        onClick={() => onNavigate('analyzer')}
                    />
                    <NavItem
                        icon={<Wallet size={20} />}
                        label="Portfolio"
                        active={currentView === 'portfolio'}
                        onClick={() => onNavigate('portfolio')}
                    />
                    <NavItem
                        icon={<Coins size={20} />}
                        label="Commodities"
                        active={currentView === 'commodities'}
                        onClick={() => onNavigate('commodities')}
                    />
                </nav>
            </div>

            <div className="flex flex-col gap-2">
                <NavItem icon={<LogOut size={20} />} label="Logout" />
            </div>
        </div>
    );
};

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors whitespace-nowrap overflow-hidden ${active
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-text-muted hover:bg-surface hover:text-text-primary'
                }`}
        >
            <div className="min-w-[20px]">{icon}</div>
            <span
                className={`font-medium transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden
                ${true ? 'w-0 opacity-0 group-hover:w-24 group-hover:opacity-100' : ''}
                `}
            >
                {label}
            </span>
        </div>
    );
};

export default Sidebar;
