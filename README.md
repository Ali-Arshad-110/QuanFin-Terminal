# QuanFin Terminal 📈

Advanced market stability analyzer and financial terminal with multi-dimensional 3D visualization.

![Terminal Overview](https://img.shields.io/badge/Status-Active-emerald)
![Tech](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20Plotly-blue)

## 🚀 Overview
QuanFin Terminal is a high-performance trading analytics dashboard designed for deep market stability research. It integrates real-time data from Indian markets (NSE/BSE) and provides unique 3D perspectives on Price-Volume dynamics.

### Key Features
- **3D Market Dynamics**: Multi-dimensional visualization of Price, Volume, and Time.
- **Stability Analyzer**: Real-time tracking of Major Indices (Nifty 50, Sensex, Bank Nifty).
- **Interactive Charts**: Professional-grade charting with session breaks and IST synchronization.
- **Fundamental Insights**: Integrated sector analysis and stock fundamentals.
- **Responsive Terminal**: High-density UI designed for professional traders.

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React.
- **Backend**: FastAPI, Python, NeoAPI (Kotak Securities), yfinance.
- **Visualization**: Plotly.js for 3D and 2D analytics.
- **State Management**: Zustand with persistence.

## 📦 Installation & Setup

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```
*Note: Ensure your `.env` file is configured with your Kotak API credentials.*

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

## 📂 Project Structure
- `/frontend`: React application and UI components.
- `/backend`: FastAPI server, data fetching logic, and broker integrations.
- `/docs`: Detailed architecture and implementation summaries.

## 🛡️ Security
## 📄 License
Private Repository - All Rights Reserved.
