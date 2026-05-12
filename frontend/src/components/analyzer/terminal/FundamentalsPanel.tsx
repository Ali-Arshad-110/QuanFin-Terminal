import React, { useState } from 'react';
import type { UnifiedDataset } from '../../../hooks/useStabilityData';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FundamentalsPanelProps {
    data: UnifiedDataset;
}

const FundamentalsPanel: React.FC<FundamentalsPanelProps> = ({ data }) => {
    const [collapsed, setCollapsed] = useState(false);

    const formatMarketCap = (mc: number) => {
        if (mc > 100000) return `${(mc / 100000).toFixed(2)}L Cr`;
        return `${mc.toFixed(2)} Cr`;
    };

    const fundData = data.fundamentals;
    const keyRatios = [
        { label: 'P/E Ratio', ttm: fundData.peRatio ? fundData.peRatio.toFixed(2) : '-', sec: '-' },
        { label: 'Market Cap', ttm: fundData.marketCap ? formatMarketCap(fundData.marketCap) : '-', sec: '-' },
        { label: 'Beta', ttm: fundData.beta ? fundData.beta.toFixed(2) : '-', sec: '1.0' },
        { label: 'ROE (%)', ttm: fundData.roe ? fundData.roe.toFixed(2) : '-', sec: '15.2' },
        { label: 'Debt/Equity', ttm: fundData.deRatio ? fundData.deRatio.toFixed(2) : '-', sec: '-' },
        { label: 'Sector', ttm: fundData.sector ? fundData.sector.slice(0, 10) + '..' : '-', sec: '-' },
    ];
    const financials = [
        { label: 'EPS', q1: fundData.eps ? `₹${fundData.eps.toFixed(2)}` : '-', q2: '-' },
        { label: 'Div Yield', q1: fundData.dividendYield ? `${fundData.dividendYield}%` : '-', q2: '-' },
        { label: 'Growth', q1: fundData.earningsGrowth ? `${fundData.earningsGrowth}%` : '-', q2: '-' },
        { label: 'Industry', q1: fundData.industry ? fundData.industry.slice(0, 12) + '..' : 'N/A', q2: '-' },
    ];

    return (
        <div className="flex flex-col w-full h-full bg-surface overflow-hidden">
            {/* Header with toggle */}
            <div className="p-3 bg-card/50 border-b border-border-primary flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest flex flex-col gap-0.5">
                    <span>Fundamentals</span>
                    <span className="w-4 h-0.5 bg-blue-500"></span>
                </span>
                <button
                    onClick={() => setCollapsed(v => !v)}
                    className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
            </div>

            {!collapsed && (
                <div className="flex flex-col p-3 gap-6 overflow-y-auto custom-scrollbar flex-1">
                    {/* Key Ratios */}
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-bold text-text-primary tracking-wider">Key Ratios</span>
                            <div className="flex gap-4 text-[9px] text-text-muted font-bold">
                                <span className="w-12 text-right">TTM</span>
                                <span className="w-12 text-right">SEC</span>
                            </div>
                        </div>
                        {keyRatios.map((r, i) => (
                            <div key={i} className="flex justify-between items-center py-1 hover:bg-surface group rounded px-1 -mx-1 transition-colors">
                                <span className="text-[10px] text-text-secondary group-hover:text-text-primary transition-colors">{r.label}</span>
                                <div className="flex gap-4 text-[10px] font-mono">
                                    <span className="w-12 text-right text-text-primary">{r.ttm}</span>
                                    <span className="w-12 text-right text-text-secondary">{r.sec}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Financials */}
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[11px] font-bold text-text-primary tracking-wider">Financials</span>
                            <div className="flex gap-4 text-[9px] text-text-muted font-bold">
                                <span className="w-[60px] text-right">Q1</span>
                                <span className="w-[60px] text-right">Q2</span>
                            </div>
                        </div>
                        {financials.map((f, i) => (
                            <div key={i} className="flex justify-between items-center py-1 hover:bg-surface group rounded px-1 -mx-1 transition-colors">
                                <span className="text-[10px] text-text-secondary group-hover:text-text-primary transition-colors">{f.label}</span>
                                <div className="flex gap-4 text-[10px] font-mono">
                                    <span className="w-[60px] text-right text-text-primary">{f.q1}</span>
                                    <span className="w-[60px] text-right text-text-secondary">{f.q2}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundamentalsPanel;
