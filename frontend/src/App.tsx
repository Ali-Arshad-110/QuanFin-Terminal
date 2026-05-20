import React, { useState } from 'react';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ThemeProvider } from './theme/ThemeProvider';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Analyzer from './components/Analyzer';
import Portfolio from './components/Portfolio';
import CommoditiesDashboard from './components/CommoditiesDashboard';
import MultiChartView from './components/MultiChartView';
import NetworkIndexMap from './components/NetworkIndexMap';
import BrokerLoginModal from './components/BrokerLoginModal';
import OptionsTerminal from './components/OptionsTerminal';
import StabilityAnalyzer from './components/StabilityAnalyzer';
import HeatMap from './components/HeatMap';
import QuanMap from './components/QuanMap';
import { useMarketStore } from './store';
import IndicesBar from './components/IndicesBar';
import WatchlistExpandedView from './components/analyzer/terminal/WatchlistExpandedView';
import ErrorBoundary from './components/ErrorBoundary';
import MarketSunburst from './components/MarketSunburst';
import AutonomousAnalyst from './components/analyzer/terminal/AutonomousAnalyst';
import CommandCenter from './components/CommandCenter';
import { useDevToolsDetector } from './hooks/useDevToolsDetector';
import { DevToolsWarningOverlay } from './components/DevToolsWarningOverlay';

export type ViewState = 'dashboard' | 'analyzer' | 'portfolio' | 'commodities' | 'multichart' | 'networkmap' | 'quanmap' | 'options' | 'stability' | 'sectors' | 'sunburst' | 'commandcenter';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const isDevToolsOpen = useDevToolsDetector({
    disableRightClick: true,
    disableSelection: true
  });
  const {
    isBrokerModalOpen,
    setBrokerModalOpen,
    setBrokerConnected,
    isWatchlistExpanded,
    setWatchlistExpanded,
    watchlists,
    activeWatchlist,
    ticker,
    setTicker
  } = useMarketStore();

  const currentWatchlist = watchlists[activeWatchlist] || [];

  return (
    <ThemeProvider>
      <WebSocketProvider>
        {isDevToolsOpen ? (
          <DevToolsWarningOverlay />
        ) : (
          <div className="flex flex-col h-screen h-[100dvh] bg-background text-text-primary font-sans transition-all duration-300 overflow-hidden">
            <div className="sticky top-0 z-[1100] bg-surface">
              <Header currentView={currentView} onNavigate={setCurrentView} />
              {currentView !== 'stability' && <IndicesBar onNavigate={setCurrentView} />}
            </div>

            <div className="flex-1 flex flex-col relative overflow-hidden">
              <ErrorBoundary>
                <main className="flex-1 relative overflow-hidden flex flex-col">
                  {currentView === 'dashboard' && <Dashboard onNavigate={setCurrentView} />}
                  {currentView === 'analyzer' && <Analyzer />}
                  {currentView === 'portfolio' && <Portfolio />}
                  {currentView === 'commodities' && <CommoditiesDashboard />}
                  {currentView === 'multichart' && <MultiChartView />}
                  {currentView === 'networkmap' && <NetworkIndexMap onNavigate={(v) => setCurrentView(v as any)} />}
                  {currentView === 'quanmap' && <QuanMap onNavigate={(v) => setCurrentView(v as any)} />}
                  {currentView === 'options' && <OptionsTerminal />}
                  {currentView === 'stability' && <StabilityAnalyzer onBack={() => setCurrentView('dashboard')} />}
                  {currentView === 'sectors' && <HeatMap onNavigate={setCurrentView} />}
                  {currentView === 'sunburst' && <MarketSunburst onNavigate={(v: any) => setCurrentView(v)} />}
                  {currentView === 'commandcenter' && <CommandCenter />}
                </main>
              </ErrorBoundary>
            </div>

            <BrokerLoginModal
              isOpen={isBrokerModalOpen}
              onClose={() => setBrokerModalOpen(false)}
              onLoginSuccess={() => setBrokerConnected(true)}
            />

            <AutonomousAnalyst />

            <ErrorBoundary>
              <WatchlistExpandedView
                isOpen={isWatchlistExpanded}
                onClose={() => setWatchlistExpanded(false)}
                watchlist={currentWatchlist}
                activeTicker={ticker}
                onSelectTicker={setTicker}
              />
            </ErrorBoundary>
          </div>
        )}
      </WebSocketProvider>
    </ThemeProvider>
  );
};

export default App;
