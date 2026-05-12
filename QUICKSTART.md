# QuanFin Terminal - Quick Start Guide

## How to Start the Application

### 1. Start Backend Server
```powershell
cd backend
$env:PYTHONPATH="C:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\Lib\site-packages"
py -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Expected Output**:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:app.execution.market_data_stream:MarketDataStream Background Monitor Started
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### 2. Start Frontend Server (in a new terminal)
```powershell
cd frontend
py -m http.server 3000 --directory dist
```

**Expected Output**:
```
Serving HTTP on :: port 3000 (http://[::]:3000/) ...
```

### 3. Open in Browser
- **URL**: http://127.0.0.1:3000
- **Note**: You may need to refresh (Ctrl+Shift+R) to clear cache

### 4. Use the Application

#### View Charts (No Login Required)
1. Click on any ticker symbol (DLF, INFY, RELIANCE, etc.)
2. Charts load with candlesticks + technical indicators
3. Uses Yahoo Finance if Kotak is unavailable

#### With Broker Login
1. Click "Connect Broker" button
2. Enter Kotak Securities credentials
3. Charts load from Kotak API (faster, more reliable)
4. Falls back to Yahoo Finance if needed

### 5. Verify Everything is Working

**Backend Health Check**:
```powershell
# In PowerShell, with backend running:
$env:PYTHONPATH="C:\Users\MOHD FAIZAM\OneDrive\Desktop\QuanFin_Terminal\Lib\site-packages"
py -c "import urllib.request, json; resp = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/analyze/RELIANCE'); data = json.loads(resp.read()); print(f'✓ Status 200, {len(data[\"data\"])} candles, source: {data[\"source\"]}')"
```

**Frontend Health Check**:
- Open http://127.0.0.1:3000 in browser
- Check browser console (F12) for errors
- Should see "CONNECTED" or "DISCONNECTED" status button

## Troubleshooting

### Chart Shows "Load Failed"
1. Check backend is running: `http://127.0.0.1:8000/api/v1/analyze/RELIANCE`
2. Check browser console (F12 > Console tab) for error messages
3. Check backend terminal for error logs
4. Try a different ticker (some tickers may have network issues)

### Backend Won't Start
1. Make sure port 8000 is not in use: `netstat -ano | findstr :8000`
2. Kill any Python processes: `Stop-Process -Name python -Force`
3. Ensure PYTHONPATH is set correctly
4. Check `py --version` returns Python 3.14+

### Frontend Shows "Cannot Reach Backend"
1. Verify backend is running on http://127.0.0.1:8000
2. Check firewall is not blocking localhost:8000
3. Hard refresh browser: Ctrl+Shift+R
4. Check browser console for CORS errors

### Slow Chart Loading
- This is normal on first load (Yahoo Finance API call)
- Subsequent requests cache the data
- Kotak API is faster if you're logged in

## Project Structure

```
QuanFin_Terminal/
├── backend/
│   ├── app/
│   │   ├── main.py          ← Main API endpoints
│   │   ├── execution/       ← Kotak broker integration
│   │   └── processing/      ← Technical analysis engine
│   ├── Lib/
│   │   └── site-packages/   ← Local dependencies
│   ├── run_server.py        ← Backend startup script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      ← React components
│   │   └── App.tsx          ← Main app
│   ├── dist/                ← Built frontend
│   └── package.json
├── Lib/
│   └── site-packages/       ← Shared dependencies
├── run_backend.bat          ← Batch script to start backend
└── CHART_FIX_STATUS.md      ← Detailed fix report
```

## API Endpoints

### Get Chart Data
```
GET /api/v1/analyze/{ticker}?interval=5m

Response:
{
  "ticker": "RELIANCE",
  "interval": "5m",
  "source": "yahoo|kotak",
  "data": [
    {
      "date": "2026-01-27T03:45:00Z",
      "open": 1380.0,
      "high": 1387.9,
      "low": 1374.3,
      "close": 1375.2,
      "volume": 0,
      "rsi": 50.5,
      "macd": 10.2,
      "vwap": 1375.5
    }
  ]
}
```

### Get Live Quotes
```
POST /api/v1/quotes
Body: {"tickers": ["RELIANCE", "TCS", "INFY"]}
```

### WebSocket Stream
```
WS /ws/universe
(Real-time quote streaming)
```

## Tips & Tricks

1. **Multiple Tickers**: Open chart tab for each ticker - they load in parallel
2. **Chart Intervals**: Supports 1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo
3. **Keyboard Shortcuts**: Check browser DevTools (F12) for any custom shortcuts
4. **Broker Connection**: Once logged in, stays connected for the session
5. **Data Source**: Check "source" field in API response to see data origin

## Performance Notes

- **First chart load**: ~2-3 seconds (Yahoo Finance API call)
- **Subsequent loads**: ~500ms (cached)
- **With Kotak login**: ~1 second (faster API)
- **WebSocket quotes**: ~1 second update cycle

---

**Need Help?** Check `CHART_FIX_STATUS.md` for detailed troubleshooting and technical details.
