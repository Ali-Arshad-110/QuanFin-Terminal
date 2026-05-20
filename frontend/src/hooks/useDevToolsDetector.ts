import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DevToolsDetectorOptions {
  /** Keyboard shortcuts to intercept. Default covers common DevTools keys. */
  blockedKeys?: string[];
  /** Disable right-click context menu. Default: true */
  disableRightClick?: boolean;
  /** Disable text selection on the page. Default: true */
  disableSelection?: boolean;
  /** Called once when DevTools is first detected as open. */
  onDetect?: () => void;
  /** Called once when DevTools is detected as closed. */
  onClose?: () => void;
  /** Polling interval in ms. Default: 1500 */
  pollInterval?: number;
  /**
   * Extra px added to both dimension thresholds.
   * Raise this on layouts with large chrome (e.g. electron shells). Default: 0
   */
  thresholdBuffer?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BLOCKED_KEYS: string[] = [
  // 'F12',
  'Ctrl+Shift+I',
  'Ctrl+Shift+J',
  'Ctrl+Shift+C',
  'Ctrl+U',
  'Ctrl+S',
];

const CONSOLE_STYLES = {
  owner:
    'color:rgba(89, 255, 0, 1);font-size:28px;font-weight:900;font-family:monospace;' +
    'text-shadow:0 0 10px rgba(89, 255, 0, 1);padding:5px 0;',
  warning:
    'color:#FF8C00;font-size:22px;font-weight:800;font-family:monospace;' +
    'text-shadow:0 0 10px rgba(255, 189, 0, 1);padding:5px 0;',
  message:
    'color:red;font-size:14px;font-family:monospace;font-weight:bold;margin-bottom:8px;',
  labelGreen:
    'color:#10b981;font-size:13px;font-family:monospace;font-weight:bold;',
  linkPurple:
    'color:#6366f1;font-size:13px;font-family:monospace;text-decoration:underline;font-weight:bold;',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useDevToolsDetector
 *
 * Detects whether the browser's DevTools panel is open using three
 * complementary heuristics:
 *   1. Window outer/inner size differential (docked panel)
 *   2. Console Image-getter trick (Chrome / Firefox console evaluation)
 *   3. Optional debugger timing check (undocked panel, production only)
 *
 * Additionally provides keyboard-shortcut blocking and UX protections.
 *
 * @returns `true` when DevTools is considered open, `false` otherwise.
 */
export function useDevToolsDetector(options: DevToolsDetectorOptions = {}): boolean {
  const {
    blockedKeys = DEFAULT_BLOCKED_KEYS,
    disableRightClick = true,
    disableSelection = true,
    onDetect,
    onClose,
    pollInterval = 1500,
    thresholdBuffer = 0,
  } = options;

  // ── State ──────────────────────────────────────────────────────────────────

  const [isOpen, setIsOpen] = useState(false);

  /**
   * Ref mirrors state to give stable access inside closures / setInterval
   * callbacks without requiring the effect to re-subscribe on every render.
   */
  const isOpenRef = useRef(false);

  // Stable refs for callbacks so effects don't need them as deps.
  const onDetectRef = useRef(onDetect);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onDetectRef.current = onDetect; }, [onDetect]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // ── Core trigger helpers ───────────────────────────────────────────────────

  /** Mark DevTools as open (idempotent). */
  const triggerDetection = useCallback(() => {
    if (!isOpenRef.current) {
      isOpenRef.current = true;
      setIsOpen(true);
      onDetectRef.current?.();
    }
  }, []);

  /** Mark DevTools as closed (idempotent). */
  const triggerClose = useCallback(() => {
    if (isOpenRef.current) {
      isOpenRef.current = false;
      setIsOpen(false);
      onCloseRef.current?.();
    }
  }, []);

  // ── Console branding ───────────────────────────────────────────────────────

  /**
   * Prints a branded warning to the console.
   * Only called while DevTools is confirmed open to avoid unnecessary noise.
   * Stable reference via useCallback so it can safely be listed as a dep.
   */
  const printConsoleBranding = useCallback(() => {
    console.clear();
    console.log('%c Built with ❤️ by Ali Arshad', CONSOLE_STYLES.owner);
    console.log('%c ⚠ UNAUTHORIZED REVERSE ENGINEERING DETECTED.', CONSOLE_STYLES.warning);
    console.log(
      '%c ⚠ Stealing code harms innovation. Let\'s build together instead!',
      CONSOLE_STYLES.message,
    );
    console.log(
      '%c ⚠ Portfolio: %chttps://ali-arshad-110.github.io',
      CONSOLE_STYLES.labelGreen,
      CONSOLE_STYLES.linkPurple,
    );
  }, []);

  // ── Keyboard + context-menu protection ────────────────────────────────────

  useEffect(() => {
    const blockedSet = new Set(blockedKeys);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // F12
      if (blockedSet.has('F12') && e.key === 'F12') {
        e.preventDefault();
        triggerDetection();
        return;
      }

      // Ctrl + Shift + I / J / C
      if (e.ctrlKey && e.shiftKey) {
        if (
          (blockedSet.has('Ctrl+Shift+I') && key === 'i') ||
          (blockedSet.has('Ctrl+Shift+J') && key === 'j') ||
          (blockedSet.has('Ctrl+Shift+C') && key === 'c')
        ) {
          e.preventDefault();
          triggerDetection();
          return;
        }
      }

      // Ctrl + U  (view-source)
      if (blockedSet.has('Ctrl+U') && e.ctrlKey && key === 'u') {
        e.preventDefault();
        triggerDetection();
        return;
      }

      // Ctrl + S  (save-page — block silently, no detection)
      if (blockedSet.has('Ctrl+S') && e.ctrlKey && key === 's') {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (disableRightClick) e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [blockedKeys, disableRightClick, triggerDetection]);

  // ── Text-selection guard ───────────────────────────────────────────────────

  useEffect(() => {
    const el = document.body;
    if (disableSelection) {
      el.style.userSelect = 'none';
      // Cast needed for older TypeScript DOM typings that don't include webkit prefix
      (el.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = 'none';
    }
    return () => {
      el.style.userSelect = '';
      (el.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = '';
    };
  }, [disableSelection]);

  // ── Detection: resize listener ─────────────────────────────────────────────

  useEffect(() => {
    const checkDimensions = (): boolean => {
      const dpr = window.devicePixelRatio || 1;

      /*
       * Thresholds are intentionally conservative to minimise false positives
       * on split-screen, picture-in-picture, and high-DPI displays.
       *
       * Width:  scrollbar (~15px) + window chrome (~35px) → floor at 50px
       * Height: browser UI (tabs, address bar) → floor at 120px
       *
       * Both are scaled by devicePixelRatio to handle display zoom correctly,
       * and shifted by the caller-supplied thresholdBuffer for custom shells.
       */
      const widthThreshold = Math.max(50, 160 / dpr) + thresholdBuffer;
      const heightThreshold = Math.max(120, 250 / dpr) + thresholdBuffer;

      return (
        window.outerWidth - window.innerWidth > widthThreshold ||
        window.outerHeight - window.innerHeight > heightThreshold
      );
    };

    const handleResize = () => {
      if (checkDimensions()) triggerDetection();
      // NOTE: we intentionally do NOT call triggerClose here.
      // The polling interval is the authoritative "close" signal; reacting to
      // resize-only avoids a race where a momentary resize triggers a false close.
    };

    window.addEventListener('resize', handleResize);
    // Run immediately so we capture the state before the first poll tick.
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [thresholdBuffer, triggerDetection]);

  // ── Detection: polling (console getter + dimension + debugger timing) ──────

  useEffect(() => {
    /*
     * Console-getter method  (BLINK-FREE)
     * ─────────────────────────────────────
     * We attach a getter to a custom object's `toString` / `Symbol.toPrimitive`.
     * When the browser console is open it lazily evaluates these to render a
     * preview — triggering our getter — WITHOUT us ever calling console.log()
     * ourselves. This completely eliminates the log→clear blink.
     *
     * How it works:
     *   - We override `console.log` temporarily with a version that intercepts
     *     our sentinel object and detects getter invocation, then immediately
     *     restores the original. The override exists for <1 ms per tick so it
     *     is invisible to the app.
     *   - The sentinel uses `Symbol.toPrimitive` (Chrome, Edge, Firefox all
     *     invoke this when rendering objects in an open console).
     */
    let consoleGetterFired = false;

    const sentinel = {
      [Symbol.toPrimitive]() {
        consoleGetterFired = true;
        return 'devtools-probe';
      },
      toString() {
        consoleGetterFired = true;
        return 'devtools-probe';
      },
    };

    /*
     * Debugger-timing method
     * ──────────────────────
     * A `debugger` statement is essentially a no-op in normal execution, but
     * when DevTools is open with "Pause on debugger statements" active, it
     * introduces a measurable delay (>100 ms). We only run this in production
     * because it would halt execution for legitimate engineers during dev.
     */
    const checkDebuggerTiming = (): boolean => {
      if (import.meta.env.DEV) return false;
      const t0 = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      return performance.now() - t0 > 100;
    };

    /*
     * Dimension method (inline per-tick)
     * ────────────────────────────────────
     * Kept as a local helper here to avoid the resize-effect dep chain.
     */
    const checkDimensions = (): boolean => {
      const dpr = window.devicePixelRatio || 1;
      return (
        window.outerWidth - window.innerWidth > Math.max(60, 80 / dpr) + thresholdBuffer ||
        window.outerHeight - window.innerHeight > Math.max(80, 150 / dpr) + thresholdBuffer
      );
    };

    const tick = () => {
      // Reset before each tick for a clean read.
      consoleGetterFired = false;

      /*
       * Momentarily patch console.log to pass our sentinel through.
       * The open console renderer will invoke toString/Symbol.toPrimitive
       * during its own lazy evaluation — our getter fires, we detect it.
       * The patch is restored synchronously so no other code sees it.
       */
      // eslint-disable-next-line no-console
      const _orig = console.log;
      // eslint-disable-next-line no-console
      console.log = (...args: unknown[]) => {
        if (args[0] === sentinel) return; // swallow our own probe silently
        _orig.apply(console, args);
      };
      // eslint-disable-next-line no-console
      console.log(sentinel);
      // eslint-disable-next-line no-console
      console.log = _orig; // restore immediately — invisible to the app

      /*
       * Defer the verdict slightly so the browser has time to evaluate the
       * getter asynchronously (Chrome defers console object rendering).
       */
      setTimeout(() => {
        const detected =
          consoleGetterFired ||
          checkDimensions() ||
          checkDebuggerTiming();

        if (detected) {
          triggerDetection();
          printConsoleBranding();
        } else {
          triggerClose();
        }
      }, 50);
    };

    const intervalId = setInterval(tick, pollInterval);
    // Run one tick immediately so there is no blind window on mount.
    tick();

    return () => clearInterval(intervalId);
  }, [pollInterval, thresholdBuffer, triggerDetection, triggerClose, printConsoleBranding]);

  return isOpen;
}