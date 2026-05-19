import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import type { Time } from 'lightweight-charts';
import { API_BASE } from '../config/api';

export interface ComparisonSymbol {
    symbol: string;
    color: string;
    visible: boolean;
    data: { time: Time; value: number; open?: number; high?: number; low?: number; close?: number }[];
    lastPrice: number;
    changePercent: number;
    scale: 'right' | 'left';
    pane: 'main' | 'new';
}

export type ComparisonMode = 'PRICE' | 'NORMALIZED';

export function useComparativeEngine() {
    const [symbols, setSymbols] = useState<ComparisonSymbol[]>([]);
    const [mode, setMode] = useState<ComparisonMode>('NORMALIZED');
    const [loading, setLoading] = useState<string | null>(null);
    const dataCache = useRef<Map<string, any>>(new Map());

    const addSymbol = useCallback(async (symbol: string, color: string = '#2962FF') => {
        // We can't easily check 'symbols' here without adding it to dependencies, 
        // but we can use the state updater form if needed.
        // For simplicity and to avoid dependency loops, we'll let the component handle the check if possible
        // or just accept the call.

        setLoading(symbol);
        try {
            let stockData = dataCache.current.get(symbol);
            if (!stockData) {
                const res = await axios.get(`${API_BASE}/api/v1/analyze/${symbol}?interval=1d`);
                stockData = res.data.data;
                dataCache.current.set(symbol, stockData);
            }

            const points = stockData.map((d: any) => ({
                time: (typeof d.date === 'string' ? Math.floor(new Date(d.date).getTime() / 1000) : d.timestamp) as Time,
                value: d.close,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close
            }));

            const last = points[points.length - 1];
            const prev = points[points.length - 2]?.value || last.value;
            const change = ((last.value - prev) / prev) * 100;

            setSymbols(prevSymbols => {
                if (prevSymbols.find(s => s.symbol === symbol)) return prevSymbols;
                if (prevSymbols.length >= 5) return prevSymbols;
                return [
                    ...prevSymbols,
                    {
                        symbol,
                        color,
                        visible: true,
                        data: points,
                        lastPrice: last.value,
                        changePercent: change,
                        scale: 'right',
                        pane: 'main'
                    }
                ];
            });
        } catch (err) {
            console.error(`Failed to add comparison symbol ${symbol}:`, err);
        } finally {
            setLoading(null);
        }
    }, []);

    const removeSymbol = useCallback((symbol: string) => {
        setSymbols(prev => prev.filter(s => s.symbol !== symbol));
    }, []);

    const toggleVisibility = useCallback((symbol: string) => {
        setSymbols(prev => prev.map(s =>
            s.symbol === symbol ? { ...s, visible: !s.visible } : s
        ));
    }, []);

    const toggleScale = useCallback((symbol: string) => {
        setSymbols(prev => prev.map(s =>
            s.symbol === symbol ? { ...s, scale: s.scale === 'right' ? 'left' : 'right' } : s
        ));
    }, []);

    const togglePane = useCallback((symbol: string) => {
        setSymbols(prev => prev.map(s =>
            s.symbol === symbol ? { ...s, pane: s.pane === 'main' ? 'new' : 'main' } : s
        ));
    }, []);

    const setComparisonMode = useCallback((newMode: ComparisonMode) => {
        setMode(newMode);
    }, []);

    return {
        symbols,
        mode,
        loading,
        addSymbol,
        removeSymbol,
        toggleVisibility,
        toggleScale,
        togglePane,
        setComparisonMode
    };
}
