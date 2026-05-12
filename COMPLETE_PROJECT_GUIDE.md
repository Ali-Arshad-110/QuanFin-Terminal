# QuanFin Terminal - Complete Project Overview

## 🎯 Project Summary

**QuanFin Capital Terminal** is a full-stack **Analytical Trading Terminal** for the Indian stock market. It combines a modern React/TypeScript frontend with a Python FastAPI backend, integrated with Kotak Securities broker API for real-time market data and order execution.

**Status**: ✅ **FULLY FUNCTIONAL** - Charts rendering, technical indicators working, broker integration operational

---

## 📋 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (postcss, autoprefixer)
- **Charting**: Lightweight Charts v4.1
- **State Management**: Zustand v4.4
- **HTTP Client**: Axios v1.6
- **Icons**: Lucide React v0.292
- **WebSocket**: Browser native WebSocket API

### Backend
- **Framework**: FastAPI (Uvicorn ASGI server)
- **Language**: Python 3.14+
- **Data Processing**: NumPy, Pandas
- **Broker Integration**: Neo API Client (Kotak Securities)
- **WebSocket**: FastAPI WebSocket + threading
- **Data Source Fallback**: Yahoo Finance API v8
- **Key Dependencies**: 
  - neo_api_client >= 1.0.0
  - fastapi >= 0.68.0
  - uvicorn >= 0.15.0
  - yfinance >= 0.1.63
  - pandas >= 1.3.0
  - numpy >= 1.26.0

---

## 🏗️ Architecture Overview

```
QuanFin_Terminal/
├── backend/                          # Python FastAPI Server
│   ├── app/
│   │   ├── main.py                   # FastAPI app (70+ endpoints), CORS, WebSocket
│   │   ├── processing/
│   │   │   ├── engine.py             # MarketDataService, TechnicalAnalysisEngine
│   │   │   └── candle_builder.py     # Real-time 1-min candle construction
│   │   └── execution/
│   │       ├── kotak_service.py      # Kotak Securities Neo API wrapper
│   │       ├── market_data_stream.py # WebSocket manager + stream processor
│   │       ├── order_manager.py      # Order placement (stub)
│   │       └── __init__.py
│   ├── Lib/site-packages/            # Local Python dependencies (isolated env)
│   ├── requirements.txt
│   └── run_server.py
│
├── frontend/                         # React TypeScript App
│   ├── src/
│   │   ├── App.tsx                   # Main container, layout, modal management
│   │   ├── store.ts                  # Zustand market state management
│   │   ├── components/               # 21 React components:
│   │   │   ├── Dashboard.tsx         # Main trading view
│   │   │   ├── ChartComponent.tsx    # Lightweight Charts wrapper
│   │   │   ├── Analyzer.tsx          # Technical analysis view
│   │   │   ├── Header.tsx            # Top navigation
│   │   │   ├── BrokerLoginModal.tsx  # Kotak login form
│   │   │   ├── IndicesBar.tsx        # Live indices ticker
│   │   │   ├── HeatMap.tsx           # Sector heatmap visualization
│   │   │   ├── Watchlist.tsx         # Custom stock watchlist
│   │   │   ├── StockInfoModal.tsx    # Stock details popup
│   │   │   └── [15 more components]
│   │   ├── contexts/
│   │   │   └── WebSocketContext.tsx  # Real-time data context
│   │   ├── config/                   # API configuration
│   │   ├── data/                     # Static data (Stock Universe, domains)
│   │   ├── utils/
│   │   │   └── indicators.ts         # SMA, EMA calculations
│   │   ├── theme/                    # Theme system
│   │   ├── App.css, index.css        # Global styles
│   │   └── main.tsx, store.ts
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── Lib/site-packages/                # Isolated Python environment
├── run_backend.bat, run_frontend.bat # Windows batch launchers
└── Documentation files (README*.md, API_REFERENCE.md, etc)
```

---

## 🔧 Backend Architecture Deep Dive

### 1. **Main Application** (`backend/app/main.py` - 1159 lines)

