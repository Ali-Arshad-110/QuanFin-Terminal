import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export function useMarketPulse(symbols: string[], refreshInterval: number = 30000) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [loading, setLoading] = useState(false);

  const fetchQuotes = useCallback(async () => {
    if (!symbols.length) return;
    setLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || '';

    try {
      // Fetch in parallel for speed
      const batchResults = await Promise.all(
        symbols.slice(0, 20).map(symbol => 
          axios.get(`${API_URL}/api/v1/quote/${encodeURIComponent(symbol)}`)
            .then(res => ({ symbol, data: res.data }))
            .catch(() => null)
        )
      );

      const newQuotes: Record<string, MarketQuote> = { ...quotes };
      batchResults.forEach(item => {
        if (item && item.data) {
          newQuotes[item.symbol] = {
            symbol: item.symbol,
            name: item.data.name || item.symbol,
            price: item.data.price || 0,
            change: item.data.change || 0,
            changePercent: item.data.changePercent || 0,
          };
        }
      });

      setQuotes(newQuotes);
    } catch (err) {
      console.error('MarketPulse Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, [symbols, quotes]);

  useEffect(() => {
    fetchQuotes();
    const timer = setInterval(fetchQuotes, refreshInterval);
    return () => clearInterval(timer);
  }, [fetchQuotes, refreshInterval]);

  return { quotes, loading, refetch: fetchQuotes };
}
