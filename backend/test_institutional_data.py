import sys
import os
import json
from datetime import datetime

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

try:
    from app.services.institutional_intelligence_service import InstitutionalIntelligenceService
    
    print("--- [VERIFYING INSTITUTIONAL INTELLIGENCE SERVICE] ---")
    
    # 1. Test FII/DII Activity
    print("\n[1/3] Fetching FII/DII Activity...")
    fii_dii = InstitutionalIntelligenceService.get_fii_dii_activity()
    print(f"Date: {fii_dii.get('date')}")
    print(f"FII Net: {fii_dii.get('fii_net')} Cr")
    print(f"DII Net: {fii_dii.get('dii_net')} Cr")
    print(f"Provisional: {fii_dii.get('is_provisional')}")

    # 2. Test Big Deals
    print("\n[2/3] Fetching Big Deals (Bulk/Block)...")
    deals = InstitutionalIntelligenceService.get_big_deals()
    print(f"Total Deals Found: {len(deals)}")
    if deals:
        for i, deal in enumerate(deals[:3]):
            print(f" - Deal {i+1}: {deal['symbol']} | {deal['transactionType']} | {deal['type']} | {deal['price']}")
    else:
        print("Note: No deals found (might be post-market/holiday)")

    # 3. Test Cache TTL
    print("\n[3/3] Testing Cache (Should be instantaneous)...")
    start = datetime.now()
    InstitutionalIntelligenceService.get_fii_dii_activity()
    end = datetime.now()
    print(f"Cache return took: {(end - start).total_seconds()} seconds")

    print("\n[SUCCESS] Backend Verification Complete.")

except Exception as e:
    print(f"\n[ERROR] Verification failed: {e}")
    import traceback
    traceback.print_exc()
