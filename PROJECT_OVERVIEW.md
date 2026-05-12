# QuanFin Capital Terminal - Project Overview

## Project Summary
**QuanFin Capital Terminal** is a high-performance **Analytical Trading Terminal** designed for the Indian stock market. It's a full-stack web application combining a React TypeScript frontend with a Python FastAPI backend, integrated with Kotak Securities broker API for real-time market data and order execution.

---

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Python 3 + FastAPI + Uvicorn
- **Styling**: Tailwind CSS + custom theme system
- **Real-time Data**: WebSocket (FastAPI + NeoAPI client)
- **Charting**: Lightweight Charts library
- **State Management**: Zustand
- **Broker Integration**: Kotak Securities Neo API

### Project Structure
```
QuanFin_Terminal/
├── backend/                  # Python FastAPI Server
│   ├── app/
│   │   ├── main.py          # FastAPI app, routes, CORS
│   │   ├── processing/
│   │   │   ├── engine.py    # MarketDataService, TechnicalAnalysisEngine
│   │   │   └── candle_builder.py # Real-time candle construction
│   │   └── execution/
│   │       ├── kotak_service.py  # Kotak Securities API wrapper
│   │       ├── market_data_stream.py # WebSocket streaming
│   │       ├── order_manager.py  # Order placement (stub)
│   │       └── __init__.py
│   ├── requirements.txt      # Dependencies
│   └── run_server.py         # Server launcher
│
├── frontend/                 # React TypeScript App
│   ├── src/
│   │   ├── App.tsx          # Main app component
│   │   ├── store.ts         # Zustand state management
│   │   ├── components/      # UI Components (Dashboard, Charts, etc)
│   │   ├── config/          # API configuration
│   │   ├── data/            # Static data (Stock Universe, domains)
│   │   ├── theme/           # Theme configuration
│   │   ├── utils/           # Indicators calculation
│   │   └── index.css        # Global styles
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── Lib/site-packages/       # Local Python dependencies
├── run_backend.bat          # Windows batch script to run backend
├── run_frontend.bat         # Windows batch script to run frontend
└── start_server_robust.bat  # Robust server startup script
```

---

## Backend Architecture

### Main Entry Point: `backend/app/main.py`
- **FastAPI Application** with:
  - CORS middleware configured for localhost:3000 and localhost:5173
  - RESTful API endpoints for market data, quotes, indices, sectors
  - WebSocket endpoint for real-time candle updates
  - Broker login integration (2-step TOTP + MPIN)

### Core Services

#### 1. **KotakService** (`backend/app/execution/kotak_service.py`)
Wrapper around Kotak Securities Neo API:
- **Authentication**: 
  - `login_step1()`: TOTP validation
  - `login_step2()`: MPIN validation
  - Returns `view_token`, `sid_view`, `trade_token`, `sid_trade`
  
- **Market Data APIs**:
  - `get_quotes()`: REST API to fetch live quotes for symbols
  - `get_historical_data()`: Fetch OHLCV data for charts
  - `get_instrument_token()`: Resolve UI symbols to Kotak tokens
  
- **Portfolio APIs**:
  - `get_holdings()`: Fetch holdings from Kotak
  - `get_positions()`: Fetch intraday positions
  - `get_funds()`: Fetch account balance/margins
  
- **HTTP Helper**: `_make_request()` uses `urllib` instead of `requests` library

#### 2. **MarketDataService** (`backend/app/processing/engine.py`)
Fallback data provider when broker is not logged in:
- Uses Yahoo Finance API v8 (`https://query1.finance.yahoo.com/v8/finance/chart/`)
- `fetch_data()`: Fetch OHLCV for any ticker
- `fetch_quotes()`: Batch quote fetching
- `fetch_indices()`: Index data fetching
- Cached with `@lru_cache(maxsize=128)`

#### 3. **TechnicalAnalysisEngine** (`backend/app/processing/engine.py`)
Calculates technical indicators on raw data:
- **RSI (14)**: Relative Strength Index with Wilder's smoothing
- **MACD (12, 26, 9)**: MACD line, signal line, histogram
- **VWAP**: Volume Weighted Average Price

#### 4. **CandleBuilder** (`backend/app/processing/candle_builder.py`)
Real-time candle construction from WebSocket ticks:
- 1-minute candles by default
- Updates OHLCV for each tick received
- Broadcasts closed candles to all connected WebSocket clients

#### 5. **MarketDataStream** (`backend/app/execution/market_data_stream.py`)
WebSocket connection manager:
- Runs in background thread
- Monitors `KotakService.is_logged_in` flag
- Initializes NeoAPI WebSocket callbacks when broker logs in
- `subscribe()`: Subscribe to instrument tokens
- Translates NeoAPI tick format to CandleBuilder format

