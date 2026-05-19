import logging
import sys
import os
import json
import urllib.request
import urllib.error
import urllib.parse

try:
    from neo_api_client import NeoAPI  # type: ignore[import]
    logging.info("✓ NeoAPI loaded successfully")
except ImportError as e:
    logging.warning(f"NeoAPI not available (optional): {e}. Broker streaming will degrade gracefully.")
    NeoAPI = None

logger = logging.getLogger(__name__)

class KotakService:
    def __init__(self):
        self.client = None
        self.is_logged_in = False
        self.access_token = None
        self.view_token = None
        self.trade_token = None
        self.sid_view = None
        self.sid_trade = None
        self.base_url = "https://mis.kotaksecurities.com"

    def initialize_client(self, consumer_key, consumer_secret=None, environment='PROD'):
        # Store the Access Token (Consumer Key)
        self.access_token = consumer_key
        logger.info(f"Initialized with Access Token: {consumer_key[:4]}... (Secret ignored as per new blueprint)")
        return True, "Initialized"

    def _make_request(self, method, url, headers=None, data=None):
        """Helper to make HTTP requests using urllib"""
        try:
            if headers is None: headers = {}
            
            body = None
            if data is not None:
                body = json.dumps(data).encode('utf-8')
                if 'Content-Type' not in headers:
                    headers['Content-Type'] = 'application/json'
            
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
            
            with urllib.request.urlopen(req, timeout=10) as response:
                resp_body = response.read().decode('utf-8')
                return {"status_code": response.status, "text": resp_body, "json": json.loads(resp_body) if resp_body else {}}
        except urllib.error.HTTPError as e:
            resp_body = e.read().decode('utf-8')
            logger.error(f"HTTP Error {e.code}: {resp_body}")
            try:
                json_body = json.loads(resp_body)
            except:
                json_body = {}
            return {"status_code": e.code, "text": resp_body, "json": json_body, "error": True}
        except Exception as e:
            logger.error(f"Request Failed: {e}")
            return {"error": str(e)}

    def login_step1(self, mobile_number, ucc, totp, consumer_key, consumer_secret=None, environment='PROD'):
        """
        Step 1: TOTP Login
        Endpoint: https://mis.kotaksecurities.com/login/1.0/tradeApiLogin
        """
        try:
            # Ensure we have the token
            self.access_token = consumer_key
            
            # Sanitize Mobile Number
            # API expects +91XXXXXXXXXX
            if mobile_number:
                mobile_number = str(mobile_number).strip()
                if len(mobile_number) == 10:
                    mobile_number = f"+91{mobile_number}"
                elif len(mobile_number) == 12 and mobile_number.startswith("91"):
                    mobile_number = f"+{mobile_number}"
            
            url = f"{self.base_url}/login/1.0/tradeApiLogin"
            headers = {
                "Authorization": self.access_token,
                "neo-fin-key": "neotradeapi",
                "Content-Type": "application/json"
            }
            payload = {
                "mobileNumber": mobile_number,
                "ucc": ucc,
                "totp": totp
            }
            
            logger.info(f"Step 1 Login Request to {url} for UCC: {ucc}")
            # Replace requests.post
            resp = self._make_request("POST", url, headers=headers, data=payload)
            
            # Initialize NeoAPI Client wrapper in background to avoid blocking response
            if NeoAPI and not self.client:
                def init_neo_bg():
                    try:
                        c_secret = consumer_secret if consumer_secret else "placeholder_secret"
                        self.client = NeoAPI(consumer_key=consumer_key, consumer_secret=c_secret, environment=environment)
                        logger.info("✓ NeoAPI Client wrapper initialized (background)")
                    except Exception as e:
                        logger.error(f"Failed to init NeoAPI client wrapper: {e}")

                import threading
                t = threading.Thread(target=init_neo_bg, daemon=True)
                t.start()
                logger.info("Started NeoAPI Client init in background thread")

            if "error" in resp and resp.get("error") is True and "json" not in resp:
                 return {"status": "error", "message": resp["error"]}

            # Parse Response
            data = resp.get("json", {})
            if not data:
                 return {"status": "error", "message": f"Invalid Response: {resp.get('text')}"}
            
            # Helper: Check for nested "data" string that might contain error JSON
            # Kotak sometimes returns: {"data": "{\"data\":{\"Code\":401,\"Message\":\"...\"}}"}
            inner_data_str = data.get("data")
            if isinstance(inner_data_str, str):
                try:
                    inner_parsed = json.loads(inner_data_str)
                    if isinstance(inner_parsed, dict) and "data" in inner_parsed:
                         # Double nested?
                         inner_data = inner_parsed["data"]
                         if inner_data.get("Code") == 401 or inner_data.get("Message", "").lower().startswith("error"):
                             return {"status": "error", "message": inner_data.get("Message", "Session Init Failed")}
                except:
                    pass

            if data.get("status") == "error":
                return {"status": "error", "message": data.get("message", "Unknown Error")}
                
            # Success Logic
            if "data" in data and isinstance(data["data"], dict) and data["data"].get("status") == "success":
                inner = data["data"]
                self.view_token = inner.get("token")
                self.sid_view = inner.get("sid")
                
                return {"status": "success", "message": "Login Initiated. Proceed to MPIN.", "data": data}
            elif "data" in data and isinstance(data["data"], dict) and "token" in data["data"]:
                 # Direct success structure variance?
                 inner = data["data"]
                 self.view_token = inner.get("token")
                 self.sid_view = inner.get("sid")
                 return {"status": "success", "message": "Login Initiated. Proceed to MPIN.", "data": data}
            else:
                 # Fallback error extraction
                 msg = f"Login Failed: {data}"
                 if isinstance(data.get("data"), dict):
                      msg = data["data"].get("message", msg)
                 return {"status": "error", "message": msg}

        except Exception as e:
            logger.error(f"Login Step 1 failed: {str(e)}")
            return {"status": "error", "message": str(e)}

    def login_step2(self, mpin):
        """
        Step 2: MPIN Validation
        Endpoint: https://mis.kotaksecurities.com/login/1.0/tradeApiValidate
        """
        if not self.sid_view or not self.view_token:
             return {"status": "error", "message": "Step 1 not completed or failed. Missing SID/ViewToken."}
        
        try:
            mpin_clean = str(mpin).strip()
            url = f"{self.base_url}/login/1.0/tradeApiValidate"
            headers = {
                "Authorization": self.access_token,
                "neo-fin-key": "neotradeapi",
                "sid": self.sid_view,
                "Auth": self.view_token,
                "Content-Type": "application/json"
            }
            payload = {
                "mpin": mpin_clean
            }
            
            logger.info(f"Step 2 Login Request to {url} (MPIN length: {len(mpin_clean)})")
            resp = self._make_request("POST", url, headers=headers, data=payload)

            data = resp.get("json", {})
            if not data:
                 logger.error(f"❌ Step2 Invalid Response: {resp.get('text')}")
                 return {"status": "error", "message": f"Invalid Response: {resp.get('text')}"}
                 
            if data.get("status") == "error":
                 logger.error(f"❌ Step2 API Error: {data.get('message')}")
                 return {"status": "error", "message": data.get("message", "Unknown Error")}
                 
            # Log full response for debugging
            logger.info(f"Step2 Response Data: {data}")
            logger.info(f"Step2 Response Keys: {data.keys() if isinstance(data, dict) else 'not a dict'}")
            
            if "data" in data and isinstance(data["data"], dict) and data["data"].get("status") == "success":
                inner = data["data"]
                self.trade_token = inner.get("token")
                self.sid_trade = inner.get("sid")
                self.base_url = inner.get("baseUrl", self.base_url)
                server_id = inner.get("hsServerId")
                
                logger.info(f"✓ Step2 Success: trade_token={self.trade_token}, sid_trade={self.sid_trade}")
                
                # Update NeoAPI client wrapper with session details to enable helper methods (search, etc)
                # Ensure NeoAPI init is complete (handle race condition from background thread)
                if not self.client and NeoAPI:
                    logger.info("⏳ NeoAPI client not ready yet in Step 2. Initializing now...")
                    try:
                        # Re-use stored access token if available, or just proceed with basic init
                        # We don't have consumer_secret handy here easily unless we stored it.
                        # Assuming background thread *should* have done it or failed.
                        # If failed, we try a basic init with placeholder secret as helper methods need it.
                        c_key = self.access_token if self.access_token else "placeholder_key"
                        self.client = NeoAPI(consumer_key=c_key, consumer_secret="placeholder_secret", environment='PROD')
                        logger.info("✓ NeoAPI Client wrapper force-initialized in Step 2")
                    except Exception as e:
                        logger.error(f"Failed to force-init NeoAPI client: {e}")

                if self.client:
                    try:
                        self.client.configuration.edit_token = self.trade_token
                        self.client.configuration.edit_sid = self.sid_trade
                        if server_id:
                            self.client.configuration.serverId = server_id
                        logger.info("✓ NeoAPI Client wrapper hydrated with session tokens")
                    except Exception as e:
                        logger.error(f"Failed to hydrate NeoAPI client: {e}")

                # VERIFY we actually got the required tokens
                if not self.trade_token or not self.sid_trade:
                    logger.error(f"❌ Step2 SUCCESS but MISSING TOKENS!")
                    logger.error(f"   - trade_token: {self.trade_token}")
                    logger.error(f"   - sid_trade: {self.sid_trade}")
                    logger.error(f"   - Response was: {inner}")
                    return {
                        "status": "warning",
                        "message": "Login appears successful but authentication tokens were not provided by broker. Try again.",
                        "data": data
                    }
                
                self.is_logged_in = True
                
                return {"status": "success", "message": "Logged in successfully", "data": data}
            else:
                logger.error(f"❌ Step2 Parsing Failed. Response structure: {data}")
                logger.error(f"   - Looking for 'data.data.status == success'")
                logger.error(f"   - But got: {data.get('data', {})}")
                return {"status": "error", "message": f"MPIN Validation Failed: {data}"}

        except Exception as e:
             logger.error(f"MPIN Validation failed: {str(e)}")
             return {"status": "error", "message": str(e)}

    def get_holdings(self):
        if not self.is_logged_in:
            return None
        
        try:
            url = f"{self.base_url}/portfolio/1.0/holdings"
            headers = {
                "Authorization": self.access_token,
                "neo-fin-key": "neotradeapi",
                "sid": self.sid_trade,
                "Auth": self.trade_token,
                "Content-Type": "application/json"
            }
            
            logger.info(f"Fetching Holdings from {url}")
            resp = self._make_request("GET", url, headers=headers)
            
            if resp.get("status_code") != 200:
                logger.error(f"Holdings Fetch Failed: {resp.get('status_code')} {resp.get('text')}")
                return {"error": f"Failed: {resp.get('status_code')}"}
                
            data = resp.get("json", {})
            
            # Map to Frontend Format
            # Expected: tradingsymbol, quantity, average_price, last_price, product
            mapped_holdings = []
            
            if "data" in data and isinstance(data["data"], list):
                 for h in data["data"]:
                     # Kotak keys usually: tradingSymbol, rhQuantity (or quantity), averagePrice, ltp
                     # Check keys in log if this fails, but guessing standard camelCase
                     
                     quantity = float(h.get("quantity", h.get("holdQuantity", 0)))
                     if quantity == 0: continue # Skip empty
                     
                     mapped_holdings.append({
                         "tradingsymbol": h.get("tradingSymbol", h.get("symbol", "Unknown")),
                         "quantity": quantity,
                         "average_price": float(h.get("averagePrice", 0.0)),
                         "last_price": float(h.get("ltp", h.get("lastPrice", 0.0))),
                         "product": h.get("product", "CNC"),
                         "pnl": 0.0 # Calculated on frontend usually, but placeholder
                     })
                 
                 return {"status": "success", "data": mapped_holdings}

            if data.get("st") == "ok" or data.get("status") == "success": 
                 return data # Return raw if structure unknown/empty
            else:
                 return {"error": f"API Error: {data}"}

        except Exception as e:
            logger.error(f"Error fetching holdings: {e}")
            return {"error": str(e)}

    def get_positions(self):
        if not self.is_logged_in:
            return None
        
        try:
            url = f"{self.base_url}/portfolio/1.0/positions"
            headers = {
                "Authorization": self.access_token,
                "neo-fin-key": "neotradeapi",
                "sid": self.sid_trade,
                "Auth": self.trade_token,
                "Content-Type": "application/json"
            }
            
            logger.info(f"Fetching Positions from {url}")
            resp = self._make_request("GET", url, headers=headers)
            
            if resp.get("status_code") != 200:
                logger.error(f"Positions Fetch Failed: {resp.get('status_code')} {resp.get('text')}")
                return {"error": f"Failed: {resp.get('status_code')}"}
                
            data = resp.get("json", {})
            
            # Map to Frontend Format
            # Expected: tradingsymbol, quantity, average_price, last_price, pnl, product, transaction_type
            mapped_positions = []
            
            if "data" in data and isinstance(data["data"], list):
                for p in data["data"]:
                    # Kotak Position Keys: tradingSymbol, netQty, avgPrice, ltp, netAmt (pnl maybe?)
                    qty = int(p.get("netQty", p.get("quantity", 0)))
                    
                    if qty != 0:
                        mapped_positions.append({
                            "tradingsymbol": p.get("tradingSymbol", p.get("symbol", "Unknown")),
                            "quantity": qty,
                            "average_price": float(p.get("averagePrice", p.get("avgPrice", 0.0))),
                            "last_price": float(p.get("ltp", 0.0)),
                            "product": p.get("product", "MIS"),
                            "transaction_type": "BUY" if qty > 0 else "SELL",
                            "pnl": float(p.get("pnl", p.get("netAmt", 0.0))) # or calculate
                        })
            
                return {"status": "success", "data": mapped_positions}

            return data

        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return {"error": str(e)}
            
    def get_funds(self):
        if not self.is_logged_in:
            return None
        if not self.client:
            logger.warning("get_funds: NeoAPI client not available (optional dependency missing)")
            return {"error": "NeoAPI client not initialized", "data": {"net": 0, "available": 0}}
        try:
            return self.client.limits()
        except Exception as e:
            logger.error(f"Error fetching funds: {e}")
            return {"error": str(e)}
             
    def get_instrument_token(self, symbol):
        """
        Resolve a UI symbol (e.g. RELIANCE.NS) to a Kotak Instrument Token.
        Delegates to ContractResolver (PostgreSQL).
        Returns: (token, exchange_segment) or (None, None)
        """
        # Lazy import to avoid circular dependency
        from app.services.contract_resolver import ContractResolver
        
        try:
            # Clean symbol handled by resolver normalizer
            # Resolution returns (token, segment, lot_size)
            result = ContractResolver.resolve(symbol)
            
            if result:
                return result[0], result[1] # token, segment
                
            return None, None

        except Exception as e:
            logger.error(f"Resolution failed for {symbol}: {e}")
            return None, None

    def get_historical_data(self, symbol, interval="1d", period="1mo"):
        """
        Fetch OHLCV data for charts.
        Endpoint: https://mis.kotaksecurities.com/charts/1.0/charts
        """
        # Allow chart fetch attempt (will fail gracefully if auth tokens missing)
        if not self.access_token or self.access_token == "PENDING_LOGIN":
            # Silent return
            return None
        
        try:
            # 1. Resolve Token
            logger.info(f"Resolving token for symbol: {symbol}")
            token, exchange_segment = self.get_instrument_token(symbol)
            
            if not token:
                 logger.error(f"❌ Could not resolve token for {symbol}. Token resolution failed.")
                 logger.info(f"Returning None - will fallback to Yahoo Finance in main.py")
                 return None
            
            logger.info(f"✓ Resolved {symbol} -> Token: {token}, Segment: {exchange_segment}")

            # 2. Map Interval
            interval_map = {
                "1m": "1", "5m": "5", "15m": "15", "30m": "30", "1h": "60",
                "1d": "D", "1wk": "W", "1mo": "M"
            }
            resolution = interval_map.get(interval, "D")
            
            # 3. Calculate From/To
            import time
            from datetime import datetime
            to_time = int(time.time())
            
            seconds_per_day = 86400
            if interval == "1m": duration = 30 * seconds_per_day # 30 Days for 1m
            elif interval in ["5m", "15m", "30m", "60m", "1h"]: duration = 180 * seconds_per_day # 6 months
            else: duration = 1825 * seconds_per_day # 5 Years
            
            from_time = to_time - duration
            
            # 4. Check for required auth tokens for chart API
            if not self.sid_trade or not self.trade_token:
                logger.error(f"❌ Missing authentication tokens for chart data: sid_trade={self.sid_trade}, trade_token={self.trade_token}")
                logger.error(f"Reason: Broker not fully authenticated. Need to call login-step1 and login-step2 first.")
                return None
            
            # 4. Make Request
            url = f"{self.base_url}/charts/1.0/charts"
            headers = {
                "Authorization": self.access_token,
                "neo-fin-key": "neotradeapi",
                "sid": self.sid_trade,
                "Auth": self.trade_token,
                "Content-Type": "application/json"
            }
            params = {
                "instId": token,
                "exchSeg": exchange_segment,
                "symbol": symbol.replace(".NS", ""),
                "resolution": resolution,
                "from": from_time,
                "to": to_time
            }
            
            logger.info(f"📊 Fetching chart data from {url} for {symbol} (resolution: {resolution})")
            resp = self._make_request("POST", url, headers=headers, data=params)
            
            if resp.get("status_code") != 200:
                logger.error(f"❌ History Fetch Failed: {resp.get('status_code')} - {resp.get('text')}")
                logger.info(f"Returning None - will fallback to Yahoo Finance in main.py")
                return None

            data = resp.get("json", {})
            
            # 5. Parse Data
            if "data" in data and "candles" in data["data"]:
                 candles = data["data"]["candles"]
                 results = []
                 for c in candles:
                     if len(c) >= 6:
                         # Kotak Format: [Timestamp, Open, High, Low, Close, Volume]
                         # Timestamp is usually epoch seconds
                         ts = int(c[0])
                         dt_iso = datetime.utcfromtimestamp(ts).isoformat() + "Z"
                         
                         results.append({
                             "date": dt_iso, 
                             "time": ts, # Explicit time field for lightweight-charts
                             "open": float(c[1]),
                             "high": float(c[2]),
                             "low": float(c[3]),
                             "close": float(c[4]),
                             "volume": int(c[5]),
                             "timestamp": ts
                         })
                 return results

            return None

        except Exception as e:
            logger.error(f"Error fetching history: {e}")
            return None

    def place_order(self, symbol, qty, side="BUY", product="MIS", price=0.0):
        # Implementation for placing order
        pass

    def get_quotes(self, symbols: list):
        """
        Fetch quotes using Token-based API.
        1. Resolve symbols to tokens using Local Master.
        2. Call Client.quotes()
        """
        if not self.is_logged_in:
             return {"status": "error", "message": "Not logged in"}
        
        # Lazy import
        from app.services.contract_resolver import ContractResolver

        try:
            # 1. Resolve Tokens
            req_items = []
            map_token_sym = {} 
            
            for sym in symbols:
                # Handle special index encoding e.g. "nse_idx|Nifty 50"
                search_sym = sym
                if "|" in sym:
                    search_sym = sym.split("|")[1]
                
                # Use ContractResolver
                res = ContractResolver.resolve(search_sym)
                
                if res:
                    token, seg, _ = res
                    # Specific format required by neo_api_client.quotes()
                    # list of dicts: {'instrument_token': '...', 'exchange_segment': '...', 'quote_type': 'ltp'}
                    req_items.append({
                        "instrument_token": str(token),
                        "exchange_segment": seg,
                        "quote_type": "ltp"
                    })
                    map_token_sym[str(token)] = sym
                else:
                    logger.warning(f"Could not resolve symbol for quote: {sym}")

            if not req_items:
                return {"status": "success", "data": {}}

            # 2. Fetch Quotes
            # Using self.client.quotes if available, or fallback to REST logic
            if self.client:
                # NeoAPI quotes method
                resp = self.client.quotes(instrument_tokens=req_items)
                
                # resp is typically a list of dicts or a dict with 'message'/'data'
                # Let's handle list input (NeoAPI standard)
                data = []
                if isinstance(resp, list):
                    data = resp
                elif isinstance(resp, dict) and "data" in resp:
                    data = resp["data"]
                elif isinstance(resp, dict) and "message" in resp: # Error?
                     return {"status": "error", "message": resp.get("message")}
                
                results = {}
                for item in data:
                    t = item.get("instrument_token")
                    if t and t in map_token_sym:
                        sym = map_token_sym[t]
                        results[sym] = {
                            "price": float(item.get('ltp', 0)),
                            "change": float(item.get('change_net', item.get('change', 0))),
                            "changePercent": float(item.get('change_percent', item.get('pc', 0))),
                            "volume": int(item.get('volume', item.get('v', 0))),
                            "open": float(item.get('open', 0)),
                            "high": float(item.get('high', 0)),
                            "low": float(item.get('low', 0)),
                            "close": float(item.get('close', 0)),
                            "token": t
                        }
                
                return {"status": "success", "data": results}
            
            else:
                return {"status": "error", "message": "NeoClient not initialized"}

        except Exception as e:
            logger.error(f"Quote Token fetch failed: {str(e)}")
            return {"status": "error", "message": str(e)}

    def get_contract_details(self, symbol):
        """
        Fetch static/cached contract details for a commodity.
        Returns: Dict with lot_size, expiry, tick_size, margin etc.
        """
        # Static definitions for common commodities (Feb 2026 as per user context)
        # In a real app, this would be fetched from a Master API or DB
        
        # Lazy import
        from app.services.contract_resolver import ContractResolver

        # 1. Try DB Resolution first
        db_details = ContractResolver.get_instrument_details(symbol)
        
        # Clean symbol to base name for fallback defaults
        base = symbol.split("26")[0] # e.g. CRUDEOIL26... -> CRUDEOIL
        if base.endswith("FUT"): base = base.replace("FUT", "") # Extra safety
        
        defaults = {
            "CRUDEOIL": {
                "lot_size": 100, 
                "tick_size": 1.00, 
                "unit": "BBL", 
                "initial_margin": 250000, 
                "delivery": "Cash Settled"
            },
            "GOLD": {
                "lot_size": 1, "tick_size": 1.00, "unit": "KG", "initial_margin": 600000, "delivery": "Physical"
            },
            "GOLDM": {
                "lot_size": 10, "tick_size": 1.00, "unit": "10 GMS", "initial_margin": 60000, "delivery": "Cash Settled"
            },
            "GOLDPETAL": {
                "lot_size": 1, "tick_size": 1.00, "unit": "1 GM", "initial_margin": 6000, "delivery": "Cash Settled"
            },
            "GOLDGUINEA": {
                "lot_size": 8, "tick_size": 1.00, "unit": "8 GMS", "initial_margin": 50000, "delivery": "Cash Settled"
            },
            "SILVER": {
                "lot_size": 30, "tick_size": 1.00, "unit": "KG", "initial_margin": 250000, "delivery": "Physical"
            },
            "SILVERM": {
                "lot_size": 5, "tick_size": 1.00, "unit": "KG", "initial_margin": 45000, "delivery": "Cash Settled"
            },
            "SILVERMIC": {
                "lot_size": 1, "tick_size": 1.00, "unit": "KG", "initial_margin": 9000, "delivery": "Cash Settled"
            },
            "NATURALGAS": {
                "lot_size": 1250, "tick_size": 0.10, "unit": "mmBtu", "initial_margin": 150000, "delivery": "Cash Settled"
            },
            "NATGASMINI": {
                "lot_size": 250, "tick_size": 0.10, "unit": "mmBtu", "initial_margin": 30000, "delivery": "Cash Settled"
            },
            "COPPER": {
                "lot_size": 2500, "tick_size": 0.05, "unit": "KG", "initial_margin": 200000, "delivery": "Physical"
            },
            "ZINC": {
                "lot_size": 5000, "tick_size": 0.05, "unit": "KG", "initial_margin": 150000, "delivery": "Physical"
            },
            "ZINCM": {
                "lot_size": 1000, "tick_size": 0.05, "unit": "KG", "initial_margin": 30000, "delivery": "Cash Settled"
            },
            "ALUMINIUM": {
                "lot_size": 5000, "tick_size": 0.05, "unit": "KG", "initial_margin": 130000, "delivery": "Physical"
            },
            "ALUMINIUMM": {
                "lot_size": 1000, "tick_size": 0.05, "unit": "KG", "initial_margin": 26000, "delivery": "Cash Settled"
            },
            "LEAD": {
                "lot_size": 5000, "tick_size": 0.05, "unit": "KG", "initial_margin": 140000, "delivery": "Physical"
            },
            "LEADM": {
                "lot_size": 1000, "tick_size": 0.05, "unit": "KG", "initial_margin": 28000, "delivery": "Cash Settled"
            },
            "MENTHAOIL": {
                "lot_size": 360, "tick_size": 0.10, "unit": "KG", "initial_margin": 50000, "delivery": "Physical"
            },
            "COTTON": {
                "lot_size": 25, "tick_size": 10.00, "unit": "Bales", "initial_margin": 40000, "delivery": "Physical"
            },
            "CPO": {
                "lot_size": 1000, "tick_size": 0.10, "unit": "KG", "initial_margin": 70000, "delivery": "Cash Settled"
            },
            "CRUDEOILM": {
                 "lot_size": 10, "tick_size": 1.00, "unit": "BBL", "initial_margin": 50000, "delivery": "Cash Settled"
            }
        }
        
        details = defaults.get(base, {
            "lot_size": 1, 
            "tick_size": 0.05, 
            "unit": "Unit", 
            "initial_margin": 0, 
            "delivery": "Cash"
        })
        
        # Calculate Expiry (Dynamic)
        # Calculate Expiry (Dynamic)
        expiry = "2026-02-28" # Fallback
        
        if db_details:
             # Use DB values if available
             return {
                "status": "success",
                "data": {
                    "symbol": db_details.get("trading_symbol", symbol),
                    "lot_size": db_details.get("lot_size", details["lot_size"]),
                    "tick_size": db_details.get("tick_size", details["tick_size"]),
                    "expiry_date": str(db_details.get("expiry")) if db_details.get("expiry") else expiry,
                    "initial_margin": details["initial_margin"], # Margin not in DB usually
                    "delivery_type": details.get("delivery", "Cash"),
                    "unit": details["unit"]
                }
             }

        if "CRUDEOILM" in symbol:
            if "FEB" in symbol: expiry = "2026-02-17"
            elif "MAR" in symbol: expiry = "2026-03-17"
            elif "APR" in symbol: expiry = "2026-04-16"
        elif "GOLD" in symbol:
             if "APR" in symbol: expiry = "2026-04-05"
             elif "FEB" in symbol: expiry = "2026-02-05"
        
        return {
            "status": "success",
            "data": {
                "symbol": symbol,
                "lot_size": details["lot_size"],
                "tick_size": details["tick_size"],
                "expiry_date": expiry,
                "initial_margin": details["initial_margin"],
                "delivery_type": details.get("delivery", "Cash"),
                "unit": details["unit"]
            }
        }

    def get_commodities_news(self):
        """
        Fetch relevant global news for commodities.
        Currently a mock/placeholder.
        """
        return {
            "status": "success",
            "data": [
                {
                    "id": 1,
                    "headline": "OPEC+ considers extending supply cuts amid price volatility",
                    "source": "Global Energy",
                    "time": "10:30 AM",
                    "tags": ["CRUDEOIL", "OPEC"],
                    "sentiment": "bullish"
                },
                {
                    "id": 2,
                    "headline": "Gold hits new highs as dollar weakens ahead of Fed meet",
                    "source": "MarketWatch",
                    "time": "09:45 AM",
                    "tags": ["GOLD", "USD"],
                    "sentiment": "bullish"
                },
                {
                    "id": 3,
                    "headline": "Natural Gas inventories higher than expected, putting pressure on prices",
                    "source": "Energy Daily",
                    "time": "09:15 AM",
                    "tags": ["NATURALGAS"],
                    "sentiment": "bearish"
                },
                {
                    "id": 4,
                    "headline": "Copper demand surges in EV sector, supply constraints loom",
                    "source": "Metals Logic",
                    "time": "Yesterday",
                    "tags": ["COPPER"],
                    "sentiment": "bullish"
                }
            ]
        }