**FastAPI Setup**:
- CORS enabled for localhost:3000, localhost:5173, and * (wildcard)
- Global logging with INFO level
- Uvicorn ASGI server

**Core Services Initialization**:
```python
kotak_service = KotakService()           # Broker API integration
market_data_service = MarketDataService() # Yahoo Finance fallback
ta_engine = TechnicalAnalysisEngine()     # Technical indicators
stream_service = MarketDataStream(...)    # Real-time WebSocket stream
manager = ConnectionManager()             # WebSocket connection pool
```

**API Endpoints (70+)** - Grouped by Category:

#### Broker Authentication
- `POST /api/v1/broker/login-step1` - TOTP validation
- `POST /api/v1/broker/login-step2` - MPIN validation

#### Portfolio Data (Requires Login)
- `GET /api/v1/broker/holdings` - Stock holdings
- `GET /api/v1/broker/positions` - Intraday positions
- `GET /api/v1/broker/funds` - Account balance & margins

#### Market Data
- `POST /api/v1/quotes` - Batch quote fetching
- `GET /api/v1/quote/{ticker}` - Single stock quote
- `GET /api/v1/analyze/{ticker}` - Chart data + technical indicators (RSI, MACD, VWAP)

#### Index & Sector Data
- `GET /api/v1/indices` - Major indices (NIFTY50, NIFTY100, etc)
- `GET /api/v1/sectors` - Sector heatmap data (13 sectors defined)
- `GET /api/v1/index/{symbol}/constituents` - Index/sector stocks
- `GET /api/v1/stock/{symbol}/details` - Stock profile
- `GET /api/v1/breadth/{index}` - Market breadth for Stock Universe (2,132+ stocks)

#### Real-Time Data
- `WS /ws/universe` - WebSocket for live candle updates
- `POST /api/v1/subscribe` - Subscribe to symbols

#### Order Execution
- `POST /api/v1/order` - Place order (stub)

### 2. **Market Data Service** (`backend/app/processing/engine.py` - 316 lines)

**Purpose**: Fetch and process market data from Yahoo Finance (fallback when broker unavailable)

**Key Methods**:

1. **`fetch_data(ticker, interval, period)`**
   - Calls Yahoo Finance v8 API (`https://query1.finance.yahoo.com/v8/finance/chart/`)
   - Returns list of dicts: `[{date, open, high, low, close, volume, timestamp}, ...]`
   - Handles interval mapping: 1m, 5m, 15m, 30m, 1h, 1d
   - Cached with `@lru_cache(maxsize=128)` for performance

2. **`fetch_quote(ticker)`**
   - Single stock quote with metadata
   - Previous close, market cap, P/E, dividend yield

3. **`fetch_quotes(tickers)` - Batch operation**
   - Multi-symbol quote fetching
   - Calculates change % automatically

4. **`fetch_indices(indices)`**
   - Index data (NIFTY50, SENSEX, etc)
   - Price, change, change %

### 3. **Technical Analysis Engine** (`backend/app/processing/engine.py`)

**Indicators Implemented**:

1. **RSI (Relative Strength Index)** - 14 period
   - Wilder's Smoothing methodology
   - Detects overbought (>70) & oversold (<30)

2. **MACD (Moving Average Convergence Divergence)** - 12, 26, 9
   - MACD line, Signal line, Histogram
   - Momentum indicator

3. **VWAP (Volume Weighted Average Price)**
   - Cumulative (Price × Volume) / Cumulative Volume
   - Institutional trading reference

**Data Format Output**:
```python
[
  {
    "date": "2025-02-05T14:30:00Z",
    "open": 2850.5,
    "high": 2865.3,
    "low": 2848.0,
    "close": 2862.4,
    "volume": 1250000,
    "rsi": 65.4,
    "macd": 12.3,
    "signal": 10.1,
    "histogram": 2.2,
    "vwap": 2857.8
  },
  ...
]
```

### 4. **Kotak Securities Integration** (`backend/app/execution/kotak_service.py` - 559 lines)

**Purpose**: Wrapper around Kotak Securities Neo API

