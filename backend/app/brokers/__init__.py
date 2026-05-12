"""
Broker Factory.

Provides a single place to create and manage broker instances.
Supports broker switching via environment variables.
"""

import os
import logging
from typing import Optional
from .base_broker import BaseBroker
from .paper_broker import PaperBroker
from .kotak_broker import KotakBroker

logger = logging.getLogger(__name__)


class BrokerFactory:
    """Factory for creating broker instances."""
    
    _current_broker: Optional[BaseBroker] = None
    
    @classmethod
    def get_broker(cls, broker_name: Optional[str] = None) -> BaseBroker:
        """
        Get or create a broker instance.
        
        Args:
            broker_name: Broker to use. If None, uses BROKER env var or defaults to "paper"
        
        Returns:
            BaseBroker instance (PaperBroker by default)
        """
        if cls._current_broker is not None:
            return cls._current_broker
        
        if broker_name is None:
            broker_name = os.getenv("BROKER", "paper").lower()
        
        return cls.create_broker(broker_name)
    
    @classmethod
    def create_broker(cls, broker_name: str) -> BaseBroker:
        """
        Create a new broker instance.
        
        Args:
            broker_name: "paper", "kotak", "zerodha", "upstox", etc.
        
        Returns:
            BaseBroker instance
        """
        broker_name = broker_name.lower()
        
        if broker_name == "paper":
            logger.info("🗒️ Using Paper Broker (mock trading)")
            cls._current_broker = PaperBroker()
        
        elif broker_name == "kotak":
            logger.info("🏦 Using Kotak Securities Broker")
            cls._current_broker = KotakBroker()
        
        elif broker_name == "zerodha":
            logger.info("🏦 Using Zerodha Broker (not yet implemented)")
            # TODO: Implement ZerodhaBroker
            cls._current_broker = PaperBroker()
        
        elif broker_name == "upstox":
            logger.info("🏦 Using Upstox Broker (not yet implemented)")
            # TODO: Implement UpstoxBroker
            cls._current_broker = PaperBroker()
        
        else:
            logger.warning(f"Unknown broker '{broker_name}', falling back to Paper")
            cls._current_broker = PaperBroker()
        
        return cls._current_broker
    
    @classmethod
    def set_broker(cls, broker: BaseBroker) -> None:
        """Manually set the broker instance."""
        cls._current_broker = broker
    
    @classmethod
    def reset(cls) -> None:
        """Reset the broker instance."""
        cls._current_broker = None
