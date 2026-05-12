import React from 'react';
import { Lightbulb, ShieldCheck, Zap } from 'lucide-react';

interface Insight {
  id: string;
  type: 'info' | 'warning' | 'alert' | 'positive';
  text: string;
  timestamp: string;
}

interface QuanMapAIInsightsProps {
  title: string;
  insights: Insight[];
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

const QuanMapAIInsights: React.FC<QuanMapAIInsightsProps> = ({ title, insights, sentiment }) => {
  const getSentimentStyles = () => {
    switch (sentiment) {
      case 'BULLISH': return { color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' };
      case 'BEARISH': return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' };
      default: return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
    }
  };

  const styles = getSentimentStyles();

  return (
    <div className="w-80 bg-surface border border-border shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden flex flex-col pointer-events-auto">
      {/* Header */}
      <div className="p-4 border-b border-border bg-background flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap size={18} className="text-accent animate-pulse" />
          <h3 className="font-extrabold text-sm tracking-tight text-text-primary uppercase">{title}</h3>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${styles.bg} ${styles.color} border ${styles.border}`}>
          {sentiment}
        </div>
      </div>

      {/* Insight Feed */}
      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar bg-surface">
        {insights.length > 0 ? (
          insights.map((insight) => (
            <div key={insight.id} className="relative pl-6 pb-4 border-l border-border/50 last:pb-0">
              {/* Icon / Bullet */}
              <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-border border-2 border-surface" />
              
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[8px] font-bold uppercase tracking-widest ${
                    insight.type === 'positive' ? 'text-green-500' : 
                    insight.type === 'warning' ? 'text-amber-500' : 
                    insight.type === 'alert' ? 'text-red-500' : 'text-blue-500'
                  }`}>
                    {insight.type}
                  </span>
                  <span className="text-[8px] text-text-secondary font-mono font-bold">{insight.timestamp}</span>
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-text-secondary">
                  {insight.text}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-10 text-center flex flex-col items-center space-y-2">
            <ShieldCheck size={24} className="text-text-secondary opacity-40" />
            <p className="text-[10px] text-text-secondary font-bold tracking-tight">ANALYZING MARKET PROTOCOLS...</p>
          </div>
        )}
      </div>

      {/* Footer / Summary */}
      <div className="p-3 border-t border-border bg-background/50 flex items-center justify-center space-x-2">
        <Lightbulb size={12} className="text-yellow-500" />
        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">AI Intelligence Overlay Active</span>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--accent-rgb), 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--accent-rgb), 0.4);
        }
      `}</style>
    </div>
  );
};

export default QuanMapAIInsights;