**Authentication Flow**:

Step 1: `login_step1(mobile, ucc, totp, consumer_key)`
- Endpoint: `https://mis.kotaksecurities.com/login/1.0/tradeApiLogin`
- Validates TOTP (2-factor)
- Returns `view_token`, `sid_view`

Step 2: `login_step2(mpin)`
- Validates MPIN (merchant PIN)
- Returns `trade_token`, `sid_trade`
- Initializes NeoAPI client for WebSocket

**Market Data APIs**:
- `get_quotes(symbols)` - Live LTP, change, volume
- `get_historical_data(ticker, interval)` - OHLCV for charts
- `get_instrument_token(symbol)` - Maps symbol to token

**Portfolio APIs** (Post-Login):
- `get_holdings()` - Delivery holdings
- `get_positions()` - MTM positions
- `get_funds()` - Balance & margins

**Key Features**:
- Uses `urllib` instead of `requests` (dependency isolation)
- HTTP helper: `_make_request(method, url, headers, data)`
- Error handling with detailed logging
- NeoAPI client lazy-loaded after successful login

### 5. **Real-Time Data Stream** (`backend/app/execution/market_data_stream.py`)

**Purpose**: Manage WebSocket connection to Kotak for live ticks

**Components**:
- **MarketDataStream**: Main manager
- **Monitors** `kotak_service.is_logged_in` flag
- When logged in: Initializes NeoAPI WebSocket callbacks
- Re-subscribes to retained tokens on reconnect

**Callbacks**:
- `on_message()` - Process incoming tick
- `on_error()` - Error handling
- `on_close()` - Cleanup
- `on_open()` - Connection established

**Token Subscription**:
- Format: `"nse_cm|12345"` (exchange|token)
- Builds instrument list for WebSocket
- Maintains subscribed_tokens set

### 6. **Candle Builder** (`backend/app/processing/candle_builder.py` - 104 lines)

**Purpose**: Construct real-time 1-minute candles from tick data

**Candle Class**:
```python
class Candle:
    symbol: str
    token: str
    start_time: int          # Candle start timestamp
    interval_seconds: int    # Fixed to 60 (1-min)
    open, high, low, close: float
    volume: int
    is_closed: bool
    
    def update(price, volume):  # Called per tick
    def to_dict():              # Broadcast format
```

**Logic**:
1. Tick arrives with `ltp` (last traded price)
2. Determine candle bucket: `current_time // 60 * 60`
3. If bucket == existing candle: update OHLCV
4. If bucket changes: close previous candle, create new one
5. Broadcast updates to all connected WebSocket clients

---

## 💻 Frontend Architecture Deep Dive

### 1. **Main App** (`frontend/src/App.tsx`)

**Structure**:
```tsx
App
├── ThemeProvider (Dark theme context)
├── WebSocketProvider (Real-time data context)
└── Div.flex-col (Main layout)
    ├── Header (Navigation + Broker status)
    └── Main View Area
        ├── Dashboard (Default view)
        ├── Analyzer (Technical analysis)
        └── Portfolio (Holdings & positions)
    └── Modals
        ├── BrokerLoginModal (Global)
        └── Other modals (Stock info, etc)
```

**Key Props Drilled**:
- `currentView` - Active tab state
- `onNavigate` - Tab switching
- `isBrokerModalOpen` - Login modal visibility

### 2. **State Management** (`frontend/src/store.ts` - Zustand)

```typescript
interface MarketState {
    // Chart State
    ticker: string;              // Current symbol (e.g., "RELIANCE.NS")
    interval: string;            // Chart interval (5m, 1h, etc)
    marketStats: MarketStats;    // OHLCV for stats panel
    
    // Index/Sector State
    selectedIndex: string | null; // For detail panel
    indexConstituents: Map<string, ConstituentStock[]>;
    
    // Stock Detail State
    selectedStock: string | null;
    
    // Broker State
    isBrokerConnected: boolean;  // Login status
    isBrokerModalOpen: boolean;  // Modal visibility
    
    // Scanner State
    isScannerOpen: boolean;      // Scanner view visibility
}
```

