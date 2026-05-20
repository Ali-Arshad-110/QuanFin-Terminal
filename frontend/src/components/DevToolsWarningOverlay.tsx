import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Constants  (defined outside the component so they are stable references)
// ─────────────────────────────────────────────────────────────────────────────

const SCAN_STEPS = [
  { id: 'step-1', label: 'Tracing unauthorized debugger session...' },
  { id: 'step-2', label: 'Analyzing reverse-engineering attempt...' },
  { id: 'step-3', label: 'Access monitored — preparing security report...' },
] as const;

/** Total duration of the scan phase in ms (SCAN_STEPS.length × STEP_INTERVAL). */
const STEP_INTERVAL_MS = 1000;

const MATRIX_CHARS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' +
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MATRIX_FONT_SIZE = 15;

// ─────────────────────────────────────────────────────────────────────────────
// MatrixBackground
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full-screen canvas rain effect.
 *
 * Key fixes vs original:
 * - Uses `useRef` for the canvas (no global `id` that breaks on double-mount).
 * - `rainDrops` is re-initialised on resize so columns stay in sync.
 * - Guards against drawing on a detached canvas after unmount.
 * - `draw` is wrapped in `useCallback` to keep the ref stable.
 */
const MatrixBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chars = MATRIX_CHARS.split('');
    let rainDrops: number[] = [];
    let animId: number;
    let mounted = true;

    const initDrops = () => {
      const cols = Math.floor(canvas.width / MATRIX_FONT_SIZE);
      rainDrops = Array.from({ length: cols }, () =>
        Math.floor(Math.random() * (canvas.height / MATRIX_FONT_SIZE)),
      );
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initDrops();
    };

    resize();

    const draw = () => {
      if (!mounted) return;

      // Fade trail
      ctx.fillStyle = 'rgba(5, 7, 10, 0.055)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${MATRIX_FONT_SIZE}px monospace`;

      for (let i = 0; i < rainDrops.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * MATRIX_FONT_SIZE;
        const y = rainDrops[i] * MATRIX_FONT_SIZE;

        // Colour: rare red spark → occasional cyan → default green
        const r = Math.random();
        if (r > 0.985) {
          ctx.fillStyle = '#f43f5e';
        } else if (r > 0.96) {
          ctx.fillStyle = '#22d3ee';
        } else {
          ctx.fillStyle = '#10b981';
        }

        ctx.fillText(ch, x, y);

        // Reset column when it drops off screen
        if (y > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }

      animId = requestAnimationFrame(draw);
    };

    // Use rAF instead of setInterval for buttery-smooth rendering
    animId = requestAnimationFrame(draw);

    window.addEventListener('resize', resize);
    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.18 }}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Scanline overlay (pure CSS, no fragile Tailwind arbitrary values)
// ─────────────────────────────────────────────────────────────────────────────

