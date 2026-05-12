import { create } from 'zustand';

export type ComponentType = 'chart' | 'volume' | 'sector-compare' | 'correlation';
export type LayoutType = '1' | '2' | '4' | '6';

export interface SyncSettings {
    timeframe: boolean;
    crosshair: boolean;
    zoom: boolean;
    indicators: boolean;
}

export interface PanelConfig {
    id: string;
    type: ComponentType;
    ticker: string;
    timeframe: string;
    compareSector: boolean;
    // For react-grid-layout
    x: number;
    y: number;
    w: number;
    h: number;
}

interface WorkspaceState {
    isLinkedMode: boolean;
    globalTicker: string;
    globalTimeframe: string;
    layoutType: LayoutType;
    syncSettings: SyncSettings;
    activePanelId: string | null;
    panels: PanelConfig[];

    // Actions
    toggleLinkedMode: () => void;
    setGlobalTicker: (ticker: string) => void;
    setGlobalTimeframe: (tf: string) => void;
    setActivePanelId: (id: string | null) => void;
    setLayoutType: (layout: LayoutType) => void;
    updateSyncSettings: (updates: Partial<SyncSettings>) => void;
    addPanel: (type: ComponentType, defaultTicker?: string) => void;
    removePanel: (id: string) => void;
    updatePanelLayout: (layouts: any[]) => void;
    updatePanelConfig: (id: string, updates: Partial<PanelConfig>) => void;
    duplicatePanel: (id: string) => void;
    clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    isLinkedMode: true,
    globalTicker: 'RELIANCE.NS',
    globalTimeframe: '5m',
    layoutType: '4',
    activePanelId: null,
    syncSettings: {
        timeframe: true,
        crosshair: true,
        zoom: true,
        indicators: false
    },
    panels: [
        { id: 'panel-init-1', type: 'chart', ticker: 'RELIANCE.NS', timeframe: '5m', compareSector: false, x: 0, y: 0, w: 6, h: 4 },
        { id: 'panel-init-2', type: 'chart', ticker: 'TCS.NS', timeframe: '5m', compareSector: false, x: 6, y: 0, w: 6, h: 4 },
        { id: 'panel-init-3', type: 'chart', ticker: 'INFY.NS', timeframe: '5m', compareSector: false, x: 0, y: 4, w: 6, h: 4 },
        { id: 'panel-init-4', type: 'chart', ticker: 'HDFCBANK.NS', timeframe: '5m', compareSector: false, x: 6, y: 4, w: 6, h: 4 }
    ],

    toggleLinkedMode: () => set((state) => {
        const nextLinked = !state.isLinkedMode;
        if (nextLinked) {
            // Sync all panels to global states immediately
            return {
                isLinkedMode: nextLinked,
                activePanelId: null,
                panels: state.panels.map(p => ({
                    ...p,
                    ticker: state.globalTicker,
                    timeframe: state.globalTimeframe
                }))
            };
        }
        return {
            isLinkedMode: nextLinked,
            activePanelId: state.panels[0]?.id || null
        };
    }),

    setGlobalTicker: (ticker) => set((state) => {
        if (state.isLinkedMode) {
            return {
                globalTicker: ticker,
                panels: state.panels.map(p => ({ ...p, ticker }))
            };
        } else {
            // Target specific panel. Fallback to first panel if none active
            const targetId = state.activePanelId || state.panels[0]?.id;
            if (targetId) {
                return {
                    activePanelId: targetId, // Sync the state too
                    panels: state.panels.map(p => p.id === targetId ? { ...p, ticker } : p)
                };
            }
        }
        return { globalTicker: ticker };
    }),

    setGlobalTimeframe: (tf) => set((state) => {
        if (state.isLinkedMode) {
            return {
                globalTimeframe: tf,
                panels: state.panels.map(p => ({ ...p, timeframe: tf }))
            };
        } else {
            // Target specific panel. Fallback to first panel if none active
            const targetId = state.activePanelId || state.panels[0]?.id;
            if (targetId) {
                return {
                    activePanelId: targetId,
                    panels: state.panels.map(p => p.id === targetId ? { ...p, timeframe: tf } : p)
                };
            }
        }
        return { globalTimeframe: tf };
    }),

    setActivePanelId: (id) => set({ activePanelId: id }),

    setLayoutType: (layout) => set({ layoutType: layout }),

    updateSyncSettings: (updates) => set((state) => ({
        syncSettings: { ...state.syncSettings, ...updates }
    })),

    addPanel: (type, defaultTicker) => set((state) => {
        const id = `panel-${Date.now()}`;
        const newPanel: PanelConfig = {
            id,
            type,
            ticker: state.isLinkedMode ? state.globalTicker : (defaultTicker || 'RELIANCE.NS'),
            timeframe: state.isLinkedMode ? state.globalTimeframe : '1d',
            compareSector: false,
            // Calculate next available Y (bottom of the grid) or default grid spots
            x: (state.panels.length * 6) % 12, // 12 col grid
            y: Infinity, // puts it at the bottom
            w: 6,
            h: 4
        };
        return { panels: [...state.panels, newPanel] };
    }),

    removePanel: (id) => set((state) => ({
        panels: state.panels.filter(p => p.id !== id)
    })),

    updatePanelLayout: (layouts) => set((state) => {
        let hasChanges = false;
        const newPanels = state.panels.map(p => {
            const layoutItem = layouts.find((l: any) => l.i === p.id);
            if (layoutItem && (p.x !== layoutItem.x || p.y !== layoutItem.y || p.w !== layoutItem.w || p.h !== layoutItem.h)) {
                hasChanges = true;
                return {
                    ...p,
                    x: layoutItem.x,
                    y: layoutItem.y,
                    w: layoutItem.w,
                    h: layoutItem.h
                };
            }
            return p;
        });

        if (!hasChanges) return state; // Prevent infinite re-render
        return { panels: newPanels };
    }),

    updatePanelConfig: (id, updates) => set((state) => ({
        panels: state.panels.map(p => p.id === id ? { ...p, ...updates } : p)
    })),

    duplicatePanel: (id) => set((state) => {
        const existing = state.panels.find(p => p.id === id);
        if (!existing) return state;
        const newPanel = {
            ...existing,
            id: `panel-${Date.now()}`,
            x: (existing.x! + 2) % 12,
            y: existing.y! + 2
        };
        return { panels: [...state.panels, newPanel] };
    }),

    clearWorkspace: () => set({ panels: [] })
}));
