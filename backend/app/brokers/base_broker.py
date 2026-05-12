"""
Base Broker Interface.

All broker implementations must inherit from this and implement these methods.
This allows easy switching between brokers without changing core business logic.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, List, Any


class BaseBroker(ABC):
    """Abstract base class for broker implementations."""
    
    def __init__(self, name: str):
        self.name = name
        self.is_logged_in = False
        self.session = None
        self.access_token = None
    
    @abstractmethod
    async def login(self, credentials: Dict[str, Any]) -> bool:
        """
        Authenticate with the broker.
        
        Args:
            credentials: Dict with broker-specific credentials
        
        Returns:
            bool: True if login successful
        """
        pass
    
    @abstractmethod
    async def logout(self) -> bool:
        """Logout from the broker."""
        pass
    
    @abstractmethod
    async def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get current quote for a symbol.
        
        Returns:
            {ltp, change, changePercent, volume, ...}
        """
        pass
    
    @abstractmethod
    async def get_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Get quotes for multiple symbols at once."""
        pass
    
    @abstractmethod
    async def place_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Place an order.
        
        Args:
            order_data: {symbol, quantity, price, order_type, ...}
        
        Returns:
            {order_id, status, message}
        """
        pass
    
    @abstractmethod
    async def cancel_order(self, order_id: str) -> bool:
        """Cancel an existing order."""
        pass
    
    @abstractmethod
    async def get_positions(self) -> List[Dict[str, Any]]:
        """Get current open positions."""
        pass
    
    @abstractmethod
    async def get_holdings(self) -> List[Dict[str, Any]]:
        """Get holding (long-term) positions."""
        pass
    
    @abstractmethod
    async def get_order_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get order history."""
        pass
    
    @abstractmethod
    async def get_trade_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get trade execution history."""
        pass
    
    @abstractmethod
    async def subscribe_live_data(self, symbols: List[str]) -> bool:
        """Subscribe to real-time market data for symbols."""
        pass
    
    @abstractmethod
    async def unsubscribe_live_data(self, symbols: List[str]) -> bool:
        """Unsubscribe from live market data."""
        pass
    
    def get_status(self) -> Dict[str, Any]:
        """Get broker status."""
        return {
            "broker": self.name,
            "logged_in": self.is_logged_in,
            "has_access_token": self.access_token is not None
        }
