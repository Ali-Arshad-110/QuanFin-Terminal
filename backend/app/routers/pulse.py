from fastapi import APIRouter, HTTPException
from app.services.pulse_service import pulse_scanner

router = APIRouter()

@router.get("/active")
async def get_active_pulses():
    """Returns the latest active momentum pulses from the scanner."""
    try:
        data = pulse_scanner.get_active_pulses()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start")
async def start_scanner():
    """Manually start the scanner if not already running."""
    pulse_scanner.start()
    return {"status": "started"}

@router.post("/stop")
async def stop_scanner():
    """Manually stop the scanner."""
    pulse_scanner.stop()
    return {"status": "stopped"}
