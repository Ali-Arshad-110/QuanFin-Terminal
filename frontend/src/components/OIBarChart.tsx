import React from 'react';
import Plot from 'react-plotly.js';

interface OIData {
    strike: number;
    callOI: number;
    putOI: number;
}

interface OIBarChartProps {
    data: OIData[];
}

const OIBarChart: React.FC<OIBarChartProps> = ({ data }) => {
    const strikes = data.map(d => d.strike);
    const callOI = data.map(d => d.callOI);
    const putOI = data.map(d => d.putOI);

    return (
        <div className="w-full h-full min-h-[300px]">
            <Plot
                data={[
                    {
                        x: strikes,
                        y: callOI,
                        name: 'Call OI',
                        type: 'bar',
                        marker: { color: '#f43f5e' }, // rose-500
                        hovertemplate: 'Strike: %{x}<br>Call OI: %{y}<extra></extra>',
                    },
                    {
                        x: strikes,
                        y: putOI,
                        name: 'Put OI',
                        type: 'bar',
                        marker: { color: '#10b981' }, // emerald-500
                        hovertemplate: 'Strike: %{x}<br>Put OI: %{y}<extra></extra>',
                    },
                ]}
                layout={{
                    autosize: true,
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    margin: { l: 40, r: 20, t: 10, b: 40 },
                    barmode: 'group',
                    showlegend: false,
                    xaxis: {
                        tickfont: { color: '#94a3b8', size: 10 },
                        gridcolor: '#1e293b',
                        zeroline: false,
                        title: { text: 'Strike Price', font: { size: 10, color: '#64748b' } }
                    },
                    yaxis: {
                        tickfont: { color: '#94a3b8', size: 10 },
                        gridcolor: '#1e293b',
                        zeroline: false,
                        title: { text: 'Open Interest', font: { size: 10, color: '#64748b' } }
                    },
                    hoverlabel: {
                        bgcolor: '#0f172a',
                        bordercolor: '#1e293b',
                        font: { color: '#f8fafc', size: 12 }
                    }
                }}
                config={{ responsive: true, displayModeBar: false }}
                className="w-full h-full"
            />
        </div>
    );
};

export default OIBarChart;