### API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/broker/login-step1` | TOTP login |
| POST | `/api/v1/broker/login-step2` | MPIN validation |
| GET | `/api/v1/broker/holdings` | Get holdings |
| GET | `/api/v1/broker/positions` | Get positions |
| GET | `/api/v1/broker/funds` | Get account balance |
| POST | `/api/v1/quotes` | Get quotes (batch) |
| GET | `/api/v1/quote/{ticker}` | Get single quote |
| GET | `/api/v1/indices` | Get major indices |
| GET | `/api/v1/sectors` | Get sector heatmap data |
| GET | `/api/v1/index/{symbol}/constituents` | Get index/sector stocks |
| GET | `/api/v1/stock/{symbol}/details` | Get detailed stock profile |
| GET | `/api/v1/volume/{ticker}` | Get volume analysis |
| GET | `/api/v1/analyze/{ticker}` | Get analysis with indicators |
| WS | `/ws/universe` | Real-time candle stream |

---

## Frontend Architecture

### State Management: Zustand Store (`src/store.ts`)
```typescript
MarketState {
  ticker: string              // Current chart ticker
  interval: string            // Chart interval (5m, 1h, etc)
  marketStats: MarketStats    // OHLCV data
  selectedIndex: string       // Selected index for detail panel
  indexConstituents: Map      // Cached constituent data
  selectedStock: string       // Selected stock for detail panel
  isBrokerConnected: boolean  // Broker login status
  isBrokerModalOpen: boolean  // Login modal visibility
}
```

### Main Components

#### Page Components
1. **Dashboard** (`Dashboard.tsx`): Main trading view
   - Indices ticker bar
   - Stock search with Stock Universe (2,132+ stocks) autocomplete
   - Chart component with interval selector
   - Sector heatmap
   - Indices scanner
   - Watchlist

2. **Analyzer** (`Analyzer.tsx`): Technical analysis view
   - Multi-timeframe charts
   - Indicator overlays (RSI, MACD, VWAP)

3. **Portfolio** (`Portfolio.tsx`): Portfolio management
   - Holdings, positions, funds
   - P&L tracking

#### Reusable Components
- **ChartComponent**: Lightweight Charts wrapper for candlestick charts
- **ChartToolbar**: Interval selector, indicator toggles
- **HeatMap**: Sector performance heatmap visualization
- **AdvanceHeatMap**: Enhanced heatmap with filtering
- **IndicesBar**: Live indices ticker (NIFTY 50, BANK NIFTY, SENSEX)
- **IndicesScanner**: Sector & index constituent scanner
- **Watchlist**: Saved symbols tracking
- **BrokerLoginModal**: 2-step login modal (TOTP + MPIN)
- **IndexDetailPanel**: Slides in when index is selected
- **StockDetailPanel**: Slides in when stock is selected
- **ErrorBoundary**: Error handling wrapper

### Theme System (`src/theme/`)
- **ThemeProvider**: Context provider for dark/light themes
- **theme.config.ts**: Color palettes and theme variables
- **ThemeSelector**: Component to switch themes

### API Integration (`src/config/liveData.ts`)
Axios instance configured for:
- Base URL: `http://localhost:8000/api/v1`
- JSON content type
- Error handling

---

## Data Flow

### Real-time Chart Updates (WebSocket)
```
1. User selects ticker (Dashboard)
2. Frontend requests quotes via `/api/v1/quotes`
3. Frontend opens WebSocket connection to `/ws/universe`
4. User subscribes to symbol via `/api/v1/subscribe`
5. Backend resolves symbol to Kotak token
6. Backend subscribes token to NeoAPI WebSocket
7. Kotak WS sends ticks in real-time
8. CandleBuilder constructs 1-min candles from ticks
9. Candles broadcast to all connected clients via WebSocket
10. ChartComponent updates chart with new candles
```

### Quote Fetching (Priority Fallback)
```
1. Frontend requests quotes for symbols
2. Backend tries Kotak API (if logged in)
3. If Kotak fails, fallback to Yahoo Finance API
4. Returns standardized quote object with price, change%, volume
```

### Index/Sector Data
```
1. Dashboard requests `/api/v1/sectors`
2. Backend fetches index tickers (Nifty 50, Metal, Banking, etc)
3. Uses Yahoo Finance to get current vs previous close
4. Calculates change percent
5. Returns to HeatMap component
```

### Constituent Data
```
1. User clicks index/sector in heatmap
2. Frontend calls `/api/v1/index/{symbol}/constituents`
3. Backend determines stock list for index
4. Fetches 1-year historical data from Yahoo
5. Calculates 52W high/low, change%, etc
6. Returns constituent list to IndexDetailPanel
```

---

## Key Features

