from fastapi import APIRouter, HTTPException, Query
from app.services.contract_resolver import ContractResolver
from app.services.instrument_loader import InstrumentLoader
import logging

router = APIRouter(tags=["General"])
logger = logging.getLogger(__name__)

@router.get("/search")
async def search_symbols(q: str = Query(..., min_length=2)):
    """
    Search instruments by name/symbol.
    To be implemented fully using DB ILIKE.
    Currently delegates to resolver or placeholder.
    """
    results = ContractResolver.search_instruments(q)
    return {"status": "success", "data": results}

@router.post("/admin/sync-instruments")
async def sync_instruments(full: bool = False):
    """
    Trigger manual instrument sync.
    """
    loader = InstrumentLoader()
    # Run in background ideally
    import asyncio
    asyncio.create_task(loader.run_full_sync())
    return {"status": "success", "message": "Sync started in background"}