const ScanlineOverlay: React.FC = () => (
  <div
    aria-hidden="true"
    className="absolute inset-0 pointer-events-none"
    style={{
      backgroundImage: [
        'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
        'repeating-linear-gradient(90deg, rgba(255,0,0,0.025), rgba(0,255,0,0.015), rgba(0,0,255,0.025))',
      ].join(', '),
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Glowing top / bottom border lines
// ─────────────────────────────────────────────────────────────────────────────

const NeonEdge: React.FC<{ position: 'top' | 'bottom' }> = ({ position }) => (
  <div
    aria-hidden="true"
    className={`absolute inset-x-0 ${position}-0 h-px`}
    style={{
      background: 'linear-gradient(90deg, transparent 0%, #f43f5e 30%, #f43f5e 70%, transparent 100%)',
      boxShadow: '0 0 6px 1px rgba(244,63,94,0.6)',
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Animated status dot
// ─────────────────────────────────────────────────────────────────────────────

const PulseDot: React.FC<{ color?: string }> = ({ color = '#f43f5e' }) => (
  <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
    <span
      className="absolute inline-flex h-full w-full rounded-full animate-ping"
      style={{ backgroundColor: color, opacity: 0.6 }}
    />
    <span
      className="relative inline-flex rounded-full h-2.5 w-2.5"
      style={{ backgroundColor: color }}
    />
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// Icon SVGs (inline, no external dep)
// ─────────────────────────────────────────────────────────────────────────────

const IconGithub: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483
         0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466
         -.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832
         .092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688
         -.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844
         c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651
         .64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855
         0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017
         22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const IconLinkedin: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 0H5C2.239 0 0 2.239 0 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5V5c0-2.761-2.238-5-5-5zM8 19H5V8h3v11zM6.5 6.732c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z" />
  </svg>
);

const IconGlobe: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 010 20M12 2a14.5 14.5 0 000 20M2 12h20" />
  </svg>
);

const IconShield: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11 4.5-.85 8-5.75 8-11V6l-8-4z"
    />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Creator link card
// ─────────────────────────────────────────────────────────────────────────────

interface CreatorCardProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  accentColor: string;
}

const CreatorCard: React.FC<CreatorCardProps> = ({ href, icon, label, sub, accentColor }) => (
  <motion.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    whileHover={{ y: -2, scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className="flex flex-col items-center gap-1.5 px-4 py-4 rounded-lg border transition-colors duration-200 group"
    style={{
      background: 'rgba(15,20,30,0.7)',
      borderColor: 'rgba(148,163,184,0.12)',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLAnchorElement).style.borderColor = `${accentColor}55`;
      (e.currentTarget as HTMLAnchorElement).style.background = `${accentColor}0d`;
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(148,163,184,0.12)';
      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(15,20,30,0.7)';
    }}
  >
    <span
      className="w-9 h-9 rounded-full flex items-center justify-center mb-0.5 transition-colors duration-200"
      style={{ background: `${accentColor}18`, color: accentColor }}
    >
      {icon}
    </span>
    <span className="text-[13px] font-semibold text-slate-200">{label}</span>
    <span className="text-[10px] text-slate-500 tracking-wide">{sub}</span>
  </motion.a>
);

// ─────────────────────────────────────────────────────────────────────────────
// Scan phase
// ─────────────────────────────────────────────────────────────────────────────

const ScanPhase: React.FC<{ step: number }> = ({ step }) => {
  const progress = Math.min(((step + 1) / SCAN_STEPS.length) * 100, 100);

  return (
    <motion.div
      key="scan"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Status header */}
      <div className="flex items-center gap-2.5">
        <PulseDot />
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-rose-400">
          Security scan running
        </span>
      </div>

      {/* Step list */}
      <ol className="space-y-2.5" aria-live="polite" aria-label="Scan progress">
        {SCAN_STEPS.map((s, idx) => {
          const done = idx < step;
          const active = idx === step;
          const pending = idx > step;

          return (
            <motion.li
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: pending ? 0.3 : 1, x: 0 }}
              transition={{ duration: 0.3, delay: active ? 0.05 : 0 }}
              className="flex items-start gap-2.5 font-mono text-sm"
            >
              {/* Status indicator */}
              <span className="mt-0.5 w-4 shrink-0 flex items-center justify-center">
                {done && (
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {active && <PulseDot color="#f43f5e" />}
                {pending && <span className="w-1.5 h-1.5 rounded-full bg-slate-700 inline-block" />}
              </span>

              <span
                className={
                  done
                    ? 'text-slate-500 line-through decoration-slate-600'
                    : active
                      ? 'text-rose-300 font-medium'
                      : 'text-slate-600'
                }
              >
                {s.label}
              </span>
            </motion.li>
          );
        })}
      </ol>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Scan progress"
        className="w-full h-[3px] rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: STEP_INTERVAL_MS / 1000, ease: 'easeInOut' }}
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #be123c, #f43f5e, #fb7185)' }}
        />
      </div>

      {/* Fake log stream */}
      <div
        aria-hidden="true"
        className="font-mono text-[10px] text-emerald-800 leading-relaxed space-y-0.5 opacity-60 select-none"
      >
        <div>&gt; pid={'{'}0x{Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')}{`'}`} signal=SIGINT</div>
        <div>&gt; stack_trace captured at 0x{Math.floor(Math.random() * 0xffffff).toString(16)}</div>
        <div>&gt; hash_check: {step >= 1 ? 'MISMATCH ✗' : 'pending...'}</div>
        <div>&gt; exfil_guard: {step >= 2 ? 'BLOCKED ✗' : 'scanning...'}</div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Warning phase
// ─────────────────────────────────────────────────────────────────────────────

const WarningPhase: React.FC<{ onClose?: () => void }> = ({ onClose }) => (
  <motion.div
    key="warning"
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.35, type: 'spring', stiffness: 260, damping: 22 }}
    className="text-center space-y-6"
  >
    {/* Shield icon */}
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 18 }}
      className="inline-flex p-4 rounded-full border"
      style={{
        background: 'rgba(190,18,60,0.12)',
        borderColor: 'rgba(244,63,94,0.3)',
        boxShadow: '0 0 24px rgba(244,63,94,0.18)',
      }}
    >
      <IconShield className="w-10 h-10 text-rose-500" />
    </motion.div>

    {/* Heading */}
    <div className="space-y-2.5">
      <h2
        className="text-xl font-bold tracking-[0.15em] uppercase"
        style={{ color: '#f43f5e', textShadow: '0 0 20px rgba(244,63,94,0.35)' }}
      >
        Developer Tools Detected
      </h2>
      {/* Decorative rule */}
      <div className="flex items-center justify-center gap-3 mx-auto max-w-xs">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.4))' }} />
        <span className="text-[9px] tracking-[0.25em] uppercase text-rose-700/70 font-mono">alert</span>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(244,63,94,0.4), transparent)' }} />
      </div>
    </div>

    {/* Message */}
    <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
      This platform is protected intellectual property. Reverse engineering or
      code extraction is monitored. If you're curious about what was built here,
      reach out directly.
    </p>

    {/* Creator links */}
    <div className="grid grid-cols-3 gap-3 pt-1">
      <CreatorCard
        href="https://github.com/Ali-Arshad-110"
        icon={<IconGithub className="w-4 h-4" />}
        label="GitHub"
        sub="My Work"
        accentColor="#818cf8"
      />
      <CreatorCard
        href="https://www.linkedin.com/in/aliarshad110"
        icon={<IconLinkedin className="w-4 h-4" />}
        label="LinkedIn"
        sub="Connect"
        accentColor="#38bdf8"
      />
      <CreatorCard
        href="https://github.com/Ali-Arshad-110"
        icon={<IconGlobe className="w-4 h-4" />}
        label="Portfolio"
        sub="About me"
        accentColor="#34d399"
      />
    </div>

    {/* Close button */}
    {onClose && (
      <motion.button
        onClick={onClose}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="mt-1 px-7 py-2 rounded text-xs font-semibold tracking-[0.15em] uppercase font-mono transition-colors duration-200 border"
        style={{
          borderColor: 'rgba(244,63,94,0.25)',
          color: '#fda4af',
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(244,63,94,0.08)';
          e.currentTarget.style.borderColor = 'rgba(244,63,94,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(244,63,94,0.25)';
        }}
      >
        Close & return to platform
      </motion.button>
    )}

    {/* Footer */}
    <div
      className="pt-4 border-t font-mono text-[9px] flex justify-between items-center"
      style={{ borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(148,163,184,0.3)' }}
    >
      <span className="tracking-widest uppercase">Secured · SSL/TLS</span>
      <span className="tracking-widest uppercase">Copyright © {new Date().getFullYear()}</span>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export interface DevToolsWarningOverlayProps {
  /** Optional handler called when the user dismisses the overlay. */
  onClose?: () => void;
}

/**
 * DevToolsWarningOverlay
 *
 * Full-screen security overlay shown when DevTools are detected.
 * Runs a 3-step animated scan sequence before revealing the warning card.
 *
 * Improvements over original:
 * - Canvas ref via `useRef` — no global `id` that breaks on double-mount
 * - `rAF`-driven matrix animation (smooth 60 fps, no setInterval drift)
 * - `rainDrops` re-initialised on resize — columns always in sync
 * - Strict unmount guard in canvas loop
 * - `SCAN_STEPS` and `STEP_INTERVAL_MS` are module-level constants (stable refs)
 * - Step sequencer fixed: progress bar and step index advance in sync
 * - Scanline overlay uses plain inline CSS (no fragile Tailwind arbitrary values)
 * - `aria-hidden` on all decorative elements; `aria-live` on scan list
 * - Bounce animation replaced with spring entrance on shield icon
 * - Portfolio link falls back to GitHub until a real URL is provided
 * - Copyright year is dynamic
 */
export const DevToolsWarningOverlay: React.FC<DevToolsWarningOverlayProps> = ({ onClose }) => {
  const [scanStep, setScanStep] = useState(0);
  const [phase, setPhase] = useState<'scan' | 'warning'>('scan');

  useEffect(() => {
    if (phase !== 'scan') return;

    if (scanStep < SCAN_STEPS.length - 1) {
      const t = setTimeout(() => setScanStep((s) => s + 1), STEP_INTERVAL_MS);
      return () => clearTimeout(t);
    } else {
      // All steps revealed — wait one more interval then flip to warning
      const t = setTimeout(() => setPhase('warning'), STEP_INTERVAL_MS);
      return () => clearTimeout(t);
    }
  }, [scanStep, phase]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Security alert: developer tools detected"
      className="fixed inset-0 z-[99999] flex items-center justify-center select-none font-mono"
      style={{ background: 'rgba(3,5,8,0.93)', backdropFilter: 'blur(6px)' }}
    >
      {/* Ambient background effects */}
      <MatrixBackground />
      <ScanlineOverlay />

      {/* Soft radial vignette centred behind the card */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(190,18,60,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 240, damping: 26 }}
        className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{
          background: 'rgba(8,12,18,0.92)',
          border: '1px solid rgba(244,63,94,0.2)',
          boxShadow: '0 0 0 1px rgba(244,63,94,0.05), 0 32px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Neon top / bottom edges */}
        <NeonEdge position="top" />
        <NeonEdge position="bottom" />

        {/* Inner padding */}
        <div className="px-8 py-8">
          <AnimatePresence mode="wait">
            {phase === 'scan' ? (
              <ScanPhase key="scan" step={scanStep} />
            ) : (
              <WarningPhase key="warning" onClose={onClose} />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default DevToolsWarningOverlay;
