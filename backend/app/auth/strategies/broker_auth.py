"""
Broker-Based Auth Strategy.

Uses the new broker abstraction layer to support multiple brokers.
Replaces direct KotakService usage with modular broker implementations.
"""

import os
import logging
from .base_auth import AuthStrategy
from app.brokers import BrokerFactory

logger = logging.getLogger(__name__)


class BrokerAuthStrategy(AuthStrategy):
    """Auth strategy using the broker abstraction layer."""
    
    async def login(self):
        """
        Login using the configured broker.
        Supports paper, kotak, zerodha, upstox, etc.
        """
        try:
            from dotenv import load_dotenv
            load_dotenv(override=True)
            
            # Get broker to use (defaults to paper)
            broker_name = os.getenv("BROKER", "paper").lower()
            logger.info(f"Attempting login via {broker_name} broker...")
            
            # Create broker instance
            broker = BrokerFactory.create_broker(broker_name)
            
            # Prepare credentials based on broker type
            credentials = self._prepare_credentials(broker_name)
            
            # Attempt login
            login_success = await broker.login(credentials)
            
            if not login_success:
                return {
                    "status": "error",
                    "message": f"Login failed for broker: {broker_name}"
                }
            
            logger.info(f"✅ Login successful for {broker_name}")
            
            return {
                "status": "success",
                "data": broker.get_status(),
                "broker": broker
            }
            
        except Exception as e:
            logger.error(f"Broker Auth Strategy Exception: {e}")
            return {"status": "error", "message": str(e)}
    
    def _prepare_credentials(self, broker_name: str) -> dict:
        """Prepare credentials based on broker type."""
        
        if broker_name == "kotak":
            return {
                "client_id": os.getenv("KOTAK_UCC"),
                "password": os.getenv("KOTAK_PASSWORD"),
                "consumer_key": os.getenv("KOTAK_CONSUMER_KEY"),
                "consumer_secret": os.getenv("KOTAK_CONSUMER_SECRET"),
                "totp_secret": os.getenv("KOTAK_TOTP_SECRET"),
                "mpin": os.getenv("KOTAK_MPIN")
            }
        
        elif broker_name == "zerodha":
            return {
                "api_key": os.getenv("ZERODHA_API_KEY"),
                "api_secret": os.getenv("ZERODHA_API_SECRET"),
                "user_id": os.getenv("ZERODHA_USER_ID"),
                "password": os.getenv("ZERODHA_PASSWORD")
            }
        
        elif broker_name == "upstox":
            return {
                "api_key": os.getenv("UPSTOX_API_KEY"),
                "api_secret": os.getenv("UPSTOX_API_SECRET"),
                "redirect_uri": os.getenv("UPSTOX_REDIRECT_URI")
            }
        
        else:  # paper broker
            return {}
