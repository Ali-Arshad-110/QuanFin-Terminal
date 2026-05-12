
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { calculateVolatility, calculateATR, calculateTrendStability } from '../utils/StabilityEngine';

export interface UnifiedDataset {
    symbol: string;
    timestamps: number[];
    price: number[];
    open: number[];
    high: number[];
    low: number[];
    volume: number[];
    volatility: number[];
    atr: number[];
    rsi: number[];
    macd: number[];
    relativeStrength: number[];
    trendStability: number[];
    volumeFlow: number[];
    fundamentals: {
        name: string;
        sector: string;
        industry: string;
        beta: number;
        roe: number;
        deRatio: number;
        earningsGrowth: number;
        marketCap: number;
        peRatio: number;
        eps: number;
        dividendYield: number;
    };
}

export function useStabilityData(ticker: string, interval: string = '1d', isNiftyFallback: boolean = false, indexTicker: string = '^NSEI') {
    const [data, setData] = useState<UnifiedDataset | null>(null);
    const [loading, setLoading] = useState(false);  // never blocks UI after first load
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!ticker) return;
        const API_URL = import.meta.env.VITE_API_URL || '';
        // Show updating indicator but KEEP previous data visible (stale-while-revalidate)
        setLoading(true);
        setError(null);

        try {
            // Fetch everything in parallel for speed
            const enc = encodeURIComponent(ticker);
            const idxEnc = encodeURIComponent(indexTicker);
            // If we are fetching NIFTY as a secondary, we don't need a recursive niftyRes
            const [stockRes, niftyRes, quoteRes] = await Promise.all([
                axios.get(`${API_URL}/api/v1/analyze/${enc}?interval=${interval}`),
                isNiftyFallback ? Promise.resolve({data: {data: []}}) : axios.get(`${API_URL}/api/v1/analyze/${idxEnc}?interval=${interval}`),
                axios.get(`${API_URL}/api/v1/quote/${enc}`)
            ]);

            const stockData = stockRes.data.data;
            const niftyData = niftyRes.data.data;
            const info = quoteRes.data;

            const timestamps = stockData.map((d: any) => d.timestamp);
            const price = stockData.map((d: any) => d.close);
            const open = stockData.map((d: any) => d.open);
            const high = stockData.map((d: any) => d.high);
            const low = stockData.map((d: any) => d.low);
            const volume = stockData.map((d: any) => d.volume);

            const volSeries: number[] = [];
            const atrSeries: number[] = [];
            const rsSeries: number[] = [];
            const tsSeries: number[] = [];
            const vfSeries: number[] = [];

            const niftyMap = !isNiftyFallback ? new Map(niftyData.map((d: any) => [d.timestamp, d.close])) : null;

            for (let i = 0; i < stockData.length; i++) {
                const slice = stockData.slice(Math.max(0, i - 19), i + 1);
                const priceSlice = slice.map((d: any) => d.close);
                const volSlice = slice.map((d: any) => d.volume);

                volSeries.push(calculateVolatility(slice));
                atrSeries.push(calculateATR(slice));
                tsSeries.push(calculateTrendStability(priceSlice));

                const avgVol = volSlice.reduce((a: number, b: number) => a + b, 0) / volSlice.length;
                vfSeries.push(avgVol > 0 ? (stockData[i].volume / avgVol) : 1);

                if (!isNiftyFallback) {
                    const ts = stockData[i].timestamp;
                    const niftyClose = niftyMap?.get(ts) || (niftyData.length > 0 ? niftyData[niftyData.length - 1].close : 100);
                    rsSeries.push((stockData[i].close / (niftyClose || 1)) * 100);
                }
            }

            setData({
                symbol: ticker,
                timestamps,
                price,
                open,
                high,
                low,
                volume,
                volatility: volSeries,
                atr: atrSeries,
                trendStability: tsSeries,
                volumeFlow: vfSeries,
                rsi: stockData.map((d: any) => d.rsi || 0),
                macd: stockData.map((d: any) => d.MACD_12_26_9 || 0),
                relativeStrength: rsSeries,
                fundamentals: {
                    name: info.name || ticker,
                    sector: info.sector || 'N/A',
                    industry: info.industry || 'N/A',
                    beta: info.beta || 0,
                    roe: info.roe || 15,
                    deRatio: info.priceToBook || 0,
                    earningsGrowth: info.forwardPE ? 15 : 0,
                    marketCap: info.marketCap || 0,
                    peRatio: info.peRatio || 0,
                    eps: info.eps || 0,
                    dividendYield: info.dividendYield || 0
                }
            });
        } catch (err: any) {
            setError(err.message || 'Failed to fetch stability data');
        } finally {
            setLoading(false);
        }
    }, [ticker, interval, isNiftyFallback, indexTicker]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
