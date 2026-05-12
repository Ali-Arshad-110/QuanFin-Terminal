# ACCESS TOKEN FIX - Complete Setup Guide

## Problem
The backend requires `KOTAK_CONSUMER_KEY` environment variable to initialize the broker access token. Without it, the app couldn't start properly.

## Solution Applied ✅

### 1. Code Fix (Already Applied)
The `main.py` has been updated to use a placeholder **"PENDING_LOGIN"** when the environment variable isn't set:

```python
if KOTAK_CONSUMER_KEY:
    kotak_service.initialize_client(KOTAK_CONSUMER_KEY)
else:
    # Set placeholder to allow app to start
    kotak_service.access_token = "PENDING_LOGIN"
```

This allows the backend to **start without the environment variable**.

### 2. How the App Now Works

**WITHOUT Environment Variable:**
- ✅ Backend starts and runs normally
- ✅ All commodity data comes from **demo data** (realistic fake data)
- ✅ No broker login required to view data
- ⚠️ Data is simulated, not live from Kotak

**WITH Environment Variable (Optional):**
- ✅ Backend uses real broker data when available
- ✅ Falls back to demo data if broker fails
- ✅ User can log in via UI for live updates

---

## Quick Fix Options

### Option A: Start Backend WITHOUT Environment Variable (Recommended for Testing)

```powershell
cd backend
python run_server.py
```

Expected output:
```
⚠️ KOTAK_CONSUMER_KEY not set. Using placeholder. Complete broker login via UI to enable live data.
✓ Backend is running and responding
```

This is **fully functional** - commodity dashboard will display realistic demo data.

---

### Option B: Set Environment Variable (For Live Broker Data)

#### Windows PowerShell (Temporary - This Session Only):
```powershell
$env:KOTAK_CONSUMER_KEY = "your-consumer-key-here"
cd backend
python run_server.py
```

#### Windows PowerShell (Permanent - All Sessions):
```powershell
[Environment]::SetEnvironmentVariable("KOTAK_CONSUMER_KEY", "your-consumer-key-here", "User")
```

Then restart PowerShell and run:
```powershell
cd backend
python run_server.py
```

#### Windows Command Prompt (Temporary):
```cmd
set KOTAK_CONSUMER_KEY=your-consumer-key-here
cd backend
python run_server.py
```

#### Windows Command Prompt (Permanent):
```cmd
setx KOTAK_CONSUMER_KEY your-consumer-key-here
```

Then close and reopen Command Prompt.

---

## Getting Your Kotak Consumer Key

1. Log into [Kotak Securities](https://www.kotaksecurities.com)
2. Go to **Settings** → **API Keys**
3. Create or copy your **Consumer Key**
4. Use it in the environment variable above

---

## Verify Backend is Working

Once backend starts, test these endpoints:

### Health Check
```
GET http://127.0.0.1:8000/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "backend_running": true,
  "broker_access_token": "Set" or "Not Set",
  "broker_logged_in": false,
  "message": "✅ Backend is running and responding"
}
```

### Commodity Data (Works with Demo Data)
```
GET http://127.0.0.1:8000/api/v1/commodity/GOLD
```

Expected: Full commodity data with price, news, volatility, etc.

### Commodity Movers
```
GET http://127.0.0.1:8000/api/v1/commodity/movers/top
```

Expected: Top 6 moving commodities with change percentages.

---

## Troubleshooting

### Error: "Python not found" or "Module not found"

**Solution 1:** Ensure Python 3.8+ is installed
```powershell
python --version
```

If not installed:
- Download: https://www.python.org/downloads/
- During installation: **Check "Add Python to PATH"**
- Restart your terminal after installation

**Solution 2:** Use Direct Python Path
```powershell
C:\"Program Files\Python314\python.exe" run_server.py
```
(Replace `Python314` with your Python version)

---

### Error: "Failed to import xyz module"

**Solution:** Ensure dependencies are installed
```powershell
pip install -r requirements.txt
```

---

### Error: "Port 8000 already in use"

**Solution:** Kill existing process or use different port
```powershell
# Kill existing process
Kill-Process -Port 8000 -Force

# Or use different port
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

---

## Architecture Now (After Fix)

```
Backend Startup
    ├─ Check KOTAK_CONSUMER_KEY environment variable
    ├─ If SET: Use real Kotak consumer key
    └─ If NOT SET: Use "PENDING_LOGIN" placeholder
            ↓
    Backend starts successfully ✓
            ↓
    API Endpoints Ready
    ├─ /api/v1/health → Always works
    ├─ /api/v1/commodity/{symbol} → Demo data or live data
    └─ /api/v1/commodity/movers/top → Demo data or live data
            ↓
    Frontend Connects
    ├─ Displays commodity dashboard
    ├─ Shows demo data (realistic fake prices)
    └─ Ready for broker login (optional)
            ↓
    Optional: User Can Log In
    └─ Complete broker login via BrokerLoginModal
        └─ Switch from demo data to live Kotak data
```

---

## Next Steps

1. **Start Backend** (without environment variable):
   ```powershell
   cd backend
   python run_server.py
   ```

2. **Verify it's running:**
   - Open browser: `http://127.0.0.1:8000/api/v1/health`
   - Should see: `"status": "healthy"`

3. **Start Frontend:**
   ```powershell
   cd frontend
   npm run dev
   ```

4. **Test Commodities Dashboard:**
   - Open: `http://localhost:5173`
   - Navigate to Commodities section
   - Should see all 9 commodities with demo data

5. **Optional - Enable Live Data:**
   - Get your Kotak Consumer Key
   - Set environment variable (see Option B above)
   - Restart backend
   - Complete broker login in UI (BrokerLoginModal)

---

## Summary

✅ **Fixed:** Backend will now start without KOTAK_CONSUMER_KEY  
✅ **Fallback:** All endpoints use realistic demo data  
✅ **Optional:** Set environment variable for real Kotak data  
✅ **Clean:** No errors or crashes on missing token  

Your commodities dashboard is ready to use immediately with or without live broker data!
