
import Plot from 'react-plotly.js';

const PriceTargetGauge = () => {
    // Mock sunburst data for consensus
    const data: any = [{
        type: "sunburst",
        labels: ["Consensus", "Buy", "Hold", "Sell"],
        parents: ["", "Consensus", "Consensus", "Consensus"],
        values: [10, 6.5, 2, 1.5],
        marker: {
            colors: ["transparent", "#10b981", "#eab308", "#ef4444"]
        },
        textinfo: "label+percent parent",
        hoverinfo: "label+value",
        insidetextorientation: "radial",
        branchvalues: "total",
        outsidetextfont: { size: 10, color: "#94a3b8" },
        textfont: { size: 10, color: "#ffffff", family: "JetBrains Mono" }
    }];

    return (
        <div className="flex flex-col w-full h-full bg-surface">
            <div className="p-3 text-[11px] font-bold text-text-secondary border-b border-border-primary flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Analyst Consensus
            </div>
            <div className="flex-1 flex items-center justify-center p-2 relative h-full">
                <div className="w-full h-full relative" style={{ minHeight: '120px' }}>
                    <Plot
                        data={data}
                        layout={{
                            margin: { t: 0, l: 0, r: 0, b: 0 },
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            autosize: true
                        }}
                        useResizeHandler={true}
                        style={{ width: '100%', height: '100%' }}
                        config={{ responsive: true, displayModeBar: false }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PriceTargetGauge;
