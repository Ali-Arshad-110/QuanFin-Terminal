from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Load .env explicitly
load_dotenv()

# URL Handling
DB_URL_RAW = os.getenv("DB_URL", "postgresql://postgres:Ali%40110@localhost/quanfin_db")

# 1. Async URL (for FastAPI)
# Ensure driver is asyncpg for Postgres or aiosqlite for SQLite
if "postgresql://" in DB_URL_RAW and "+asyncpg" not in DB_URL_RAW:
    ASYNC_DB_URL = DB_URL_RAW.replace("postgresql://", "postgresql+asyncpg://")
elif "sqlite://" in DB_URL_RAW and "+aiosqlite" not in DB_URL_RAW:
    ASYNC_DB_URL = DB_URL_RAW.replace("sqlite://", "sqlite+aiosqlite://")
else:
    ASYNC_DB_URL = DB_URL_RAW

# 2. Sync URL (for Legacy / Scheduler)
# Ensure driver is NOT asyncpg (default psycopg2 or similar)
if "+asyncpg" in DB_URL_RAW:
    SYNC_DB_URL = DB_URL_RAW.replace("+asyncpg", "")
else:
    SYNC_DB_URL = DB_URL_RAW

# --- ASYNC ENGINE ---
engine = create_async_engine(
    ASYNC_DB_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# --- SYNC ENGINE (Legacy Support) ---
sync_engine = create_engine(
    SYNC_DB_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=5
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)

Base = declarative_base()

# Dependency for FastAPI routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

def check_lock():
    """
    Verifies if the database is in HARD LOCK mode (08:45 AM - Post Market).
    Raises Exception if locked.
    """
    # Import here to avoid circular dependency
    from app.models.instrument import InstrumentMasterStatus
    db = SessionLocal()
    try:
        # Check if table exists first? Handled by try/except usually
        status = db.query(InstrumentMasterStatus).first()
        if status and status.is_locked:
            raise Exception("MARKET LOCK ACTIVE: Database writes are blocked.")
    except Exception as e:
        # If table doesn't exist yet, ignore lock
        if "relation" in str(e) and "does not exist" in str(e):
            return
        raise e
    finally:
        db.close()
