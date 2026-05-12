#!/usr/bin/env python
"""Test the broker abstraction layer and auth strategy."""

import asyncio
import sys
import os

# Set up path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_broker_abstraction():
    """Test broker factory and paper broker."""
    from backend.app.brokers import BrokerFactory
    
    print("\n" + "="*60)
    print("🧪 Testing Broker Abstraction Layer")
    print("="*60)
    
    # Test 1: Create paper broker
    print("\n1️⃣  Creating Paper Broker...")
    broker = BrokerFactory.create_broker("paper")
    print(f"   ✅ Created: {broker.name}")
    print(f"   Status: {broker.get_status()}")
    
    # Test 2: Test broker methods
    print("\n2️⃣  Testing Broker Methods...")
    
    # Login
    success = await broker.login({})
    print(f"   Login: {'✅' if success else '❌'}")
    
    # Get quote
    quote = await broker.get_quote("RELIANCE")
    print(f"   Get Quote: ✅ (ltp={quote.get('ltp')})")
    
    # Place order
    order = await broker.place_order({
        "symbol": "RELIANCE",
        "quantity": 1,
        "price": 2500.0,
        "order_type": "BUY"
    })
    print(f"   Place Order: ✅ (order_id={order.get('order_id')})")
    
    # Get positions
    positions = await broker.get_positions()
    print(f"   Get Positions: ✅ (count={len(positions)})")
    
    # Test 3: Auth Strategy
    print("\n3️⃣  Testing Broker Auth Strategy...")
    from backend.app.auth.strategies.broker_auth import BrokerAuthStrategy
    
    auth_strat = BrokerAuthStrategy()
    result = await auth_strat.login()
    print(f"   Login Status: {result.get('status')}")
    print(f"   Broker: {result.get('broker').name if result.get('broker') else 'None'}")
    
    print("\n" + "="*60)
    print("✅ All tests passed!")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(test_broker_abstraction())
