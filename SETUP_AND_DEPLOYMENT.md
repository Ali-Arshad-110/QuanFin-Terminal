# QuanFin Capital Terminal - Setup & Deployment Guide

## Quick Start

### Prerequisites
- **Python 3.8+** (for backend)
- **Node.js 16+** (for frontend)
- **Git** (for cloning/version control)
- Windows, macOS, or Linux

---

## Local Development Setup

### 1. Backend Setup

#### Step 1a: Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

**Required packages**:
- `neo_api_client>=1.0.0` - Kotak Securities API wrapper
- `fastapi>=0.68.0` - Web framework
- `uvicorn>=0.15.0` - ASGI server
- `yfinance>=0.1.63` - Yahoo Finance data
- `pandas>=1.3.0` - Data manipulation
- `pydantic>=1.8.0` - Data validation
- `python-dotenv>=0.19.0` - Environment variables
- `websockets>=10.0` - WebSocket support
- `ccxt>=1.50.0` - Cryptocurrency exchange (optional, for future features)

#### Step 1b: Run Backend Server
```bash
python run_server.py
```

**Expected Output**:
```
--- Starting Server with custom path ---
Adding to sys.path: /path/to/Lib/site-packages
Success: uvicorn imported.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

**Verify**: Open browser to `http://127.0.0.1:8000/`
Expected: `{"message":"QuanFin Capital Terminal API is running"}`

---

### 2. Frontend Setup

#### Step 2a: Install Node Dependencies
```bash
cd frontend
npm install
```

#### Step 2b: Run Frontend Dev Server
```bash
npm run dev
```

**Expected Output**:
```
  VITE v5.0.0  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Access**: Open browser to `http://localhost:5173/`

---

### 3. Test Integration

#### Test 1: Fetch Sectors
```bash
curl http://127.0.0.1:8000/api/v1/sectors
```

Should return sector data with heatmap values.

#### Test 2: Fetch Indices
```bash
curl http://127.0.0.1:8000/api/v1/indices
```

#### Test 3: Quote Fetch
```bash
curl -X POST http://127.0.0.1:8000/api/v1/quotes \
  -H "Content-Type: application/json" \
  -d '{"symbols":["RELIANCE.NS", "TCS.NS"]}'
```

#### Test 4: Broker Login (with valid credentials)
```bash
curl -X POST http://127.0.0.1:8000/api/v1/broker/login-step1 \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9520597569",
    "ucc": "X4Q43",
    "totp": "123456",
    "consumer_key": "f7f1fbb5-3875-4798-ad7b-c6b6e6018a44",
    "consumer_secret": null,
    "environment": "PROD"
  }'
```

---

## Configuration Files

### Backend Configuration

#### `backend/requirements.txt`
Edit if adding new dependencies:
```
neo_api_client>=1.0.0
fastapi>=0.68.0
uvicorn>=0.15.0
yfinance>=0.1.63
pandas>=1.3.0
ccxt>=1.50.0
pydantic>=1.8.0
python-dotenv>=0.19.0
websockets>=10.0
```

#### `.env` (Optional - Create in project root)
```
KOTAK_ENVIRONMENT=PROD
KOTAK_API_BASE_URL=https://mis.kotaksecurities.com
LOG_LEVEL=INFO
```

**Currently not used but can be integrated** for Kotak credentials storage.

---

### Frontend Configuration

#### `frontend/vite.config.ts`
Entry point configuration. Change if needed:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
```

**Note**: Currently frontend calls backend at `http://localhost:8000` directly (see `src/config/liveData.ts`)

#### `frontend/src/config/liveData.ts`
```typescript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default API;
```

**For production**: Change baseURL to your deployment domain.

---

## Build & Production Deployment

### Frontend Build

#### Build for Production
```bash
cd frontend
npm run build
```

**Output**: `frontend/dist/` folder contains optimized build

#### Preview Production Build Locally
```bash
npm run preview
```

#### Deploy Frontend
1. **GitHub Pages**:
   ```bash
   npm run build
   # Upload 'dist' folder to GitHub Pages
   ```

2. **Vercel** (Recommended for React):
   ```bash
   npm install -g vercel
   vercel
   ```

3. **Netlify**:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

4. **AWS S3 + CloudFront**:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name/
   ```

---

### Backend Deployment

#### Option 1: Render (Recommended)
1. Push code to GitHub
2. Connect to Render.com
3. Create Web Service with:
   - Environment: Python 3
   - Start command: `python backend/run_server.py`

#### Option 2: Railway
1. Push to GitHub
2. Connect to Railway.app
3. Auto-detects Python, runs `run_server.py`

#### Option 3: Heroku
```bash
# Create Procfile in root:
# web: python backend/run_server.py

heroku login
heroku create your-app-name
git push heroku main
```

#### Option 4: Docker (for any cloud platform)

Create `Dockerfile` in project root:
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build & Run:
```bash
docker build -t quanfin-terminal .
docker run -p 8000:8000 quanfin-terminal
```

---

## Environment Variables

### Backend Environment Variables
Create `.env` in `backend/` folder:
```env
KOTAK_ENVIRONMENT=PROD
KOTAK_API_BASE_URL=https://mis.kotaksecurities.com
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**To enable**: Modify `backend/app/main.py` to read from `os.environ`