### Implemented ✅
1. **Multi-timeframe charting** with Lightweight Charts
2. **Technical indicators** (RSI, MACD, VWAP)
3. **Sector heatmap** with live data
4. **Index scanner** with constituent breakdown
5. **Broker authentication** (2-step login)
6. **Portfolio management** (holdings, positions, funds)
7. **Stock detail panel** with profile, financials, shareholding
8. **Watchlist functionality**
9. **Theme system** (dark/light)
10. **Error boundaries** and graceful fallback

### Planned/Stub Features
1. **Order placement** (OrderManager has stub implementation)
2. **Real-time WebSocket** updates (wired up but needs NeoAPI testing)
3. **Advanced volume analysis** (partially implemented with estimates)
4. **Delivery volume tracking** (using heuristic estimates since NSE doesn't provide via API)

---

## Configuration & Setup

### Backend Setup
1. Dependencies: `backend/requirements.txt`
   - `neo_api_client`: Kotak API wrapper
   - `fastapi`, `uvicorn`: Web framework
   - `yfinance`: Yahoo Finance data fallback
   - `pandas`, `websockets`, `pydantic`: Supporting libs

2. Run: `python backend/run_server.py`
   - Starts Uvicorn on `127.0.0.1:8000`
   - Enables CORS for frontend dev servers

### Frontend Setup
1. Dependencies: `frontend/package.json`
2. Run: `npm run dev` in `frontend/` folder
   - Starts Vite dev server on `http://localhost:5173` (or :3000)

### Environment Variables (Optional)
- `.env` can be added for Kotak credentials (not required, taken from frontend)

---

## Database/Storage
- **No persistent database** currently
- Market data is fetched on-demand from Kotak/Yahoo
- Holdings/positions fetched from broker in real-time
- Frontend state is ephemeral (Zustand in memory)

---

## Security Considerations
1. **Authentication**: Only TOTP + MPIN, no persistent session storage
2. **API Keys**: Passed from frontend to backend (not stored server-side)
3. **CORS**: Restricted to localhost (ports 3000, 5173)
4. **WebSocket**: No authentication check (assumes local network only)

---

## Development Notes

### Common Issues & Solutions

1. **"Import NeoAPI Failed"**
   - NeoAPI might not be installed in local `Lib/site-packages`
   - Backend has graceful fallback, but market data won't stream real-time

2. **WebSocket Connection Not Established**
   - Requires successful broker login first
   - Check `MarketDataStream._monitor_connection()` waits for `kotak_service.is_logged_in`

3. **Sector Stocks Showing as Unrelated**
   - Fixed with explicit `SECTOR_DATA` dict and fallback logic
   - See `/api/v1/index/{symbol}/constituents` for mapping logic

4. **Yahoo Finance Rate Limiting**
   - Some requests might fail with 429 errors
   - Backend retries are not implemented; could add with `tenacity`

---

## Future Enhancements

1. **Database**: Add PostgreSQL for user preferences, watchlists, trade history
2. **Authentication**: Implement JWT for backend, persistent login
3. **Advanced Orders**: Bracket orders, trailing stops, OCO orders
4. **Risk Management**: Position sizing, drawdown alerts, portfolio Greeks
5. **Social Features**: Public watchlists, commentary feeds
6. **Mobile App**: React Native version
7. **Backtesting**: Historical strategy simulation engine
8. **Live Alerts**: Email/SMS notifications for price targets, volume spikes

---

## Testing
- Manual testing via UI (no automated test suite currently)
- Backend can be tested via curl/Postman:
  ```bash
  curl http://127.0.0.1:8000/api/v1/quote/RELIANCE.NS
  curl http://127.0.0.1:8000/api/v1/sectors
  curl -X POST http://127.0.0.1:8000/api/v1/quotes -d '{"symbols":["RELIANCE.NS"]}'
  ```

---

## Performance Notes
- **Chart rendering**: Lightweight Charts library is optimized for large datasets
- **API caching**: `MarketDataService` uses `@lru_cache` for Yahoo API calls
- **WebSocket batching**: Candles are batched to reduce broadcast frequency (could be tuned)
- **Frontend state**: Zustand store is lightweight and efficient

---

## Contributors & Deployment
- **Developed**: 2026
- **Deployment**: Ready for local testing; production requires:
  - HTTPS for frontend/backend
  - Environment-based API base URL
  - Database setup
  - Session management
  - Load balancing for WebSocket

---

## Conclusion
QuanFin Capital Terminal is a **feature-rich, modern trading platform** with a clean architecture. The backend cleanly separates concerns (KotakService, MarketDataService, CandleBuilder, TechnicalAnalysisEngine), while the frontend uses modern React patterns with Zustand for state management. The integration with Kotak Securities provides real-time market data and order execution, making it a powerful tool for Indian market traders.
