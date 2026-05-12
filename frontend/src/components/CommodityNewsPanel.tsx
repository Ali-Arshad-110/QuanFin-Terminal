
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Newspaper, TrendingUp, TrendingDown } from 'lucide-react';

interface NewsItem {
    id: number;
    headline: string;
    source: string;
    time: string;
    tags: string[];
    sentiment: 'bullish' | 'bearish' | 'neutral';
}

const CommodityNewsPanel: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            try {
                const res = await axios.get('http://localhost:8000/api/v1/commodities/news');
                if (res.data.status === 'success') {
                    setNews(res.data.data);
                }
            } catch (err) {
                console.error("Failed to load news", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-800">
                <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <Newspaper size={14} className="text-blue-400" />
                    Global News
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {loading ? (
                    <div className="p-4 text-center text-xs text-slate-500">Loading news...</div>
                ) : (
                    <div className="divide-y divide-slate-800">
                        {news.map(item => (
                            <div key={item.id} className="p-3 hover:bg-slate-900/50 transition-colors">
                                <div className="flex justify-between items-start gap-2 mb-1">
                                    <h4 className="text-xs text-slate-300 font-medium leading-relaxed">{item.headline}</h4>
                                    {item.sentiment === 'bullish' && <TrendingUp size={12} className="text-emerald-500 flex-none mt-0.5" />}
                                    {item.sentiment === 'bearish' && <TrendingDown size={12} className="text-rose-500 flex-none mt-0.5" />}
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-[10px] text-slate-500">{item.source} • {item.time}</span>
                                    <div className="flex gap-1">
                                        {item.tags.map(tag => (
                                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommodityNewsPanel;
