import asyncio
import logging
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from app.services.option_chain import OptionChainService
from app.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_crudeoil_chain():
    service = OptionChainService()
    symbol = "CRUDEOIL"
    
    logger.info(f"Fetching option chain for {symbol}...")
    data = await service.get_chain(symbol)
    
    if "error" in data:
        logger.error(f"Error fetching chain: {data['error']}")
        return
    
    logger.info(f"Successfully fetched {symbol} chain")
    logger.info(f"Symbol: {data['symbol']}")
    logger.info(f"Spot Price (Ref): {data['spot_price']}")
    logger.info(f"Expiry: {data['expiry']}")
    logger.info(f"ATM Strike: {data['atm_strike']}")
    logger.info(f"Number of Strikes: {len(data['chain'])}")
    
    if data['chain']:
        mid = len(data['chain']) // 2
        strike_data = data['chain'][mid]
        logger.info(f"Sample Strike: {strike_data['strike']}")
        logger.info(f"CE Symbol: {strike_data['ce'].get('symbol')}")
        logger.info(f"PE Symbol: {strike_data['pe'].get('symbol')}")

if __name__ == "__main__":
    asyncio.run(test_crudeoil_chain())
