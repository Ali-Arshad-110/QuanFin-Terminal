from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
from app.services.strategy_service import StrategyService
from app.execution.kotak_service import KotakService
from app.processing.engine import MarketDataService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/strategy",
    tags=["strategy"]
)

# Initialize Services
strategy_service = StrategyService()
kotak_service = KotakService()
market_data_service = MarketDataService()

class Rule(BaseModel):
    indicator: str
    op: str
    value: float

class StrategyRequest(BaseModel):
    ticker: str
    interval: str = "1d"
    entry_rules: List[Rule]
    exit_rules: List[Rule]

@router.post("/backtest")
async def run_backtest(req: StrategyRequest):
    """
    Run a backtest for a given ticker and set of rules.
    """
    logger.info(f"Running backtest for {req.ticker} with {len(req.entry_rules)} entry rules")
    
    try:
        # 1. Fetch Historical Data
        # Re-use logic from main.py / analyze_ticker
        data = None
        
        # Try Kotak
        if kotak_service.is_logged_in:
            data = kotak_service.get_historical_data(req.ticker, req.interval)
            
        # Fallback to Yahoo
        if not data:
            # Determine period based on interval
            period = "1y" # Default for backtest
            if req.interval == "1d": period = "2y"
            elif req.interval == "5m": period = "59d"
            
            data = market_data_service.fetch_data(req.ticker, req.interval, period)
            
        if not data:
            raise HTTPException(status_code=404, detail=f"No data found for {req.ticker}")
            
        # 2. Convert Rules to format expected by service
        rules = {
            "entry": [r.dict() for r in req.entry_rules],
            "exit": [r.dict() for r in req.exit_rules]
        }
        
        # 3. Execute Strategy
        result = strategy_service.execute_strategy(data, rules)
        
        if "error" in result:
             raise HTTPException(status_code=500, detail=result["error"])
             
        return {
            "status": "success",
            "ticker": req.ticker,
            "stats": result["stats"],
            "signals": result["signals"],
            "trades": result["trades"]
        }
        
    except Exception as e:
        logger.error(f"Backtest failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
