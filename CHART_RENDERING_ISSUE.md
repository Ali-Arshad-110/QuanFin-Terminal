# QuanFin Terminal - Chart Rendering Issue Diagnosis

## Problem Identified ❌

**Chart not rendering after broker login**

### Root Causes Found:

#### 1. **Missing Fallback in `/api/v1/analyze/{ticker}` Endpoint**
**Location**: `backend/app/main.py` (lines 304-320)

```python
@app.get("/api/v1/analyze/{ticker}")
async def analyze_ticker(ticker: str, interval: str = ...):
    if not kotak_service.is_logged_in:
        raise HTTPException(status_code=401, detail="Broker not logged in...")
    
    # 1. Fetch Data - ONLY from Kotak
    data = kotak_service.get_historical_data(ticker, interval)  # ❌ No fallback!
    
    if not data:
        raise HTTPException(status_code=404, detail="No data found...")
```

**Issue**: 
- The endpoint requires broker login
- But `get_historical_data()` may fail if:
  - Token resolution fails (`get_instrument_token()` returns `None, None`)
  - Kotak API returns empty response
  - No fallback to Yahoo Finance

---

#### 2. **Token Resolution Failure in `get_instrument_token()`**
**Location**: `backend/app/execution/kotak_service.py` (lines 325-350)

```python
def get_instrument_token(self, symbol):
    # Tries REST API: /script-details/1.0/quotes/neosymbol/{symbol}/all
    # This endpoint might:
    # ❌ Return empty list
    # ❌ Require different headers after login
    # ❌ Return different format than expected
```

---

#### 3. **Missing Yahoo Finance Fallback**
- Unlike `/api/v1/quotes` endpoint which has Kotak → Yahoo fallback
- The `/api/v1/analyze` endpoint has **NO FALLBACK**

---

## Terminal Output Analysis

From your backend startup, I see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
FastAPIDeprecationWarning: regex has been deprecated, please use pattern instead
```

✅ **Backend is running successfully**
✅ **All services initialized**

---

## Solutions

### Quick Fix (Recommended) - Add Yahoo Fallback
Modify `/api/v1/analyze/{ticker}` to:
1. Try Kotak API first (if logged in)
2. Fallback to Yahoo Finance `MarketDataService`
3. Apply technical indicators to either data source

### Workaround - Use existing `/api/v1/quotes` endpoint
Frontend can currently:
1. Get live quotes via `/api/v1/quotes` (works with both Kotak & Yahoo)
2. Display quote data in a table instead of chart
3. Manually build charts with limited data

---

## Action Items

1. **Enable Yahoo Fallback in `analyze_ticker()`** (5 min fix)
2. **Fix deprecation warning** (1 min fix)
3. **Add error logging** to debug token resolution issues

