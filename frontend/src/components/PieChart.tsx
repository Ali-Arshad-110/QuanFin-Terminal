import React, { useState } from 'react';

interface DataItem {
    label: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: DataItem[];
    size?: number;
    donut?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({ data, size = 200, donut = true }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const total = data.reduce((sum, item) => sum + item.value, 0);

    let cumulativeAngle = 0;
    const center = size / 2;
    const radius = size / 2;
    const innerRadius = donut ? radius * 0.6 : 0;

    const paths = data.map((item, index) => {
        const startAngle = cumulativeAngle;
        const sliceAngle = item.value === total ? 359.99 : (item.value / total) * 360;
        const endAngle = startAngle + sliceAngle;

        cumulativeAngle += sliceAngle;

        // Convert angles to radians (subtract 90deg to start from top)
        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);

        // Calculate points
        const x1 = center + radius * Math.cos(startRad);
        const y1 = center + radius * Math.sin(startRad);
        const x2 = center + radius * Math.cos(endRad);
        const y2 = center + radius * Math.sin(endRad);

        const x3 = center + innerRadius * Math.cos(endRad);
        const y3 = center + innerRadius * Math.sin(endRad);
        const x4 = center + innerRadius * Math.cos(startRad);
        const y4 = center + innerRadius * Math.sin(startRad);

        // Path command
        const largeArcFlag = sliceAngle > 180 ? 1 : 0;

        const pathData = [
            `M ${x1} ${y1}`, // Move to outer start
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arc to outer end
            `L ${x3} ${y3}`, // Line to inner end
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`, // Arc to inner start (reverse)
            'Z' // Close path
        ].join(' ');

        return { path: pathData, ...item, index };
    });

    const isDark = !document.documentElement.classList.contains('light'); // Best guess for global theme, or we can just use generic grays

    return (
        <div className="relative flex flex-col items-center justify-center">
            <svg width={size} height={size} className="overflow-visible transform transition-transform duration-500 hover:scale-105">
                {paths.map((slice, i) => (
                    <g key={i}>
                        <path
                            d={slice.path}
                            fill={slice.color}
                            className="transition-all duration-300 cursor-pointer hover:opacity-80"
                            style={{
                                transform: hoveredIndex === i ? 'scale(1.05)' : 'scale(1)',
                                transformBox: 'fill-box',
                                transformOrigin: 'center',
                                filter: hoveredIndex === i ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' : 'none'
                            }}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        />
                    </g>
                ))}
                {/* Center Text (for Donut) */}
                {donut && (
                    <text x="50%" y="50%" textAnchor="middle" dy="0.3em" className="fill-white font-bold text-lg pointer-events-none">
                        {hoveredIndex !== null ? data[hoveredIndex].value + '%' : '100%'}
                    </text>
                )}
            </svg>

            {/* Custom Floating Tooltip */}
            {hoveredIndex !== null && (
                <div
                    className="absolute z-50 bg-white text-slate-900 px-3 py-2 rounded-lg shadow-xl border border-slate-200 pointer-events-none transition-all duration-200 ease-out transform"
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -170%)',
                        minWidth: '140px'
                    }}
                >
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{data[hoveredIndex].label || (data[hoveredIndex] as any).name}</div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-white" style={{ background: data[hoveredIndex].color, '--tw-ring-color': data[hoveredIndex].color } as React.CSSProperties}></span>
                        <span className="font-bold text-lg text-slate-800">{data[hoveredIndex].value}%</span>
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-2 justify-center mt-4 max-w-[200px]">
                {data.map((item, i) => (
                    <div
                        key={i}
                        className={`flex items-center gap-1.5 text-xs transition-opacity duration-200 ${hoveredIndex !== null && hoveredIndex !== i ? 'opacity-40' : 'opacity-100'}`}
                    >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className={isDark ? "text-slate-300" : "text-slate-600"}>{item.label || (item as any).name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PieChart;
