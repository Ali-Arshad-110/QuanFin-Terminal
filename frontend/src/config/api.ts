/**
 * Central API configuration.
 *
 * In development:  Uses empty string for API_BASE (Vite proxy)
 *                  and direct ws://127.0.0.1:8000 for WS_BASE.
 *
 * In production:   Falls back automatically to Render production URLs
 *                  if VITE_API_URL is not set.
 */

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const rawUrl = import.meta.env.VITE_API_URL || 
  (isLocal ? '' : 'https://quanfin-terminal-backend.onrender.com');

// Strip trailing slash so callers can always do `${API_BASE}/api/v1/...`
export const API_BASE = rawUrl.replace(/\/$/, '');

/**
 * WebSocket base URL — replaces http(s) with ws(s).
 */
export const WS_BASE = API_BASE
  ? API_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws')
  : (isLocal ? 'ws://127.0.0.1:8000' : 'wss://quanfin-terminal-backend.onrender.com');
