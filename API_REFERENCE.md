# QuanFin Capital Terminal - Technical Reference

## API Documentation

### Authentication Endpoints

#### 1. POST `/api/v1/broker/login-step1`
**Purpose**: Initiate broker login with TOTP validation

**Request Body**:
```json
{
  "mobile": "9520597569",
  "ucc": "X4Q43",
  "totp": "123456",
  "consumer_key": "f7f1fbb5-3875-4798-ad7b-c6b6e6018a44",
  "consumer_secret": null,
  "environment": "PROD"
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Login Initiated. Proceed to MPIN.",
  "data": {
    "data": {
      "status": "success",
      "token": "view_token_here",
      "sid": "sid_view_here"
    }
  }
}
```

**Response (Error)**:
```json
{
  "status": "error",
  "message": "Invalid TOTP or UCC"
}
```

---

#### 2. POST `/api/v1/broker/login-step2`
**Purpose**: Validate MPIN to complete authentication

**Request Body**:
```json
{
  "mpin": "1234"
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Logged in successfully",
  "data": {
    "data": {
      "status": "success",
      "token": "trade_token_here",
      "sid": "sid_trade_here",
      "baseUrl": "https://mis.kotaksecurities.com"
    }
  }
}
```

**State After Success**:
- `KotakService.is_logged_in = True`
- `MarketDataStream` detects login and initiates WebSocket
- Real-time market data becomes available

---

### Market Data Endpoints

#### 3. POST `/api/v1/quotes`
**Purpose**: Fetch live quotes for multiple symbols (Kotak API priority, Yahoo fallback)

**Request Body**:
```json
{
  "symbols": ["RELIANCE.NS", "TCS.NS", "INFY.NS"]
}
```

**Response**:
```json
{
  "RELIANCE.NS": {
    "price": 2845.50,
    "change": -15.25,
    "changePercent": -0.53,
    "volume": 2156789,
    "close": 2860.75,
    "open": 2860.00,
    "high": 2875.00,
    "low": 2840.00,
    "token": "12345"
  },
  ...
}
```

---

#### 4. GET `/api/v1/quote/{ticker}`
**Purpose**: Fetch detailed quote for a single ticker

**Example**: `GET /api/v1/quote/RELIANCE.NS`

**Response**:
```json
{
  "symbol": "RELIANCE.NS",
  "name": "Reliance Industries",
  "price": 2845.50,
  "change": -15.25,
  "changePercent": -0.53,
  "open": 2860.00,
  "dayHigh": 2875.00,
  "dayLow": 2840.00,
  "fiftyTwoWeekLow": 2100.00,
  "fiftyTwoWeekHigh": 3200.00,
  "volume": 2156789,
  "previousClose": 2860.75
}
```

---

#### 5. GET `/api/v1/indices`
**Purpose**: Fetch live data for major indices

**Response**:
```json
[
  {
    "symbol": "NIFTY 50",
    "name": "NIFTY 50",
    "price": 21845.50,
    "change": 125.75,
    "change_percent": 0.58,
    "volume": 15234567
  },
  {
    "symbol": "BANK NIFTY",
    "name": "BANK NIFTY",
    "price": 54321.00,
    "change": -250.00,
    "change_percent": -0.46,
    "volume": 8765432
  }
]
```

---

#### 6. GET `/api/v1/sectors`
**Purpose**: Fetch sector performance for heatmap

**Response**:
```json
[
  {
    "name": "Banking",
    "change": 125.50,
    "changePercent": 2.45,
    "ltp": 5428.75
  },
  {
    "name": "Technology",
    "change": -85.25,
    "changePercent": -1.23,
    "ltp": 6850.00
  },
  ...
]
```

---

### Index & Constituent Data

#### 7. GET `/api/v1/index/{symbol}/constituents`
**Purpose**: Fetch constituent stocks for index or sector with live data

**Example**: `GET /api/v1/index/NIFTY%2050/constituents`

**Response**:
```json
{
  "index": "NIFTY 50",
  "name": "NIFTY 50",
  "constituents": [
    {
      "symbol": "RELIANCE.NS",
      "name": "RELIANCE",
      "ltp": 2845.50,
      "change": -15.25,
      "changePercent": -0.53,
      "open": 2860.00,
      "high": 2875.00,
      "low": 2840.00,
      "close": 2860.75,
      "fiftyTwoWeekHigh": 3200.00,
      "fiftyTwoWeekLow": 2100.00,
      "openInterest": "12.45 L",
      "oiChangePercent": 0.75
    },
    ...
  ],
  "totalStocks": 50
}
```

**Supported Indices**:
- `NIFTY 50` / `^NSEI`
- `BANK NIFTY` / `^NSEBANK`
- `SENSEX` / `^BSESN`
- Sector names: `Banking`, `Technology`, `Metal`, `Energy`, `Consumer`, etc.

