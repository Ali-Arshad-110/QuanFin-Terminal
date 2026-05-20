import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Matrix Background Component for cyberpunk theme
const MatrixBackground = () => {
  useEffect(() => {
    const canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const katakana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const alphabet = katakana.split('');

    const fontSize = 16;
    const columns = canvas.width / fontSize;

    const rainDrops: number[] = [];
    for (let x = 0; x < columns; x++) {
      rainDrops[x] = 1;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(5, 7, 10, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0f0'; // green text
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet[Math.floor(Math.random() * alphabet.length)];
        // Randomly make some text neon cyan / red for a high-tech terminal vibe
        if (Math.random() > 0.98) {
          ctx.fillStyle = '#f43f5e'; // red warning accent
        } else if (Math.random() > 0.95) {
          ctx.fillStyle = '#0ea5e9'; // cyan accent
        } else {
          ctx.fillStyle = '#10b981'; // green accent
        }

        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);

        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
    };

    const interval = setInterval(draw, 30);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      id="matrix-canvas"
      className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
    />
  );
};

interface DevToolsWarningOverlayProps {
  onClose?: () => void;
}

export const DevToolsWarningOverlay: React.FC<DevToolsWarningOverlayProps> = ({ onClose }) => {
  const [loadingStep, setLoadingStep] = useState(0);
  const [showMainWarning, setShowMainWarning] = useState(false);

  const steps = [
    '⚠ Tracing unauthorized debugger...',
    '⚡ Analyzing reverse engineering attempt...',
    '🔒 Access monitored. Preparing warning console...'
  ];

  useEffect(() => {
    if (loadingStep < steps.length) {
      const timer = setTimeout(() => {
        setLoadingStep((prev) => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowMainWarning(true);
    }
  }, [loadingStep]);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md select-none font-mono">
      <MatrixBackground />

      {/* Cyberpunk grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none" />

      <div className="relative w-full max-w-2xl mx-4 p-8 rounded-xl border border-rose-500/30 bg-black/80 shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden">
        {/* Neon Glow Borders */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

        <AnimatePresence mode="wait">
          {!showMainWarning ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2 text-rose-500">
                <span className="animate-pulse">●</span>
                <span className="text-sm font-semibold tracking-widest uppercase">Security Shield Active</span>
              </div>
              
              <div className="space-y-2 text-slate-400 text-sm">
                {steps.slice(0, loadingStep + 1).map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={idx === loadingStep ? 'text-rose-400 font-bold' : 'text-slate-500'}
                  >
                    {step}
                  </motion.div>
                ))}
              </div>

              {/* Fake progress bar */}
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${((loadingStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                  className="h-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="warning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="text-center space-y-6"
            >
              <div className="inline-flex p-3 rounded-full bg-rose-950/50 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-bounce">
                <svg className="w-10 h-10 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-wider text-rose-500 uppercase drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                  Developer Tools Detected
                </h2>
                <div className="w-24 h-[1px] bg-rose-500/50 mx-auto" />
              </div>

              <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
                Stealing code harms innovation.
                If you're interested in how this platform was built, explore the creator links below.
              </p>

              {/* Creator Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                <a
                  href="https://github.com/Ali-Arshad-110"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all duration-300 group"
                >
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 mb-1" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white">GitHub</span>
                  <span className="text-[10px] text-slate-500">@Ali-Arshad-110</span>
                </a>

                <a
                  href="https://linkedin.com/in/ali-arshad-110"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all duration-300 group"
                >
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 mb-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white">LinkedIn</span>
                  <span className="text-[10px] text-slate-500">Connect with me</span>
                </a>

                <a
                  href="https://arshad-portfolio.placeholder"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all duration-300 group"
                >
                  <svg className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white">Portfolio</span>
                  <span className="text-[10px] text-slate-500">My Website</span>
                </a>
              </div>

              {/* Close Button / Go Back */}
              {onClose && (
                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded border border-rose-500/30 text-rose-400 hover:text-white hover:bg-rose-950/30 hover:border-rose-500 transition-all duration-300 text-xs font-semibold tracking-wider uppercase"
                  >
                    Close & Return to Platform
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="pt-4 border-t border-slate-900 text-[10px] text-slate-600 flex justify-between items-center">
                <span>SYSTEM SECURE: SSL/TLS</span>
                <span>BUILT BY ARSHAD / QUANFIN</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
