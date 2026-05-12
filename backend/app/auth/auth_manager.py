import logging
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio

# Strategies
from .strategies.base_auth import AuthStrategy
from .strategies.otp_login import OTPAuthStrategy
from .strategies.broker_auth import BrokerAuthStrategy
# from app.auth.strategies.token_login import TokenAuthStrategy

# from app.market_data.service import MarketDataService # Moved to local scope to avoid circular import

logger = logging.getLogger(__name__)

class AuthManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AuthManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        # Prevent re-init
        if hasattr(self, "initialized"): return
        self.initialized = True
        self.session: Optional[Dict] = None
        self.client: Any = None
        self.strategy: Optional[AuthStrategy] = None
        self.session_file = "session_cache.json"
        
    def detect_strategy(self) -> AuthStrategy:
        """
        Auto-detect best strategy based on .env
        Priorities:
        1. Broker Strategy (if USE_BROKER_ABSTRACTION=true)
        2. Token (if Access Token exists and User explicitly wants to skip OTP)
        3. OTP (Standard Flow, using Consumer Key)
        """
        # Load env freshness
        from dotenv import load_dotenv
        load_dotenv()
        
        # Check if using new broker abstraction layer
        use_broker = os.getenv("USE_BROKER_ABSTRACTION", "false").lower() == "true"
        if use_broker:
            logger.info("Using new Broker Abstraction Layer")
            return BrokerAuthStrategy()
        
        # Otherwise use legacy OTP strategy
        c_key = os.getenv("KOTAK_CONSUMER_KEY")
        mobile = os.getenv("KOTAK_MOBILE")
        password = os.getenv("KOTAK_PASSWORD") # Or MPIN
        access_token = os.getenv("KOTAK_ACCESS_TOKEN")
        
        # If user has a hardcoded access token he wants to use directly
        # and specifically no mobile/password, use Token Strategy
        if access_token and not (mobile and password):
             logger.warning("Auth: Token Strategy removed. Please use OTP.")
             return OTPAuthStrategy()

        # Default to OTP Strategy (UCC + MPIN) which handles "No Secret" Correctly
        if mobile and password and os.getenv("KOTAK_UCC"):
            logger.info("Auth: Detected OTP Strategy (UCC + MPIN)")
            return OTPAuthStrategy()
            
        # Fallback
        logger.warning("Auth: No valid credentials found. Defaulting to OTP Strategy (will likely fail).")
        return OTPAuthStrategy()

    async def login(self):
        """
        Execute login using detected strategy.
        Supports both legacy OTP and new Broker Abstraction strategies.
        """
        try:
            strategy = self.detect_strategy()
            self.strategy = strategy
            
            logger.info(f"Attempting login via {strategy.__class__.__name__}...")
            result = await strategy.login()
            
            if result and result.get("status") == "success":
                self.session = result.get("data")
                
                # Handle broker instance from BrokerAuthStrategy
                if "broker" in result:
                    self.broker = result.get("broker")
                    self.client = self.broker  # For compatibility
                else:
                    # Legacy: client is neo_api_client instance
                    self.client = result.get("client")
                
                logger.info("✓ Login Successful")
                
                # Trigger Post-Login Actions (e.g. Connect WebSocket)
                await self._on_login_success()
                
                return self.session
            else:
                logger.error(f"Login Failed: {result.get('message')}")
                return None
                
        except Exception as e:
            logger.error(f"Auth Manager Exception: {e}")
            return None

    def get_client(self):
        return self.client
        
    def get_session(self):
        return self.session

    async def _on_login_success(self):
        """
        Hook to start services requiring auth.
        Starts MarketDataService and passes authenticated client.
        """
        try:
             from app.market_data.service import MarketDataService
             mds = MarketDataService()
             # Update the client reference so WS can use it
             # Use Any to bypass strict type check if the attribute is not explicitly in the class initially
             setattr(mds, 'client', self.client)
             await mds.start()
             logger.info("MarketDataService started after login")
        except Exception as e:
             logger.error(f"Post-login hook failed: {e}")

    # Watchdog
    async def session_watchdog(self):
        """
        Background task to check session validity and auto-renew.
        """
        while True:
            await asyncio.sleep(60) # Check every minute
            if self.session:
                # Logic to check expiry (if token has expiry time)
                # For now, simplistic check or ping
                pass