---

### Stock Details

#### 8. GET `/api/v1/stock/{symbol}/details`
**Purpose**: Fetch comprehensive stock profile and fundamentals

**Example**: `GET /api/v1/stock/RELIANCE.NS/details`

**Response**:
```json
{
  "symbol": "RELIANCE.NS",
  "name": "Reliance Industries Limited",
  "shortName": "Reliance",
  "logoUrl": "https://www.google.com/s2/favicons?domain=ril.com&sz=128",
  "industry": "Oil & Gas Refining & Marketing",
  "sector": "Energy",
  "description": "Reliance is one of India's largest companies...",
  "website": "https://www.ril.com",
  "employees": 360000,
  "price": {
    "current": 2845.50,
    "change": -15.25,
    "changePercent": -0.53,
    "open": 2860.00,
    "high": 2875.00,
    "low": 2840.00,
    "prevClose": 2860.75,
    "fiftyTwoWeekHigh": 3200.00,
    "fiftyTwoWeekLow": 2100.00,
    "volume": 2156789,
    "averageVolume": 2456789
  },
  "valuation": {
    "marketCap": 18500000000000,
    "trailingPE": 22.5,
    "forwardPE": 21.3,
    "priceToBook": 1.8,
    "dividendYield": 1.25,
    "eps": 126.50,
    "beta": 0.95
  },
  "financials": {
    "revenue": 6500000000000,
    "revenueTerm": "TTM",
    "netIncome": 485000000000,
    "profitMargin": 7.46,
    "operatingMargin": 12.5,
    "roe": 15.8,
    "debtToEquity": 0.45
  },
  "shareholding": {
    "insiders": 10.5,
    "institutions": 35.2
  }
}
```

---

### Portfolio Endpoints

#### 9. GET `/api/v1/broker/holdings`
**Purpose**: Fetch holdings from broker (requires login)

**Response**:
```json
[
  {
    "tradingsymbol": "RELIANCE.NS",
    "quantity": 10,
    "average_price": 2700.50,
    "last_price": 2845.50,
    "product": "CNC",
    "pnl": 1450.00
  },
  ...
]
```

---

#### 10. GET `/api/v1/broker/positions`
**Purpose**: Fetch intraday positions (requires login)

**Response**:
```json
[
  {
    "tradingsymbol": "TCS.NS",
    "quantity": 25,
    "average_price": 3100.00,
    "last_price": 3250.75,
    "product": "MIS",
    "transaction_type": "BUY",
    "pnl": 3768.75
  },
  ...
]
```

---

#### 11. GET `/api/v1/broker/funds`
**Purpose**: Fetch account balance and margins (requires login)

**Response** (varies by broker):
```json
{
  "available_balance": 500000.00,
  "total_margin": 1000000.00,
  "used_margin": 450000.00,
  "adhoc_margin": 0.00,
  "margin_available": 550000.00
}
```

---

### Technical Analysis

#### 12. GET `/api/v1/analyze/{ticker}`
**Purpose**: Fetch OHLCV data with technical indicators

**Parameters**:
- `ticker`: Symbol (e.g., `RELIANCE.NS`)
- `interval` (optional): `1m`, `5m`, `15m`, `30m`, `1h`, `1d`, `1wk`, `1mo` (default: `5m`)

**Example**: `GET /api/v1/analyze/RELIANCE.NS?interval=5m`

**Response**:
```json
{
  "ticker": "RELIANCE.NS",
  "interval": "5m",
  "data": [
    {
      "date": "2026-02-01T10:00:00Z",
      "open": 2850.00,
      "high": 2865.50,
      "low": 2845.00,
      "close": 2860.25,
      "volume": 156789,
      "rsi": 65.5,
      "MACD_12_26_9": 8.75,
      "MACDs_12_26_9": 7.50,
      "MACDh_12_26_9": 1.25,
      "vwap": 2857.50
    },
    ...
  ]
}
```

---

#### 13. GET `/api/v1/volume/{ticker}`
**Purpose**: Fetch volume analysis with delivery estimates

**Example**: `GET /api/v1/volume/RELIANCE.NS`

**Response**:
```json
{
  "ticker": "RELIANCE.NS",
  "period_overview": [
    {
      "period": "Day",
      "traded": 2156789,
      "delivery": 896789
    },
    {
      "period": "Week",
      "traded": 45678900,
      "delivery": 20556505
    },
    {
      "period": "1 Month",
      "traded": 198765432,
      "delivery": 83561748
    }
  ],
  "history": [
    {
      "date": "01 Feb '26",
      "traded": 2156789,
      "delivery": 896789,
      "deliveryPercent": 41.6,
      "price": 2860.25,
      "change": 0.53,
      "insight": "Strong Buying"
    },
    ...
  ]
}
```

