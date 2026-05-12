import React from 'react';
import { DollarSign } from 'lucide-react';

interface BacktestStats {
    initial_capital: number;
    final_equity: number;
    total_return_pct: number;
    total_trades: number;
    win_rate: number;
    profit_factor: number;
}

interface Trade {
    entry_price: number;
    exit_price: number;
    shares: number;
    pnl: number;
    pnl_pct: number;
    exit_date: string;
}

interface Props {
    stats: BacktestStats;
    trades: Trade[];
}

const BacktestResults: React.FC<Props> = ({ stats, trades }) => {
    const isProfitable = stats.total_return_pct >= 0;

    return (
        <div className="space-y-4">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Total Return</span>
                    <span className={`text-lg font-bold font-mono ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfitable ? '+' : ''}{stats.total_return_pct}%
                    </span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Win Rate</span>
                    <span className={`text-lg font-bold font-mono ${stats.win_rate > 50 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                        {stats.win_rate}%
                    </span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Net Profit</span>
                    <span className={`text-sm font-bold font-mono ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <DollarSign className="w-3 h-3 inline" />
                        {(stats.final_equity - stats.initial_capital).toFixed(2)}
                    </span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Trades</span>
                    <span className="text-sm font-bold font-mono text-white">
                        {stats.total_trades}
                    </span>
                </div>
            </div>

            {/* Trades List */}
            <div className="mt-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Recent Trades</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {[...trades].reverse().slice(0, 20).map((t, idx) => (
                        <div key={idx} className="bg-slate-800/30 p-2 rounded flex justify-between items-center text-xs">
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-[10px]">{t.exit_date?.substring(0, 10)}</span>
                                <span className={t.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                    {t.pnl >= 0 ? 'WIN' : 'LOSS'}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-white">{t.pnl_pct.toFixed(2)}%</div>
                                <div className="text-[9px] text-slate-500">
                                    ₹{t.pnl.toFixed(0)}
                                </div>
                            </div>
                        </div>
                    ))}
                    {trades.length === 0 && <div className="text-slate-500 text-xs italic text-center">No trades generated</div>}
                </div>
            </div>
        </div>
    );
};

export default BacktestResults;
