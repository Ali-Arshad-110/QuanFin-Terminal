import sys
import os
import logging
import pandas as pd
import yfinance as yf
from datetime import datetime

# Setup path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.pulse_service import PulseScannerService

# Mocking logging for clean output
logging.basicConfig(level=logging.INFO)

def test_phase2():
    print("🚀 Initializing Phase 2 Verification...")
    scanner = PulseScannerService()
    
    # 1. Test 52W Warmup (Small Subset)
    scanner.fno_tickers = ["RELIANCE.NS", "HDFCBANK.NS", "TCS.NS"]
    scanner._warmup_milestones()
    
    print("\n📊 52-Week Cache Check:")
    for ticker, val in scanner.milestone_cache.items():
        print(f"   - {ticker}: 52W High={val['h52']:.2f}")

    # 2. Test Pattern Logic (Mock Data)
    print("\n🔍 Pattern Recognition Check:")
    # Hammer Simulation: Close > Open, Long Lower Shadow
    # open, high, low, close, prev_close, avg_vol, vol
    hammer = scanner._detect_pattern(100, 102, 90, 101, 100, 1000, 1000)
    print(f"   - Hammer Simulation: {hammer}")
    
    # Marubozu Simulation: Close >> Open, No shadows
    marubozu = scanner._detect_pattern(100, 110, 100, 110, 100, 1000, 1000)
    print(f"   - Marubozu Simulation: {marubozu}")

    # Volume Shocker Simulation
    shocker = scanner._detect_pattern(100, 101, 99, 100, 100, 1000, 4000)
    print(f"   - Volume Shocker Simulation: {shocker}")

if __name__ == "__main__":
    test_phase2()
