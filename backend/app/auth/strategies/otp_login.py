import os
import logging
import asyncio
from .base_auth import AuthStrategy
try:
    from neo_api_client import NeoAPI
except ImportError:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning("NeoAPI not found. OTP Login will degrade to REST-only.")
    NeoAPI = None

logger = logging.getLogger(__name__)

class OTPAuthStrategy(AuthStrategy):
    async def login(self):
        """
        Implements the 2-Step Login:
        1. Login with Mobile/UCC -> Get View Token
        2. Validate with MPIN -> Get Trade Token
        
        CRITICAL: Consumer Secret is OPTIONAL.
        If missing, we pass a placeholder or None to NeoAPI init, 
        but use Consumer Key for the initial REST calls if needed.
        """
        try:
            # Reload .env to pick up fresh TOTP
            from dotenv import load_dotenv
            load_dotenv(override=True)
            
            # 1. Gather Creds
            consumer_key = os.getenv("KOTAK_CONSUMER_KEY")
            consumer_secret = os.getenv("KOTAK_CONSUMER_SECRET", None) # Optional
            mobile = os.getenv("KOTAK_MOBILE")
            password = os.getenv("KOTAK_PASSWORD")
            mpin = os.getenv("KOTAK_MPIN", "")  # Numeric-only MPIN for Step 2
            ucc = os.getenv("KOTAK_UCC")
            
            # 2. Initialize Client
            # Note: The official NeoAPI client usually requires secret.
            # If user has no secret, we might need to rely on the 'kotak_service.py' 
            # REST implementation which manually does the handshake.
            
            # Let's leverage the existing solid logic in `kotak_service.py` 
            # but wrapped in this strategy for consistency.
            # This Avoids rewriting the tricky REST calls.
            
            from app.execution.kotak_service import KotakService
            # Temporarily instantiate service just for login logic
            # In a full refactor, we would move that logic here.
            # keeping it DRY by reusing the working service logic for now.
            
            ks = KotakService()
            
            # Step 1
            # Check for TOTP Secret (Preferred for Auto-Login)
            totp_secret = os.getenv("KOTAK_TOTP_SECRET")
            otp = None
            
            if totp_secret:
                try:
                    import pyotp
                    totp_generator = pyotp.TOTP(totp_secret)
                    otp = totp_generator.now()
                    logger.info(f"Generated TOTP for login: {otp}")
                except (ImportError, ModuleNotFoundError):
                    logger.error("CRITICAL: pyotp module missing. Cannot generate TOTP for automated login. Please run: pip install pyotp")
                except Exception as e:
                    logger.error(f"TOTP Generation Failed: {e}")
            
            # Fallback to static OTP or manual (less useful for auto-login)
            if not otp:
                otp = os.getenv("KOTAK_OTP") 
            
            if not otp:
                 logger.warning("No KOTAK_TOTP_SECRET or KOTAK_OTP in .env. Auto-Login will fail if 2FA is required.")
            
            # Step 1: Login
            res1 = ks.login_step1(mobile, ucc, otp, consumer_key, consumer_secret)
            if res1.get("status") != "success":
                return {"status": "error", "message": f"Step 1 Failed: {res1.get('message')}"}
                
            # Step 2
            # Use KOTAK_MPIN (numeric) for MPIN validation, fallback to KOTAK_PASSWORD
            step2_pin = mpin if mpin else password
            if not step2_pin or not step2_pin.isdigit():
                logger.error(f"MPIN must be numeric-only. Got: {'set but not numeric' if step2_pin else 'empty'}")
                return {"status": "error", "message": "KOTAK_MPIN must be set to a numeric-only PIN in .env"}
            res2 = ks.login_step2(step2_pin)
            if res2.get("status") != "success":
                 return {"status": "error", "message": f"Step 2 Failed: {res2.get('message')}"}
                 
            # Success
            return {
                "status": "success", 
                "data": res2.get("data"), 
                "client": ks.client # The initialized NeoAPI object
            }

        except Exception as e:
            logger.error(f"OTP Login Strategy Failed: {e}")
            return {"status": "error", "message": str(e)}