**Usage**:
```tsx
const { ticker, setTicker, isBrokerConnected } = useMarketStore();
```

### 3. **Dashboard Component** (`frontend/src/components/Dashboard.tsx` - 210 lines)

**Layout**:
```
Dashboard
├── IndicesBar (Top ticker - NIFTY50, BANK NIFTY, etc)
├── Main Content (Flex row)
│   └── Left Column (300px)
│   │   ├── Watchlist (Flex-1, scrollable)
│   │   └── Order Entry (Fixed height)
│   │
│   └── Right Column (Flex-1)
│       └── ChartComponent (Full height)
└── Bottom (Optional panels)
    ├── Stock Info Modal (On click)
    └── Indices Scanner (On demand)
```

**Features**:
- Search box with autocomplete (Stock Universe 2,132+ stocks list)
- Max/minimize chart (300px sidebar toggle)
- Real-time indices update
- Order entry form stub (symbol, qty, price type)
- Watchlist with quick add/remove

### 4. **Chart Component** (`frontend/src/components/ChartComponent.tsx` - 225 lines)

**Technology**: Lightweight Charts v4.1 (performant financial charting)

**Data Flow**:
```
Fetch /api/v1/analyze/{ticker}?interval=5m
    ↓
Parse OHLCV + Technical Indicators
    ↓
Create candlestick series
    ↓
Attach indicator series (RSI, MACD, VWAP)
    ↓
Render with interactive toolbar
```

**Features**:
- **Candlestick rendering**: OHLC data visualization
- **Dynamic indicator toggle**: RSI, MACD, VWAP (on/off)
- **Interval selection**: 1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo
- **Session breaks**: Visual markers for market open/close
- **Responsive sizing**: Auto-fit to container

**Indicator Calculation** (Client-side):
- SMA (Simple Moving Average)
- EMA (Exponential Moving Average)
- Plus RSI/MACD/VWAP from backend

**Error Handling**:
- Fallback if data fetch fails
- Yahoo Finance as primary fallback
- Error message display

### 5. **Broker Login Modal** (`frontend/src/components/BrokerLoginModal.tsx`)

**Form Fields**:
- Mobile number (10-digit Indian)
- UCC (Unique Client Code from Kotak)
- TOTP (6-digit one-time password)
- Consumer key (API key)
- Consumer secret (optional)
- Environment (PROD/UAT)

**Login Flow**:
1. User clicks "Connect Broker" button (Header)
2. Modal opens with form
3. Submit → POST to `/api/v1/broker/login-step1`
4. Show MPIN prompt
5. Submit MPIN → POST to `/api/v1/broker/login-step2`
6. Success → Update store, close modal
7. Charts now fetch from Kotak API (faster)

### 6. **Key Components Summary**

| Component | Purpose |
|-----------|---------|
| **Header.tsx** | Top navigation, broker status, modal triggers |
| **Analyzer.tsx** | Technical analysis view (volume analysis, patterns) |
| **Portfolio.tsx** | Holdings & positions (post-login) |
| **IndicesBar.tsx** | Live indices ticker (NIFTY50, BANK NIFTY, etc) |
| **HeatMap.tsx** | Sector performance visualization |
| **Watchlist.tsx** | Custom stock watchlist management |
| **StockInfoModal.tsx** | Stock details popup (sector, industry, PE) |
| **ChartToolbar.tsx** | Interval, indicator, zoom controls |
| **ErrorBoundary.tsx** | React error catching & display |
| **WebSocketContext.tsx** | Real-time data subscription |

### 7. **Utility Functions** (`frontend/src/utils/indicators.ts`)

```typescript
calculateSMA(data: OHLCData[], period: number): {time, value}[]
calculateEMA(data: OHLCData[], period: number): {time, value}[]
```

These calculate client-side indicators for optional visualization.

---

## 🔌 API Endpoints Reference

### Authentication (Broker)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/broker/login-step1` | None | TOTP validation |
| POST | `/api/v1/broker/login-step2` | None | MPIN validation |

