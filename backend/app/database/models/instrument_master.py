from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, Index, BigInteger
from sqlalchemy.sql import func
from app.database import Base

class InstrumentMaster(Base):
    __tablename__ = "instrument_master"

    # Core identification
    instrument_token = Column(BigInteger, primary_key=True, index=True)
    exchange_token = Column(String, nullable=True)
    
    # Classification
    exchange = Column(String, index=True)           # NSE, BSE, MCX
    exchange_segment = Column(String, index=True)   # nse_cm, nse_fo, mcx_fo
    instrument_type = Column(String, index=True)    # EQ, FUT, OPT, FUTIDX, OPTIDX
    
    # Symbol details
    symbol = Column(String, index=True)             # RELIANCE, NIFTY
    trading_symbol = Column(String, index=True)     # RELIANCE-EQ, NIFTY24FEBFUT
    short_name = Column(String, nullable=True)      # Reliance, Nifty 50
    
    # Contract details
    expiry = Column(Date, nullable=True, index=True)
    strike = Column(Float, nullable=True)
    option_type = Column(String, nullable=True)     # CE, PE
    underlying_symbol = Column(String, index=True)  # RELIANCE, NIFTY
    
    # Trading rules
    lot_size = Column(Integer, default=1)
    tick_size = Column(Float, default=0.05)
    freeze_qty = Column(Float, nullable=True)
    
    # Metadata
    last_update = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)

    __table_args__ = (
        Index('idx_segment_symbol', 'exchange_segment', 'symbol'),
        Index('idx_expiry_underlying', 'expiry', 'underlying_symbol'),
    )
