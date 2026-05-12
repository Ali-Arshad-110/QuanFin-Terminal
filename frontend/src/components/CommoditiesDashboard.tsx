import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface CommodityData {
  symbol: string;
  name: string;
  category: string;
  exchange: string;
  activeContract: string;
  expiry: string;
  ltp: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  volume: number;
  openInterest: number;
  lotSize: number;
  tickSize: number;
  margin: number;
  deliveryType: string;
  tradingStart: string;
  tradingEnd: string;
  status: string;
  volatility: number;
  circuitLimitUp: number;
  circuitLimitDown: number;
  globalReference?: string;
  demandSupply: string;
  usdImpact: string;
  recentNews: string[];
  educationalInsight: string;
}

const CommoditiesDashboard: React.FC<{ ticker?: string }> = ({ ticker = 'CRUDE' }) => {
  const [commodity, setCommodity] = useState<CommodityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCommodity, setSelectedCommodity] = useState(ticker);
  const [topMovers, setTopMovers] = useState<any[]>([]);
  const [errorDetails, setErrorDetails] = useState<string>("");

  const commodities = ['CRUDE', 'GOLD', 'SILVER', 'COPPER', 'NATURALGAS', 'ZINC', 'LEAD', 'COTTON', 'MENTHAOIL'];

  useEffect(() => {
    const fetchCommodityData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/v1/commodity/${selectedCommodity}`, {
          timeout: 10000,
        });
        setCommodity(response.data);
        setErrorDetails("");
      } catch (error: any) {
        console.error('Error fetching commodity data:', error);
        setErrorDetails(error.response?.data?.detail || error.message || "Unknown Error");
        setCommodity(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCommodityData();
  }, [selectedCommodity]);

  useEffect(() => {
    const fetchTopMovers = async () => {
      try {
        const response = await axios.get('/api/v1/commodity/movers/top', { timeout: 10000 });
        setTopMovers(response.data);
      } catch (error) {
        console.error('Error fetching top movers:', error);
      }
    };
    fetchTopMovers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-900/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading commodity data...</p>
        </div>
      </div>
    );
  }



  if (!commodity) {
    return (
      <div className="bg-slate-900/50 p-6 rounded text-center">
        <p className="text-red-400 font-bold mb-2">Unable to load commodity data.</p>
        <p className="text-slate-400 text-sm">{errorDetails || "Please try again."}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 rounded text-white text-sm hover:bg-blue-500"
        >
          Retry
        </button>
      </div>
    );
  }

  const getChangeColor = (change: number) => change >= 0 ? 'text-green-400' : 'text-red-400';


  return (
    <div className="bg-slate-950 text-slate-100 p-6 rounded-lg space-y-8 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* HEADER WITH SELECTOR */}
      <div className="flex items-center justify-between border-b border-slate-700 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Indian Commodities Market</h1>
          <p className="text-sm text-slate-400 mt-1">MCX • NCDEX • Real-time Market Snapshot</p>
        </div>
        <select
          value={selectedCommodity}
          onChange={(e) => setSelectedCommodity(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white hover:bg-slate-700 focus:outline-none focus:border-blue-500"
        >
          {commodities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* SECTION 1: COMMODITY OVERVIEW */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white border-l-4 border-blue-500 pl-3">📋 Commodity Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Commodity</p>
            <p className="text-lg font-bold text-white mt-1">{commodity.name}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Category</p>
            <p className="text-lg font-bold text-white mt-1">{commodity.category}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Exchange</p>
            <p className="text-lg font-bold text-white mt-1">{commodity.exchange}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Active Contract</p>
            <p className="text-lg font-bold text-white mt-1">{commodity.activeContract}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Contract Expiry</p>
            <p className="text-lg font-bold text-yellow-400 mt-1">{commodity.expiry}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Status</p>
            <p className={`text-lg font-bold mt-1 ${commodity.status === 'Trading' ? 'text-green-400' : 'text-red-400'}`}>
              {commodity.status}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: LIVE MARKET SNAPSHOT */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white border-l-4 border-green-500 pl-3">📊 Live Market Snapshot</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Last Traded Price (LTP)</p>
            <p className="text-3xl font-bold text-white mt-2">₹{commodity.ltp.toFixed(2)}</p>
            <p className={`text-sm mt-1 font-semibold ${getChangeColor(commodity.change)}`}>
              {commodity.change >= 0 ? '+' : ''}{commodity.change.toFixed(2)} ({commodity.changePercent >= 0 ? '+' : ''}{commodity.changePercent.toFixed(2)}%)
            </p>
          </div>
          <div className="bg-slate-800/50 p-5 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Day High / Low</p>
            <div className="space-y-2 mt-2">
              <p className="text-lg font-bold text-green-400">H: ₹{commodity.dayHigh.toFixed(2)}</p>
              <p className="text-lg font-bold text-red-400">L: ₹{commodity.dayLow.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-5 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Open Price</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">₹{commodity.open.toFixed(2)}</p>
          </div>
          <div className="bg-slate-800/50 p-5 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Volume (Contracts)</p>
            <p className="text-2xl font-bold text-white mt-2">{(commodity.volume / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-400 mt-1">Total contracts traded</p>
          </div>
          <div className="bg-slate-800/50 p-5 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Open Interest</p>
            <p className="text-2xl font-bold text-purple-400 mt-2">{(commodity.openInterest / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-400 mt-1">Outstanding contracts</p>
          </div>
        </div>
      </section>

      {/* SECTION 3: CONTRACT SPECIFICATIONS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white border-l-4 border-purple-500 pl-3">⚙️ Contract Specifications</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-700 hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 font-semibold w-1/3">Lot Size</td>
                <td className="px-4 py-3 text-white font-bold">{commodity.lotSize} Units</td>
              </tr>
              <tr className="border-b border-slate-700 hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 font-semibold">Tick Size</td>
                <td className="px-4 py-3 text-white font-bold">₹{commodity.tickSize.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-slate-700 hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 font-semibold">Initial Margin (SPAN)</td>
                <td className="px-4 py-3 text-white font-bold">₹{commodity.margin.toLocaleString()}</td>
              </tr>
              <tr className="border-b border-slate-700 hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 font-semibold">Delivery Type</td>
                <td className="px-4 py-3 text-white font-bold">{commodity.deliveryType}</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 font-semibold">Multiplier</td>
                <td className="px-4 py-3 text-white font-bold">1 Lot = ₹{(commodity.ltp * commodity.lotSize).toFixed(0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 4: MARKET STATUS & TRADING TIMINGS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white border-l-4 border-orange-500 pl-3">⏰ Market Status & Trading Timings (IST)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Today's Trading Status</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <p className="text-white font-semibold">{commodity.status}</p>
              </div>
              <p className="text-sm text-slate-300">Market actively trading</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Session Timings</p>
            <div className="space-y-2">
              <p className="text-white font-semibold">🔔 Open: {commodity.tradingStart}</p>
              <p className="text-white font-semibold">🔕 Close: {commodity.tradingEnd}</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700 md:col-span-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">MCX Trading Hours (All commodities)</p>
            <p className="text-sm text-slate-300">
              <span className="font-bold text-white">Monday - Friday:</span> 10:00 AM - 11:30 PM IST<br />
              <span className="font-bold text-white">Weekend:</span> Closed (Saturday & Sunday)<br />
              <span className="font-bold text-white">Daily break:</span> 1:55 PM - 3:00 PM
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 5: FUNDAMENTAL & MACRO FACTORS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white border-l-4 border-cyan-500 pl-3">🌍 Fundamental & Macro Factors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-sm font-bold text-slate-300 mb-2">📦 Demand-Supply Dynamics</p>
            <p className="text-sm text-slate-300 leading-relaxed">{commodity.demandSupply}</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-sm font-bold text-slate-300 mb-2">💱 USD-INR Impact</p>
            <p className="text-sm text-slate-300 leading-relaxed">{commodity.usdImpact}</p>
          </div>
          {commodity.globalReference && (
            <div className="bg-slate-800/50 p-4 rounded border border-slate-700 md:col-span-2">
              <p className="text-sm font-bold text-slate-300 mb-2">🌐 Global Reference Price</p>
              <p className="text-sm text-slate-300 leading-relaxed">{commodity.globalReference}</p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 6: NEWS & EVENTS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white border-l-4 border-red-500 pl-3">📰 Recent News & Events</h2>
        <div className="space-y-3">
          {commodity.recentNews && commodity.recentNews.length > 0 ? (
            commodity.recentNews.map((news, idx) => (
              <div key={idx} className="bg-slate-800/50 p-3 rounded border border-slate-700 hover:bg-slate-800/70 transition">
                <p className="text-sm text-slate-300">• {news}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-400">No recent news updates available</p>
          )}
        </div>
      </section>

      {/* SECTION 7: RISK & VOLATILITY METRICS */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white border-l-4 border-pink-500 pl-3">⚡ Risk & Volatility Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Intraday Volatility (ATR)</p>
            <p className="text-2xl font-bold text-orange-400 mt-2">{commodity.volatility.toFixed(2)}%</p>
            <p className="text-xs text-slate-400 mt-1">Expected daily price range</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Circuit Limits</p>
            <div className="space-y-2 mt-2">
              <p className="text-sm font-bold text-green-400">Upper: +{commodity.circuitLimitUp.toFixed(2)}%</p>
              <p className="text-sm font-bold text-red-400">Lower: -{commodity.circuitLimitDown.toFixed(2)}%</p>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded border border-slate-700 md:col-span-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider block mb-3">Risk Summary</p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• <span className="font-semibold">Margin Call Risk:</span> Maintain minimum {commodity.margin.toLocaleString()} INR margin</li>
              <li>• <span className="font-semibold">Stop Loss Recommendation:</span> Place SL at 2% below entry</li>
              <li>• <span className="font-semibold">Max Daily Move:</span> ~{(commodity.dayHigh - commodity.dayLow).toFixed(2)} INR observed today</li>
              <li>• <span className="font-semibold">Liquidity Alert:</span> Volume OK</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 8: COMPARATIVE INSIGHTS */}
      {topMovers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white border-l-4 border-indigo-500 pl-3">📈 Top Performers & Movers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-400 font-semibold">Commodity</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-semibold">LTP (₹)</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-semibold">Change %</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-semibold">Volume</th>
                </tr>
              </thead>
              <tbody>
                {topMovers.slice(0, 8).map((mover, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-white font-semibold">{mover.name}</td>
                    <td className="px-4 py-3 text-right text-white font-bold">₹{mover.ltp.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${getChangeColor(mover.changePercent)}`}>
                      {mover.changePercent >= 0 ? '▲' : '▼'} {Math.abs(mover.changePercent).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{(mover.volume / 1000).toFixed(0)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SECTION 9: EDUCATIONAL INSIGHTS */}
      <section className="space-y-4 pb-4">
        <h2 className="text-xl font-bold text-white border-l-4 border-teal-500 pl-3">📚 Educational Insight</h2>
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 p-5 rounded border border-slate-600">
          <p className="text-sm text-slate-300 leading-relaxed">{commodity.educationalInsight}</p>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400">💡 <span className="font-semibold">Key Insight:</span> Understanding the macro factors driving {commodity.name.toLowerCase()} helps you predict price movements and manage risk better.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-700">
        <p>Last Updated: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        <p>Data Source: MCX • NCDEX • Real-time Feed</p>
      </div>
    </div>
  );
};

export default CommoditiesDashboard;
