import React, { useState } from 'react';

interface BarData {
    label: string;
    value1: number; // e.g. Revenue
    value2?: number; // e.g. Net Income
}

interface BarChartProps {
    data: BarData[];
    title: string;
    color1?: string;
    color2?: string;
    label1?: string;
    label2?: string;
}

const BarChart: React.FC<BarChartProps> = ({
    data,
    title,
    color1 = '#3b82f6',
    color2 = '#10b981',
    label1 = 'Revenue',
    label2 = 'Net Income'
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Find max value to normalize height
    const maxValue = Math.max(...data.map(d => Math.max(d.value1, d.value2 || 0)));

    return (
        <div className="w-full h-full flex flex-col p-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between">
                <span>{title}</span>
                <div className="flex gap-3">
                    <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: color1 }}></span> {label1}</span>
                    {data[0].value2 !== undefined && (
                        <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-sm" style={{ background: color2 }}></span> {label2}</span>
                    )}
                </div>
            </h3>

            <div className="flex-1 flex items-end justify-between gap-2">
                {data.map((item, i) => (
                    <div
                        key={i}
                        className="flex-1 flex flex-col justify-end items-center gap-1 group relative h-full"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        {/* Bars Container */}
                        <div className="flex gap-1 items-end w-full justify-center h-full">
                            {/* Bar 1 */}
                            <div
                                className="w-full max-w-[15px] rounded-t-sm transition-all duration-300 relative group/bar1"
                                style={{
                                    height: `${(item.value1 / maxValue) * 100}%`,
                                    backgroundColor: color1,
                                    opacity: hoveredIndex === i ? 1 : 0.8
                                }}
                            >
                            </div>

                            {/* Bar 2 */}
                            {item.value2 !== undefined && (
                                <div
                                    className="w-full max-w-[15px] rounded-t-sm transition-all duration-300 relative group/bar2"
                                    style={{
                                        height: `${(item.value2 / maxValue) * 100}%`,
                                        backgroundColor: color2,
                                        opacity: hoveredIndex === i ? 1 : 0.8
                                    }}
                                >
                                </div>
                            )}
                        </div>

                        {/* Tooltip (Simple) */}
                        {hoveredIndex === i && (
                            <div className="absolute bottom-full mb-1 bg-slate-900 border border-slate-700 text-xs p-2 rounded shadow-xl z-20 whitespace-nowrap pointer-events-none">
                                <div className="font-bold text-slate-200">{item.label}</div>
                                <div style={{ color: color1 }}>{label1}: {item.value1}</div>
                                {item.value2 && <div style={{ color: color2 }}>{label2}: {item.value2}</div>}
                            </div>
                        )}

                        {/* X-Axis Label */}
                        <span className="text-[10px] text-slate-500 font-mono mt-2 truncate w-full text-center group-hover:text-slate-300">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BarChart;