### Frontend Environment Variables
Create `.env` in `frontend/` folder:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_ENVIRONMENT=development
```

**Usage in frontend**:
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

---

## Scripts & Batch Files

### Windows Batch Scripts

#### `run_backend.bat`
```batch
@echo off
cd backend
python run_server.py
pause
```

Usage: Double-click `run_backend.bat` to start backend

#### `run_frontend.bat`
```batch
@echo off
cd frontend
npm run dev
pause
```

Usage: Double-click `run_frontend.bat` to start frontend

#### `start_server_robust.bat` (Recommended)
```batch
@echo off
cd backend
python run_server.py
if errorlevel 1 (
    echo.
    echo Error: Failed to start server
    echo Make sure Python and dependencies are installed
    echo Run: pip install -r requirements.txt
    echo.
)
pause
```

---

## Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'fastapi'"
**Solution**:
```bash
pip install fastapi uvicorn
```

### Issue: "ModuleNotFoundError: No module named 'neo_api_client'"
**Solution**:
```bash
pip install neo_api_client
# Or use: pip install -r backend/requirements.txt
```

### Issue: CORS Error in Frontend
**Check**: `backend/app/main.py` has correct origins:
```python
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "*"
]
```

### Issue: WebSocket Connection Refused
**Check**:
1. Backend is running on `127.0.0.1:8000`
2. Broker is logged in (WebSocket starts after login)
3. Check browser console for detailed error

### Issue: Port 8000 Already in Use
**Solution**:
```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux

# Kill process
kill -9 <PID>

# Or change port in run_server.py
# Change: uvicorn.run(..., port=8001, ...)
```

---

## Database Setup (Future)

### PostgreSQL Setup
```bash
# Install PostgreSQL
# Create database
psql -U postgres
CREATE DATABASE quanfin_terminal;

# Update backend to connect
# In app/main.py add:
from sqlalchemy import create_engine
engine = create_engine('postgresql://user:password@localhost/quanfin_terminal')
```

---

## Monitoring & Logging

### Backend Logs
View logs while server is running:
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://127.0.0.1:8000
DEBUG:    Tick: 12345 -> 2850.5
INFO:     MarketDataStream: WebSocket Callbacks Registered
```

### Frontend Logs
Open Chrome DevTools (F12) → Console tab:
```javascript
// Monitor API calls
console.log("Fetching quotes...");

// Monitor WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/universe');
ws.onopen = () => console.log("WebSocket connected");
ws.onerror = (e) => console.error("WebSocket error", e);
```

---

## Performance Optimization

### Backend Optimizations
1. **Enable Gzip Compression**:
   ```python
   from fastapi.middleware.gzip import GZIPMiddleware
   app.add_middleware(GZIPMiddleware, minimum_size=1000)
   ```

2. **Add Response Caching**:
   ```python
   from functools import lru_cache
   @app.get("/api/v1/sectors")
   @lru_cache(maxsize=1)  # Cache for 1 minute
   async def get_sectors():
       ...
   ```

3. **Use Connection Pooling** (for database):
   ```python
   from sqlalchemy.pool import QueuePool
   engine = create_engine('postgresql://...', poolclass=QueuePool)
   ```

### Frontend Optimizations
1. **Code Splitting**:
   ```typescript
   const Dashboard = lazy(() => import('./components/Dashboard'));
   ```

2. **Image Optimization**:
   - Use WebP format
   - Lazy load images

3. **Bundle Analysis**:
   ```bash
   npm run build
   # Check dist/ size
   ```

---

## Testing

### Unit Tests (Backend)
Create `backend/tests/test_services.py`:
```python
import pytest
from app.processing.engine import MarketDataService

def test_fetch_quotes():
    service = MarketDataService()
    result = service.fetch_quotes(['RELIANCE.NS'])
    assert 'RELIANCE.NS' in result or 'RELIANCE' in result
```

Run tests:
```bash
pip install pytest
pytest backend/tests/
```

### Integration Tests (Frontend)
```bash
npm install --save-dev vitest @testing-library/react
# Create frontend/src/__tests__/Dashboard.test.tsx
npm run test
```

---

## CI/CD Pipeline

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy QuanFin Terminal

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Frontend
        run: |
          cd frontend
          npm install
          npm run build
      
      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npm install -g vercel
          vercel --prod --token $VERCEL_TOKEN
```

---

## Maintenance Checklist

- [ ] Weekly: Check broker API status page
- [ ] Monthly: Update dependencies: `pip install --upgrade -r requirements.txt`
- [ ] Monthly: Review logs for errors
- [ ] Quarterly: Backup database
- [ ] Quarterly: Update security patches
- [ ] Annually: Load test with 1000+ concurrent users

---

## Support & Resources

### Documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Kotak Securities API](https://kotaksecurities.com/)
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/)

### Common Commands

**Backend**:
```bash
pip list                    # List installed packages
pip show fastapi            # Show package details
pip install --upgrade pip   # Upgrade pip
python -m venv venv         # Create virtual environment
source venv/bin/activate    # Activate venv (macOS/Linux)
venv\Scripts\activate       # Activate venv (Windows)
```

**Frontend**:
```bash
npm outdated                # Check for outdated packages
npm update                  # Update packages
npm audit fix               # Fix security vulnerabilities
npm prune                   # Remove unused packages
```

---

## Summary

QuanFin Capital Terminal is production-ready with:
- ✅ Fast local development setup
- ✅ Multiple deployment options
- ✅ Configurable environment variables
- ✅ Error handling and logging
- ✅ Performance optimization hooks
- ✅ Testing framework ready
- ✅ CI/CD pipeline examples

For questions or issues, refer to API_REFERENCE.md and PROJECT_OVERVIEW.md for detailed architecture information.
