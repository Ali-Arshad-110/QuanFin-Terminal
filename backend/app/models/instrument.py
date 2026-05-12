from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Index
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime

class InstrumentMasterStatus(Base):
    __tablename__ = "instrument_master_status"

    id = Column(Integer, primary_key=True, index=True)
    active_table_name = Column(String, nullable=True) # e.g., instruments_20240209
    is_locked = Column(Boolean, default=False)        # HARD LOCK for Market Hours
    last_sync_time = Column(DateTime(timezone=True), server_default=func.now())
    backup_tables = Column(String, nullable=True)     # JSON string of backup tables

class InstrumentAudit(Base):
    __tablename__ = "instrument_audit"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    event = Column(String)  # e.g., DOWNLOAD, SWAP, LOCK
    status = Column(String) # SUCCESS, FAILED
    message = Column(String, nullable=True)
    metadata_info = Column(String, nullable=True) # JSON string for details

# Base class for dynamic instrument tables (snapshots)
class InstrumentBase:
    instrument_token = Column(Integer, primary_key=True, index=True) # Changed to Integer
    exchange_segment = Column(String, index=True)         # nse_cm, nse_fo...
    symbol = Column(String, index=True)                   # RELIANCE, NIFTY
    trading_symbol = Column(String, index=True)           # RELIANCE-EQ, NIFTY24FEBFUT
    instrument_type = Column(String)                      # EQ, FUT, OPT
    lot_size = Column(Integer)
    tick_size = Column(Float)
    
    # Derivatives
    expiry = Column(Date, nullable=True, index=True)
    strike = Column(Float, nullable=True)
    option_type = Column(String, nullable=True)           # CE, PE, XX
    underlying_symbol = Column(String, index=True)        # NIFTY, RELIANCE
    exchange = Column(String, index=True)                 # NSE, BSE, MCX
    
    last_update = Column(DateTime, default=func.now())

# Default table model (View or Active Table)
class Instrument(Base, InstrumentBase):
    __tablename__ = "instruments"
    
    __table_args__ = (
        Index('idx_segment_underlying_expiry', 'exchange_segment', 'underlying_symbol', 'expiry'),
        Index('idx_underlying_type_expiry', 'underlying_symbol', 'instrument_type', 'expiry'),
    )

class SymbolAlias(Base):
    """
    Maps user-friendly symbols to trading symbols and tokens.
    e.g. RELIANCE -> RELIANCE-EQ (Token 123)
         NIFTY -> NIFTY (Index Token)
    """
    __tablename__ = "symbol_aliases"

    alias = Column(String, primary_key=True) # RELIANCE, CRUDEOIL
    trading_symbol = Column(String) # RELIANCE-EQ
    instrument_token = Column(String)
    exchange_segment = Column(String)