### Portfolio (Requires Login)
| Method | Endpoint | Auth | Returns |
|--------|----------|------|---------|
| GET | `/api/v1/broker/holdings` | Bearer | Holdings list |
| GET | `/api/v1/broker/positions` | Bearer | Positions |
| GET | `/api/v1/broker/funds` | Bearer | Balance, margins |

### Market Data (No Auth)
| Method | Endpoint | Query Params | Returns |
|--------|----------|--------------|---------|
| GET | `/api/v1/analyze/{ticker}` | `interval` | OHLCV + indicators |
| GET | `/api/v1/quote/{ticker}` | - | Single quote |
| POST | `/api/v1/quotes` | - | Batch quotes (body: `{symbols}`) |
| GET | `/api/v1/indices` | - | Index values |
| GET | `/api/v1/sectors` | - | Sector data |

### Indices & Sectors
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/index/{symbol}/constituents` | Get stocks in index |
| GET | `/api/v1/stock/{symbol}/details` | Stock profile |
| GET | `/api/v1/volume/{ticker}` | Volume analysis |

### Real-Time
| Type | Endpoint | Purpose |
|------|----------|---------|
| WS | `/ws/universe` | Live candle stream |
| POST | `/api/v1/subscribe` | Subscribe to symbols |

---

## 📊 Data Sources & Fallback Strategy

**Priority Order**:

1. **Kotak Securities API** (If logged in)
   - Fastest, most reliable
   - Real-time data
   - Returns latest market data

2. **Yahoo Finance API v8** (Fallback)
   - No authentication required
   - Good coverage for Indian stocks
   - Slight latency (~2-3s)
   - Endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}`

**Symbol Format Handling**:
- User input: `"RELIANCE"` → Normalized to `"RELIANCE.NS"` (Yahoo)
- Kotak tokens: Resolved via `get_instrument_token()`
- Index symbols: Prefixed with `^` (e.g., `"^NIFTY50"`)

**Error Recovery**:
- If Kotak returns 404 → Try Yahoo
- If Yahoo timeout → Return empty data, show error
- Caching via `@lru_cache` reduces redundant calls

---

## 🛠️ Startup & Deployment

### Backend Startup
```powershell
cd backend
$env:PYTHONPATH="C:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\Lib\site-packages"
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Expected Output**:
```
INFO:     Started server process [PID]
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:app.execution.market_data_stream:MarketDataStream Background Monitor Started
```

### Frontend Startup
```powershell
cd frontend
npm run build          # Compile TypeScript
py -m http.server 3000 --directory dist  # Or: npm run preview
```

**Access**: `http://127.0.0.1:3000`

### One-Click Scripts
- **`run_backend.bat`** - Starts backend with PYTHONPATH
- **`run_frontend.bat`** - Builds & serves frontend
- **`start_server_robust.bat`** - Combined startup with error handling

---

## 🎨 Styling & Theme

**Tailwind CSS**:
- Dark theme (black/slate color scheme)
- Custom scrollbars, hover effects
- Responsive grid layouts
- Transition animations (0.3s duration)

**Color Palette**:
- Background: `#000000` (black), `#1c1917` (slate-950)
- Text: `#ffffff` (white), `#cbd5e1` (slate-300)
- Accent: `#10b981` (emerald-500), `#ef4444` (red-500)
- Chart colors: Orange (SMA), Blue (MACD), Green (VWAP)

---

## ✅ Features Implemented

### Dashboard
- ✅ Chart rendering with multiple intervals
- ✅ Technical indicators (RSI, MACD, VWAP)
- ✅ Stock search & autocomplete
- ✅ Watchlist management
- ✅ Order entry form

### Broker Integration
- ✅ 2-step authentication (TOTP + MPIN)
- ✅ Portfolio management (post-login)
- ✅ Holdings & positions
- ✅ Account balance display

### Market Data
- ✅ Quote fetching (batch & single)
- ✅ Index data (NIFTY50, SENSEX, etc)
- ✅ Sector heatmap (13 sectors)
- ✅ Technical analysis (RSI, MACD, VWAP)