---

### WebSocket Stream

#### 14. WS `/ws/universe`
**Purpose**: Real-time candle updates

**Connection Flow**:
1. Client connects to WebSocket: `ws://localhost:8000/ws/universe`
2. Client sends subscription request (optional):
   ```json
   {"subscribe": ["nse_cm|12345", "nse_cm|67890"]}
   ```
3. Server broadcasts candle updates:
   ```json
   {
     "s": "RELIANCE.NS",
     "t": 1675246800,
     "o": 2850.00,
     "h": 2865.50,
     "l": 2845.00,
     "c": 2860.25,
     "v": 156789,
     "x": false
   }
   ```

**Fields**:
- `s`: Symbol/Token
- `t`: Unix timestamp (candle start)
- `o`: Open price
- `h`: High price
- `l`: Low price
- `c`: Close price
- `v`: Volume
- `x`: Is closed (boolean)

---

#### 15. POST `/api/v1/subscribe`
**Purpose**: Subscribe to symbols for live updates

**Request Body**:
```json
{
  "symbols": ["RELIANCE.NS", "TCS.NS"]
}
```

**Response**:
```json
{
  "status": "subscribed",
  "count": 2,
  "tokens": ["nse_cm|12345", "nse_cm|67890"]
}
```

---

## Data Models

### Quote Object
```typescript
{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  close: number;
  open: number;
  high: number;
  low: number;
  token?: string;
}
```

### Candle Object
```typescript
{
  date: string; // ISO 8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number;
  MACD_12_26_9?: number;
  MACDs_12_26_9?: number;
  MACDh_12_26_9?: number;
  vwap?: number;
}
```

### ConstituentStock Object
```typescript
{
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  openInterest: string;
  oiChangePercent: number;
}
```

### Sector Object
```typescript
{
  name: string;
  change: number;
  changePercent: number;
  ltp: number;
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "status": "error",
  "message": "Detailed error message here"
}
```

### HTTP Status Codes
- `200`: Success
- `400`: Bad request (missing parameters)
- `401`: Unauthorized (broker not logged in)
- `404`: Resource not found
- `500`: Server error

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Broker not logged in` | Accessing protected endpoint without auth | Call login endpoints first |
| `No data found for ticker` | Invalid symbol or no data available | Check symbol format |
| `Import NeoAPI Failed` | NeoAPI library not installed | Install `neo_api_client` |
| `WebSocket connection failed` | Server not running or CORS issue | Check CORS settings |

---

## Frontend State Management (Zustand Store)

### useMarketStore Hook

```typescript
const {
  // Ticker & Chart
  ticker, setTicker,
  interval, setInterval,
  marketStats, setMarketStats,
  
  // Index Details
  selectedIndex, setSelectedIndex,
  indexConstituents, updateConstituents,
  
  // Stock Details
  selectedStock, setSelectedStock,
  
  // Broker
  isBrokerConnected, setBrokerConnected,
  isBrokerModalOpen, setBrokerModalOpen
} = useMarketStore();
```

---

## Performance Tips

### API Caching
- MarketDataService uses `@lru_cache(maxsize=128)` for Yahoo API calls
- Consider implementing Redis for production

### WebSocket Optimization
- Candles are batched before broadcast (can be tuned in CandleBuilder)
- Subscribe only to actively viewed symbols
- Unsubscribe when navigating away

### Frontend Optimization
- Use React.memo() on child components
- Implement virtual scrolling for large lists
- Lazy load chart data by timeframe

---

## Debugging

### Check Backend Logs
```bash
# Terminal where backend is running
# Look for:
# - "Login Step 1 failed"
# - "WebSocket Callbacks Registered"
# - "Subscription Error"
```

### Check Frontend Logs
```javascript
// Open Chrome DevTools Console (F12)
// Check for:
// - CORS errors
// - JSON parsing errors
// - WebSocket connection errors
```

### Test Endpoints with cURL
```bash
# Quote fetch
curl -X POST http://127.0.0.1:8000/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{"symbols":["RELIANCE.NS"]}'

# Index constituents
curl "http://127.0.0.1:8000/api/v1/index/NIFTY%2050/constituents"

# Sectors
curl "http://127.0.0.1:8000/api/v1/sectors"
```

---

## Summary

QuanFin Capital Terminal provides a **comprehensive REST API** with **WebSocket support** for real-time data. The backend is designed with clean separation of concerns, and the frontend uses modern React patterns. All market data flows through priority-based fallback (Kotak → Yahoo), ensuring resilience. The system is ready for **production deployment** with minor enhancements (database, auth, HTTPS).
