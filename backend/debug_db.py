import asyncio
import sys
import os

sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from sqlalchemy import text

from app.services.instrument_master import InstrumentMasterService

async def debug():
    table_name = InstrumentMasterService.get_active_table_name()
    print(f"InstrumentMasterService active table name: {table_name}")
    
    async with AsyncSessionLocal() as s:
        # Check if this table has any data
        if table_name:
            try:
                res = await s.execute(text(f"SELECT count(*) FROM {table_name}"))
                print(f"Count in {table_name}: {res.scalar()}")
                
                res = await s.execute(text(f"SELECT underlying_symbol, count(*) FROM {table_name} GROUP BY underlying_symbol LIMIT 5"))
                print(f"Sample underlyings in {table_name}: {res.all()}")
            except Exception as e:
                print(f"Query on {table_name} failed: {e}")

if __name__ == "__main__":
    asyncio.run(debug())
