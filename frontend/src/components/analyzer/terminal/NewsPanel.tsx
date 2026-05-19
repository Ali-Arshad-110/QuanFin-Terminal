import { useState, useEffect } from 'react';
import axios from 'axios';
import { useMarketStore } from '../../../store';
import { Loader2 } from 'lucide-react';
import { API_BASE } from '../../../config/api';

const NewsPanel = () => {
    const { ticker } = useMarketStore();
    const [news, setNews] = useState<{ headline: string, detail: string }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchNews = async () => {
            if (!ticker) return;
            setLoading(true);
            try {
                const res = await axios.get(`${API_BASE}/api/v1/news/${ticker}`);
                setNews(res.data);
            } catch (err) {
                console.error("Failed to fetch news", err);
                setNews([]);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, [ticker]);

    return (
        <div className="flex flex-col w-full h-full bg-surface border-t border-border-primary overflow-y-auto custom-scrollbar">
            <div className="p-3 bg-card/50 border-b border-border-primary flex items-center justify-between sticky top-0">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Company Profile & News</span>
                <span className="text-[10px] text-text-muted hover:text-text-primary cursor-pointer transition-colors">⛶</span>
            </div>

            <div className="flex flex-col p-3 gap-4 min-h-[100px] relative">
                {loading ? (
                    <div className="flex justify-center items-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    </div>
                ) : news.length > 0 ? (
                    news.map((item, i) => (
                        <div key={i} className="flex flex-col group cursor-pointer border-b border-border-primary pb-4 last:border-0 last:pb-0">
                            <span className="text-[11px] font-bold text-blue-500 group-hover:text-blue-400 transition-colors leading-snug mb-1">
                                {item.headline}
                            </span>
                            <span className="text-[10px] text-text-muted leading-tight whitespace-pre-line">
                                {item.detail}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="text-[10px] text-text-muted text-center py-4">No recent news available.</div>
                )}
            </div>
        </div>
    );
};

export default NewsPanel;