### Real-Time (Infrastructure)
- ✅ WebSocket connection management
- ✅ Real-time 1-minute candle building
- ✅ Multi-symbol subscription

### UX/Design
- ✅ Dark theme
- ✅ Responsive layouts
- ✅ Error boundaries
- ✅ Loading states
- ✅ Modal management

---

## ⚙️ Configuration & Setup

### Environment Variables
Located in files:
- **Backend**: `backend/.env` (optional)
- **Frontend**: `frontend/.env` (optional)

### Key Configs
- **Backend Port**: 8000 (configurable via `--port`)
- **Frontend Port**: 3000 (configurable via http.server)
- **CORS Origins**: localhost:3000, localhost:5173, *
- **Chart Interval**: 5m default (1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo supported)
- **Cache Size**: 128 (LRU cache for Yahoo API)

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Chart shows "Load Failed" | Check backend running, try different ticker, check browser console |
| Backend won't start | Kill Python: `Stop-Process -Name python -Force`, check port 8000 |
| Port 8000 already in use | Use different port: `--port 8001` |
| Frontend can't reach backend | Ensure backend is running on :8000, check CORS, hard refresh |
| CORS error in browser | Whitelist frontend origin in CORS middleware |
| Slow chart loading | Normal on first load (Yahoo API), subsequent loads cached |
| WebSocket fails to connect | Check backend running, firewall rules, browser console |

---

## 📈 Performance Optimizations

1. **Caching**:
   - Yahoo API responses cached with `@lru_cache(maxsize=128)`
   - Zustand store deduplication
   - Frontend component memoization

2. **Data Fetching**:
   - Batch quote fetching (POST `/api/v1/quotes`)
   - Lazy loading of index constituents
   - WebSocket for real-time (vs polling)

3. **Chart Rendering**:
   - Lightweight Charts (optimized for 1000+ candles)
   - Dynamic indicator add/remove (no full re-render)
   - Canvas-based rendering

4. **Network**:
   - CORS pre-flight optimization
   - Keep-alive connections
   - Gzip compression (built into Uvicorn)

---

## 📝 Project Files Summary

### Root Level Documentation
- `README_CHART_FIX.md` - Chart rendering fix details
- `PROJECT_OVERVIEW.md` - High-level architecture
- `QUICKSTART.md` - Quick setup guide
- `API_REFERENCE.md` - Full API documentation
- `SOLUTION_COMPLETE.md` - Issue resolution summary
- `VISUAL_SUMMARY.md` - Visual architecture diagrams

### Test/Debug Files
- `test_backend.py` - Backend API tests
- `test_api_quote.py` - Quote endpoint tests
- `test_chart_api.py` - Chart endpoint tests
- `debug_*.py` - Various debug scripts
- `verify_*.py` - Verification scripts

### Deployment Scripts
- `run_backend.bat` - Backend launcher
- `run_frontend.bat` - Frontend launcher
- `start_server_robust.bat` - Combined launcher

---

## 🚀 Next Steps / Future Enhancements

1. **Order Execution**:
   - Implement actual order placement (currently stub)
   - Real-time order status updates

2. **Advanced Features**:
   - Strategy builder & backtesting
   - Alert system (price, technical conditions)
   - Custom indicators
   - Pattern recognition

3. **Portfolio Management**:
   - P&L tracking
   - Risk analysis
   - Performance metrics

4. **Mobile Support**:
   - Responsive mobile interface
   - Mobile WebSocket optimization

5. **Multi-Broker Support**:
   - Add other brokers (Zerodha, Angel, etc)
   - Abstracted broker interface

6. **Database**:
   - Store historical data
   - User preferences
   - Watchlists persistence

---

## 📞 Support & Documentation

- **API Docs**: `/docs` (Swagger UI via FastAPI)
- **Logs**: Terminal output for debugging
- **Browser Console**: Frontend errors (F12 > Console)
- **Backend Logs**: Check terminal where backend is running

---

**Last Updated**: February 5, 2026
**Status**: ✅ Production Ready
