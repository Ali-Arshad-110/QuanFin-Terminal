/**
 * Central API configuration.
 *
 * In development:  VITE_API_URL is not set → falls back to '' (empty string).
 *                  Vite's dev-server proxy in vite.config.ts forwards /api → localhost:8000.
 *
 * In production:   VITE_API_URL = https://quanfin-terminal-backend.onrender.com
 *                  (set in Vercel project settings or .env.production)
 */

const rawUrl = import.meta.env.VITE_API_URL ?? '';

// Strip trailing slash so callers can always do `${API_BASE}/api/v1/...`
export const API_BASE = rawUrl.replace(/\/$/, '');

/**
 * WebSocket base URL — replaces http(s) with ws(s).
 * Dev:  '' → uses relative /ws path through Vite proxy.
 * Prod: wss://quanfin-terminal-backend.onrender.com
 */
export const WS_BASE = API_BASE
  ? API_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws')
  : '';
