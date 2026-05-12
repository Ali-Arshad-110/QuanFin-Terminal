from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from app.market_data.service import MarketDataService
from app.market_data.redis_client import RedisClient
from app.market_data.broadcaster import TickBroadcaster
from app.services.option_chain import OptionChainService
from app.services.contract_resolver import ContractResolver
from app.services.network_map_service import NetworkMapService
import logging
import asyncio
import json
import time

router = APIRouter(prefix="/market", tags=["Market Data"])
logger = logging.getLogger(__name__)

# Singletons
md_service = MarketDataService()
redis_client = RedisClient()
oc_service = OptionChainService()
broadcaster = TickBroadcaster()


@router.websocket("/ws/ticks")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time tick streaming to frontend via in-memory TickBroadcaster.
    Protocol:
    Client sends: {"action": "subscribe", "tokens": ["NIFTY 50", "RELIANCE", ...]}
    Server streams: {"token": "...", "symbol": "RELIANCE", "ltp": 2985.40, "change": 12.5, "changePercent": 0.42, ...}
    """
    await websocket.accept()
    logger.info(f"WS Client Connected. Total subscribers: {broadcaster.subscriber_count + 1}")

    # Task to stream ticks from broadcaster to this client
    async def stream_ticks():
        async for tick in broadcaster.subscribe():
            try:
                await websocket.send_json(tick)
            except Exception:
                break  # Client disconnected

    stream_task = asyncio.create_task(stream_ticks())

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                data = json.loads(raw)
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                try:
                    await websocket.send_json({"type": "heartbeat", "ts": int(time.time() * 1000)})
                except Exception:
                    break
                continue

            action = data.get("action")

            if action == "subscribe":
                symbols = data.get("tokens", [])
                resolved = []
                for sym in symbols:
                    # Try regular equity
                    result = ContractResolver.resolve(sym)
                    if result:
                        token, seg, _ = result
                        resolved.append({
                            "instrument_token": str(token),
                            "exchange_segment": seg,
                            "symbol": sym,
                            "isIndex": seg in ("nse_idx", "bse_idx")
                        })
                    else:
                        # Try index resolution
                        result_idx = ContractResolver.resolve(sym, instrument_type="IDX")
                        if result_idx:
                            token, seg, _ = result_idx
                            resolved.append({
                                "instrument_token": str(token),
                                "exchange_segment": seg,
                                "symbol": sym,
                                "isIndex": True
                            })

                if resolved:
                    await md_service.subscribe(resolved)
                    logger.info(f"WS: Subscribed to {len(resolved)} tokens: {[r['symbol'] for r in resolved]}")
                else:
                    logger.warning(f"WS: Could not resolve any of: {symbols}")

    except WebSocketDisconnect:
        logger.info("WS Client Disconnected")
    except Exception as e:
        logger.error(f"WS Error: {e}")
    finally:
        stream_task.cancel()
        try:
            await stream_task
        except asyncio.CancelledError:
            pass


@router.get("/option-chain/{symbol}")
async def get_option_chain(symbol: str, expiry: str = None):
    """
    Get real-time option chain for a symbol.
    """
    data = await oc_service.get_chain(symbol.upper(), expiry)
    if "error" in data:
        raise HTTPException(status_code=404, detail=data["error"])
    return data


@router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    """
    Get generic quote (LTP) from Redis or Snapshot.
    """
    res = ContractResolver.resolve(symbol)
    if not res:
        raise HTTPException(status_code=404, detail="Symbol not found")

    token = res[0]
    tick = await redis_client.get_tick(token)
    if tick:
        return tick
    return {"status": "No live data", "token": token}


@router.get("/breadth/{index}")
async def get_breadth_constituents(index: str):
    """
    Get real-time constituents and their performance stats for a given index or sector.
    """
    try:
        # Normalize index name (e.g., replace %20 with space)
        idx_normalized = index.replace("%20", " ")
        
        # Offload blocking yfinance/calculation logic to a thread pool
        data = await asyncio.to_thread(NetworkMapService.get_constituents, idx_normalized)
        
        if not data:
            # Try a second pass with more aggressive normalization if no data
            from app.data.constants import INDEX_UNIVERSE, SECTOR_DATA
            
            # Map common frontend names to backend keys
            name_map = {
                "Nifty IT": "NIFTYIT",
                "Nifty Bank": "BANKNIFTY",
                "Nifty 50": "NIFTY50",
                "Nifty FMCG": "NIFTYFMCG",
                "Nifty Auto": "NIFTYAUTO",
                "Nifty Metal": "NIFTYMETAL",
                "Nifty Energy": "NIFTYENERGY",
                "Nifty Pharma": "NIFTYPHARMA",
                "Nifty PSU Bank": "NIFTYPSUBANK",
                "Sensex": "SENSEX",
                "All Markets": "NIFTY50"
            }
            
            mapped_key = name_map.get(idx_normalized, idx_normalized.upper().replace(" ", ""))
            
            if mapped_key in INDEX_UNIVERSE:
                real_name = INDEX_UNIVERSE[mapped_key]["name"]
                data = await asyncio.to_thread(NetworkMapService.get_constituents, real_name)
            elif mapped_key in SECTOR_DATA:
                data = await asyncio.to_thread(NetworkMapService.get_constituents, mapped_key)

        return {"status": "success", "data": data or []}
    except Exception as e:
        logger.error(f"Error fetching breadth for {index}: {e}")
        return {"status": "error", "message": str(e), "data": []}
