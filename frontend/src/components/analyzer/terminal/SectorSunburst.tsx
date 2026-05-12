import React from 'react';
import Plot from 'react-plotly.js';
import { useMarketStore } from '../../../store';

const SectorSunburst: React.FC = () => {
    const { setTicker } = useMarketStore();

    const handlePlotClick = (data: any) => {
        if (data && data.points && data.points.length > 0) {
            const clickedLabel = data.points[0].label;
            const nonSelectable = ["Total Market", "Financial Services", "IT", "Oil Gas & Fuels", "FMCG", "Automobile", "Healthcare", "Metals"];
            if (clickedLabel && !nonSelectable.includes(clickedLabel)) {
                setTicker(clickedLabel);
            }
        }
    };

    // Realistic Nifty 500 style breakdown representation
    const sectorData = {
        labels: ["Total Market",
            "Financial Services", "IT", "Oil Gas & Fuels", "FMCG", "Automobile", "Healthcare", "Metals",
            "HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "BAJFINANCE",
            "TCS", "INFY", "HCLTECH", "WIPRO", "TECHM",
            "RELIANCE", "ONGC", "BPCL", "COALINDIA",
            "ITC", "HUL", "NESTLEIND", "BRITANNIA", "TATACONSUM",
            "TMCV", "M&M", "MARUTI", "BAJAJ-AUTO", "HEROMOTOCO",
            "SUNPHARMA", "CIPLA", "DRREDDY", "APOLLOHOSP",
            "TATASTEEL", "HINDALCO", "JSWSTEEL", "ADANIENT", "ADANIPORTS", "ADANIGREEN", "ADANIPOWER"],
        parents: ["",
            "Total Market", "Total Market", "Total Market", "Total Market", "Total Market", "Total Market", "Total Market",
            "Financial Services", "Financial Services", "Financial Services", "Financial Services", "Financial Services", "Financial Services",
            "IT", "IT", "IT", "IT", "IT",
            "Oil Gas & Fuels", "Oil Gas & Fuels", "Oil Gas & Fuels", "Oil Gas & Fuels",
            "FMCG", "FMCG", "FMCG", "FMCG", "FMCG",
            "Automobile", "Automobile", "Automobile", "Automobile", "Automobile",
            "Healthcare", "Healthcare", "Healthcare", "Healthcare",
            "Metals", "Metals", "Metals", "Metals", "Metals", "Metals", "Metals"],
        values: [100,
            35, 15, 12, 10, 8, 5, 15,
            12, 8, 5, 4, 3, 3,
            6, 5, 2, 1, 1,
            9, 1, 1, 1,
            4, 3, 1, 1, 1,
            3, 2, 1, 1, 1,
            2, 1, 1, 1,
            2, 1, 1, 5, 3, 2, 1]
    };

    return (
        <div className="flex flex-col w-full h-full bg-surface border-t border-border-primary">
            <div className="p-3 bg-card/50 border-b border-border-primary flex items-center justify-between sticky top-0">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Sector Distribution</span>
            </div>
            <div className="flex-1 relative w-full h-full p-2">
                <Plot
                    data={[{
                        type: "sunburst",
                        labels: sectorData.labels,
                        parents: sectorData.parents,
                        values: sectorData.values,
                        marker: {
                            colors: ["transparent", "#3b82f6", "#8b5cf6", "#10b981", "#60a5fa", "#93c5fd", "#a78bfa", "#c4b5fd", "#34d399",
                                "#4ade80", "#2dd4bf", "#38bdf8", "#818cf8", "#a78bfa", "#f472b6", "#fb7185", "#fbbf24", "#fb923c", "#f87171"]
                        },
                        textinfo: "label+percent parent",
                        outsidetextfont: { size: 10, color: "#94a3b8" },
                        textfont: { size: 10, color: "#ffffff", family: "JetBrains Mono", weight: 'bold' },
                        branchvalues: 'total'
                    }]}
                    layout={{
                        margin: { t: 0, l: 0, r: 0, b: 0 },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        autosize: true
                    }}
                    onClick={handlePlotClick}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%', minHeight: '150px' }}
                    config={{ responsive: true, displayModeBar: false }}
                />
            </div>
        </div>
    );
};

export default SectorSunburst;
