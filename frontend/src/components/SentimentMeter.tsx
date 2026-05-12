import React from 'react';

interface SentimentMeterProps {
    pcr: number;
    sentiment: string;
}

export const SentimentMeter: React.FC<SentimentMeterProps> = ({ pcr, sentiment }) => {
    // Normalize PCR to 0-100% for the gauge (assuming PCR range ~0.3 to 2.0 mostly)
    // Let's cap it at 0.5 to 1.5 for the visual center 
    const visualPcr = Math.max(0.5, Math.min(1.5, pcr));
    const percentage = ((visualPcr - 0.5) / 1.0) * 100;

    let sentimentColor = 'text-gray-400';
    let barColor = 'bg-gray-500';

    if (sentiment.toLowerCase() === 'bullish') {
        sentimentColor = 'text-green-500';
        barColor = 'bg-gradient-to-r from-gray-500 to-green-500';
    } else if (sentiment.toLowerCase() === 'bearish') {
        sentimentColor = 'text-red-500';
        barColor = 'bg-gradient-to-r from-red-500 to-gray-500';
    } else {
        sentimentColor = 'text-yellow-500';
        barColor = 'bg-gradient-to-r from-gray-500 via-yellow-500 to-gray-500';
    }

    return (
        <div className="flex flex-col gap-1 w-full bg-[#111] p-3 rounded-lg border border-[rgba(255,255,255,0.05)]">
            <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Sentiment</span>
                <span className={`font-bold uppercase ${sentimentColor}`}>{sentiment}</span>
            </div>
            <div className="h-2 w-full bg-gray-800 rounded-full relative overflow-hidden mt-1">
                <div
                    className={`absolute top-0 left-0 h-full ${barColor} transition-all duration-500 rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
                {/* Center mark */}
                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-gray-400/50 -translate-x-1/2" />
            </div>
            <div className="flex justify-between items-center text-[10px] text-gray-500 mt-0.5">
                <span>PCR: {pcr.toFixed(2)}</span>
            </div>
        </div>
    );
};
