import React from 'react';
import Plot from 'react-plotly.js';
import { useTheme } from '../../theme/ThemeProvider';

interface SunburstChartProps {
    symbol: string;
    name: string;
    sector: string;
    industry: string;
    peers?: { symbol: string; name: string }[];
}

const SunburstChart: React.FC<SunburstChartProps> = ({ symbol, name, sector, industry, peers = [] }) => {
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');

    if (!symbol || !sector) {
        return <div className="flex items-center justify-center h-full text-slate-500 text-[10px]">INSUFFICIENT DATA FOR MAPPING</div>;
    }

    // Hierarchy Building
    // Root: NIFTY 500 (Market)
    // Level 1: Sector
    // Level 2: Industry
    // Level 3: Stock + Peers
    
    const rootName = "MARKET";
    const sectorLabel = `Sector: ${sector}`;
    const industryLabel = `Ind: ${industry}`;

    const labels = [rootName, sectorLabel, industryLabel];
    const parents = ["", rootName, sectorLabel];
    const values = [1, 1, 1]; // Weights
    const colors = [isDark ? "#0f172a" : "#f1f5f9", isDark ? "#1e293b" : "#e2e8f0", isDark ? "#334155" : "#cbd5e1"];

    // Add Main Stock
    const mainStockLabel = name || symbol;
    labels.push(mainStockLabel);
    parents.push(industryLabel);
    values.push(2); // Slightly larger weight for the focus stock
    colors.push("#10b981"); // Distinct emerald for focus stock

    // Add Peers
    peers.forEach(peer => {
        if (peer.symbol !== symbol) {
            labels.push(peer.name || peer.symbol);
            parents.push(industryLabel);
            values.push(1);
            colors.push(isDark ? "#475569" : "#94a3b8"); // Muted color for peers
        }
    });

    return (
        <div className="w-full h-full min-h-[300px] relative">
            <Plot
                data={[{
                    type: "sunburst",
                    labels: labels,
                    parents: parents,
                    values: values,
                    leaf: { opacity: 0.8 },
                    marker: { 
                        line: { width: 1, color: isDark ? '#0b0f14' : '#ffffff' },
                        colors: colors
                    },
                    textinfo: "label",
                    hoverinfo: "label",
                    insidetextorientation: 'radial'
                }]}
                layout={{
                    margin: { l: 0, r: 0, b: 0, t: 0 },
                    autosize: true,
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: {
                        family: 'Inter, sans-serif',
                        size: 8,
                        color: isDark ? '#94a3b8' : '#475569'
                    },
                    showlegend: false
                }}
                useResizeHandler={true}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    );
};

export default SunburstChart;
