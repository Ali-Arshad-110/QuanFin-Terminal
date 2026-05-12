import React from 'react';
import { useTheme } from '../../theme/ThemeProvider';
import type { QuantScores } from '../../utils/QuantEngine';
import { Zap, Target, Shield, Waves, BrainCircuit } from 'lucide-react';

interface InsightRendererProps {
    scores: QuantScores | null;
    ticker: string;
}

const ScoreBlock: React.FC<{
    title: string;
    score: number;
    icon: React.ReactNode;
    isDark: boolean;
}> = ({ title, score, icon, isDark }) => {
    let colorClass = isDark ? 'text-slate-400' : 'text-slate-500';
    let ringClass = isDark ? 'ring-slate-700/50' : 'ring-slate-200';
    let bgClass = isDark ? 'bg-slate-800/80' : 'bg-white';

    if (score >= 70) {
        colorClass = isDark ? 'text-emerald-400' : 'text-emerald-600';
        ringClass = isDark ? 'ring-emerald-500/30' : 'ring-emerald-500/50';
        bgClass = isDark ? 'bg-emerald-950/20' : 'bg-emerald-50';
    } else if (score <= 30) {
        colorClass = isDark ? 'text-rose-400' : 'text-rose-600';
        ringClass = isDark ? 'ring-rose-500/30' : 'ring-rose-500/50';
        bgClass = isDark ? 'bg-rose-950/20' : 'bg-rose-50';
    }

    return (
        <div className={`p-4 rounded-xl border ${isDark ? 'border-slate-700/50' : 'border-slate-200'} ${bgClass} flex flex-col items-center justify-center gap-2 hover:-translate-y-1 transition-transform shadow-md ring-1 ${ringClass}`}>
            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {icon}
                {title}
            </div>
            <div className={`text-4xl font-bold font-mono tracking-tight ${colorClass}`}>
                {score}
            </div>
        </div>
    );
};

const InsightRenderer: React.FC<InsightRendererProps> = ({ scores, ticker }) => {
    const { themeMode } = useTheme();
    const isDark = themeMode.includes('dark');

    if (!scores) {
        return (
            <div className={`flex h-full w-full items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Awaiting ticker data to synthesize insights...
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full gap-4 p-2 animate-in fade-in duration-500">
            {/* Header Verdict Block */}
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700/50 shadow-xl' : 'bg-white border-slate-200 shadow-lg'} flex flex-col md:flex-row gap-6 items-center justify-between`}>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center">
                        <span className={`text-sm uppercase tracking-wider font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Overall Score</span>
                        <div className={`text-6xl font-black font-mono tracking-tighter ${scores.overallScore >= 65 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') :
                            scores.overallScore <= 40 ? (isDark ? 'text-rose-400' : 'text-rose-600') :
                                (isDark ? 'text-amber-400' : 'text-amber-600')
                            }`}>
                            {scores.overallScore}
                        </div>
                    </div>
                    <div className="h-16 w-px bg-slate-500/30"></div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${scores.bias === 'Bullish' ? 'bg-emerald-500/20 text-emerald-500' :
                                scores.bias === 'Bearish' ? 'bg-rose-500/20 text-rose-500' :
                                    'bg-amber-500/20 text-amber-500'
                                }`}>
                                {scores.bias} Bias
                            </span>
                            <span className={`text-xs font-medium px-2 py-1 rounded bg-slate-500/10 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                {scores.confidence} Confidence
                            </span>
                        </div>
                        <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                            {ticker} <span className="text-sm font-normal text-slate-500">Quantitative Insight</span>
                        </h2>
                    </div>
                </div>

                <div className={`max-w-md p-4 rounded-xl bg-slate-500/5 border ${isDark ? 'border-slate-700/50' : 'border-slate-200'} border-l-4 ${scores.bias === 'Bullish' ? 'border-l-emerald-500' :
                    scores.bias === 'Bearish' ? 'border-l-rose-500' :
                        'border-l-amber-500'
                    }`}>
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase mb-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        <BrainCircuit size={14} /> AI Synthesis Generator
                    </div>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {scores.aiSummary}
                    </p>
                </div>
            </div>

            {/* Sub-Scores Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                <ScoreBlock title="Momentum" score={scores.momentumScore} icon={<Zap size={16} />} isDark={isDark} />
                <ScoreBlock title="Valuation" score={scores.valuationScore} icon={<Target size={16} />} isDark={isDark} />
                <ScoreBlock title="Risk" score={scores.riskScore} icon={<Shield size={16} />} isDark={isDark} />
                <ScoreBlock title="Flow" score={scores.flowScore} icon={<Waves size={16} />} isDark={isDark} />
            </div>

            <div className={`mt-auto w-full p-4 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Values driven entirely by rule-based algorithmic ranking relative to 52-week parameters. Mode designed to reduce visual clutter for rapid decision framing.
            </div>
        </div>
    );
};

export default InsightRenderer;
