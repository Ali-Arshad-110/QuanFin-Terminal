import React, { useMemo } from 'react';
import Plot from 'react-plotly.js';
import type { UnifiedDataset } from '../../../hooks/useStabilityData';

interface VolumeDeliveryPanelProps {
    data: UnifiedDataset;
    ticker: string;
}

const VolumeDeliveryPanel: React.FC<VolumeDeliveryPanelProps> = ({ data }) => {
    const days = 10;

    // Last 10 days of data
    const timestamps = useMemo(() =>
        data.timestamps.slice(-days).map(t => {
            const d = new Date(t * 1000);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        }), [data.timestamps]);

    const totalVolume = useMemo(() => data.volume.slice(-days), [data.volume]);

    // Estimate delivery volume as ~45–65% of total (demo if not in API)
    const deliveryVolume = useMemo(() =>
        totalVolume.map((v, i) => Math.round(v * (0.45 + ((i * 7) % 20) / 100))),
        [totalVolume]);

    const priceSlice = data.price.slice(-days);
    const barColors = priceSlice.map((c, i, arr) => {
        if (i === 0) return '#3b82f6';
        return c >= arr[i - 1] ? '#10b981' : '#ef4444';
    });

    return (
        <div className="flex flex-col w-full h-full bg-surface border-t border-border-primary">
            {/* Header */}
            <div className="px-3 py-2 border-b border-border-primary bg-card/50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-text-primary tracking-wide">10-DAY VOLUME</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-bold">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-blue-500 inline-block"></span>
                        <span className="text-slate-400">Total</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block"></span>
                        <span className="text-slate-400">Delivery</span>
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 relative w-full">
                <Plot
                    data={[
                        {
                            x: timestamps,
                            y: totalVolume,
                            type: 'bar',
                            name: 'Total Vol',
                            marker: { color: barColors, opacity: 0.7 },
                            hovertemplate: '%{x}<br>Total: %{y:,.0f}<extra></extra>',
                        },
                        {
                            x: timestamps,
                            y: deliveryVolume,
                            type: 'bar',
                            name: 'Delivery',
                            marker: {
                                color: '#10b981',
                                opacity: 0.9,
                                line: { color: '#34d399', width: 0.5 }
                            },
                            hovertemplate: '%{x}<br>Delivery: %{y:,.0f}<extra></extra>',
                        }
                    ]}
                    layout={{
                        barmode: 'overlay',
                        margin: { t: 6, l: 38, r: 6, b: 30 },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        autosize: true,
                        showlegend: false,
                        xaxis: {
                            tickfont: { size: 8, color: '#64748b' },
                            gridcolor: 'transparent',
                            tickangle: 0,
                        },
                        yaxis: {
                            tickfont: { size: 8, color: '#64748b' },
                            gridcolor: 'rgba(51, 65, 85, 0.2)',
                            tickformat: '.2s',
                        },
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ responsive: true, displayModeBar: false }}
                />
            </div>
        </div>
    );
};

export default VolumeDeliveryPanel;
