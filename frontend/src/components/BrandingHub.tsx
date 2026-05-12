import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Instagram,
  Twitter,
  Linkedin,
  ExternalLink,
  Download,
  Image as ImageIcon,
  Type,
  Palette
} from 'lucide-react';

interface BrandingAsset {
  id: string;
  name: string;
  url: string;
  description: string;
  dimensions: string;
  tag: string;
}

interface SocialPost {
  platform: string;
  icon: React.ReactNode;
  caption: string;
  hashtags: string;
}

const BrandingHub: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const assets: BrandingAsset[] = [
    {
      id: 'hero',
      name: 'QuanMap Hero',
      url: '/assets/branding/hero.png',
      description: 'Institutional-grade hero image for web and banners.',
      dimensions: '1920x1080',
      tag: '16:9'
    },
    {
      id: 'square',
      name: 'Institutional Pulse',
      url: '/assets/branding/square.png',
      description: 'Square social post showing real-time FII/DII flow.',
      dimensions: '1080x1080',
      tag: '1:1'
    },
    {
      id: 'render',
      name: 'Final Branding Render',
      url: '/assets/branding/render.png',
      description: 'Integrated branding render with logo and rhyming text.',
      dimensions: '1080x1080',
      tag: '1:1'
    }
  ];

  const socialPosts: SocialPost[] = [
    {
      platform: 'X / Twitter',
      icon: <Twitter size={16} />,
      caption: "Watch the smart money flow. Real-time institutional intelligence via #QuanMap. 🌐 Track FII/DII net flows with sub-second precision. #TradingTech #Quantitative",
      hashtags: "#FII #DII #FinTech #StockMarket"
    },
    {
      platform: 'LinkedIn',
      icon: <Linkedin size={16} />,
      caption: "Visualizing Global Capital Flow. Our new Institutional Pulse layer tracks market sentiment across the world's major financial hubs. Bringing professional-grade research to your terminal. #FinTech #CapitalMarkets #DataVisualization",
      hashtags: "#InstitutionalTrading #InstitutionalResearch"
    },
    {
      platform: 'Instagram',
      icon: <Instagram size={16} />,
      caption: "Precision. Intelligence. Flow. 📊 Deep dive into the market pulse with QuanMap. Data turned into capital. #StockMarket #Algorithm #DataScience",
      hashtags: "#QuanFin #InstitutionalPulse"
    }
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-700 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="px-8 py-10 bg-surface/50 border-b border-border/50 backdrop-blur-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
            <Share2 className="text-accent w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-text-primary uppercase">Branding & Social Hub</h1>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em] mt-1">QuanFin Marketing Identity Suite</p>
          </div>
        </div>
        <p className="text-text-secondary max-w-2xl text-sm leading-relaxed">
          Access high-fidelity marketing assets, social media templates, and corporate guidelines for the QuanFin Terminal branding.
        </p>
      </div>

      <div className="p-8 space-y-12 pb-20">

        {/* Section: Visual Assets */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <ImageIcon className="text-accent/50" size={18} />
              <h2 className="text-xl font-black text-text-primary uppercase tracking-tighter">Visual Assets</h2>
            </div>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-surface px-3 py-1 rounded-full border border-border">{assets.length} Assets Loaded</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {assets.map((asset) => (
              <div key={asset.id} className="group bg-surface border border-border rounded-2xl overflow-hidden hover:border-accent/40 hover:shadow-2xl hover:shadow-accent/5 transition-all duration-500">
                <div className="aspect-[16/10] bg-black relative overflow-hidden">
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10s]" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-2 py-1 rounded border border-white/10 uppercase tracking-widest">{asset.tag}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <a href={asset.url} download className="p-4 bg-white text-black rounded-full hover:scale-110 transition-transform">
                      <Download size={20} />
                    </a>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-text-primary">{asset.name}</h3>
                    <span className="text-[10px] font-mono text-text-muted">{asset.dimensions}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary font-medium leading-relaxed mb-4">{asset.description}</p>
                  <button
                    onClick={() => handleCopy(`${window.location.origin}${asset.url}`, asset.id)}
                    className="w-full py-2 bg-background border border-border hover:bg-surface-light rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center space-x-2"
                  >
                    {copiedId === asset.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    <span>{copiedId === asset.id ? 'Copied Link' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Social Copy */}
        <section>
          <div className="flex items-center space-x-3 mb-8">
            <Type className="text-accent/50" size={18} />
            <h2 className="text-xl font-black text-text-primary uppercase tracking-tighter">Social Media Copy</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {socialPosts.map((post, idx) => (
              <div key={idx} className="bg-surface border border-border p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-white scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                  {post.icon}
                </div>
                <div className="flex items-center space-x-2 mb-4 text-xs font-black uppercase text-accent tracking-widest">
                  {post.icon}
                  <span>{post.platform}</span>
                </div>
                <p className="text-xs text-text-primary font-medium leading-relaxed mb-4 min-h-[60px]">{post.caption}</p>
                <p className="text-[10px] font-bold text-accent mb-6">{post.hashtags}</p>
                <button
                  onClick={() => handleCopy(`${post.caption}\n\n${post.hashtags}`, `post-${idx}`)}
                  className="w-full py-2.5 bg-accent/10 border border-accent/20 hover:bg-accent hover:text-white rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center space-x-2"
                >
                  {copiedId === `post-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedId === `post-${idx}` ? 'Copied Text' : 'Copy to Clipboard'}</span>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Brand Kit Mini */}
        <section className="bg-surface-light border border-border rounded-3xl p-8">
          <div className="flex items-center space-x-3 mb-10">
            <Palette className="text-accent/50" size={20} />
            <h2 className="text-xl font-black text-text-primary uppercase tracking-tighter">Terminal Brand Kit</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-6">Typography</p>
              <div className="space-y-6">
                <div>
                  <h3 className="text-3xl font-black text-text-primary tracking-tighter">INTER BLACK (DISPLAYS)</h3>
                  <p className="text-xs text-text-secondary mt-1 uppercase tracking-widest">Used for Headings & Branding</p>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-text-primary">Outfit Semibold (Body)</h4>
                  <p className="text-xs text-text-secondary mt-1 uppercase tracking-widest">Used for Market Data & Tables</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-6">Core Palette</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { name: 'Accent Indigo', color: '#6366f1' },
                  { name: 'Success Emerald', color: '#10b981' },
                  { name: 'Pure Dark', color: '#000000' },
                  { name: 'Surface Gray', color: '#111827' }
                ].map(c => (
                  <div key={c.name} className="flex flex-col items-center group cursor-pointer" onClick={() => handleCopy(c.color, c.name)}>
                    <div className="w-16 h-16 rounded-2xl mb-2 shadow-lg group-hover:scale-105 transition-transform border border-white/10" style={{ backgroundColor: c.color }} />
                    <span className="text-[9px] font-black uppercase text-text-secondary tracking-widest">{c.name}</span>
                    <span className="text-[8px] font-mono text-text-muted group-hover:text-accent transition-colors">{copiedId === c.name ? 'COPIED!' : c.color}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--accent-rgb), 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--accent-rgb), 0.3);
        }
      `}</style>
    </div>
  );
};

export default BrandingHub;
