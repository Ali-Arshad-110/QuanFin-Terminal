"""
Paper Broker Implementation.

Mock broker for development and testing. No real money involved.
Perfect for building and testing without real broker credentials.
"""

import logging
import uuid
from datetime import datetime
from typing import Optional, Dict, List, Any
from .base_broker import BaseBroker

logger = logging.getLogger(__name__)


class PaperBroker(BaseBroker):
    """Mock broker for paper trading / development."""
    
    def __init__(self, initial_balance: float = 1000000.0):
        super().__init__("PaperBroker")
        self.initial_balance = initial_balance
        self.balance = initial_balance
        self.positions = {}  # symbol -> {quantity, avg_price, ...}
        self.orders = {}  # order_id -> order_data
        self.trades = []  # execution history
    
    async def login(self, credentials: Dict[str, Any]) -> bool:
        """
        Paper broker doesn't need real credentials.
        Just set logged_in flag.
        """
        logger.info("📄 Paper Broker: Mock login successful")
        self.is_logged_in = True
        self.access_token = "PAPER_MOCK_TOKEN"
        return True
    
    async def logout(self) -> bool:
        """Logout."""
        self.is_logged_in = False
        return True
    
    async def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Return mock quote (would use yfinance in real implementation).
        For now, return zero values.
        """
        return {
            "symbol": symbol,
            "ltp": 100.0,
            "change": 0.0,
            "changePercent": 0.0,
            "volume": 0,
            "timestamp": datetime.now().isoformat(),
            "source": "paper"
        }
    
    async def get_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Get quotes for multiple symbols."""
        return {
            sym: await self.get_quote(sym)
            for sym in symbols
        }
    
    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Place a paper order.
        Returns order confirmation immediately (in real broker, would be async).
        """
        order_id = str(uuid.uuid4())[:8]
        
        order = {
            "order_id": order_id,
            "symbol": order_data.get("symbol"),
            "quantity": order_data.get("quantity"),
            "price": order_data.get("price", 100.0),
            "order_type": order_data.get("order_type", "BUY"),
            "status": "ACCEPTED",
            "timestamp": datetime.now().isoformat()
        }
        
        self.orders[order_id] = order
        logger.info(f"📄 Paper Order Placed: {order_id} | {order['order_type']} {order['quantity']} {order['symbol']} @ {order['price']}")
        
        return {
            "order_id": order_id,
            "status": "success",
            "message": "Order accepted in paper trading mode"
        }
    
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an order."""
        if order_id in self.orders:
            self.orders[order_id]["status"] = "CANCELLED"
            logger.info(f"📄 Order Cancelled: {order_id}")
            return True
        return False
    
    async def get_positions(self) -> List[Dict[str, Any]]:
        """Get current open positions."""
        return [
            {
                "symbol": sym,
                "quantity": data.get("quantity"),
                "avg_price": data.get("avg_price"),
                "current_price": 100.0,
                "pnl": 0.0
            }
            for sym, data in self.positions.items()
        ]
    
    async def get_holdings(self) -> List[Dict[str, Any]]:
        """Get holdings (same as positions for paper broker)."""
        return await self.get_positions()
    
    async def get_order_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get order history."""
        return list(self.orders.values())[-limit:]
    
    async def get_trade_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get trade execution history."""
        return self.trades[-limit:]
    
    async def subscribe_live_data(self, symbols: List[str]) -> bool:
        """Subscribe to live data (no-op for paper broker)."""
        logger.info(f"📄 Subscribed to {len(symbols)} symbols in paper mode")
        return True
    
    async def unsubscribe_live_data(self, symbols: List[str]) -> bool:
        """Unsubscribe from live data."""
        return True
    
    def get_status(self) -> Dict[str, Any]:
        """Get paper broker status."""
        status = super().get_status()
        status.update({
            "balance": self.balance,
            "positions_count": len(self.positions),
            "orders_count": len(self.orders)
        })
        return status
