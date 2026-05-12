"""
Centralized Constants for Market Data
Contains Sector Definitions, Index Mappings, and Constituent Lists.
"""

# ----- SECTOR DEFINITIONS (Used for Heatmap & Sector Analysis) -----
SECTOR_DATA = {
    "Metal": {
        "ticker": "^CNXMETAL",
        "stocks": ["TATASTEEL.NS", "HINDALCO.NS", "JSWSTEEL.NS", "COALINDIA.NS", "VEDL.NS", "SAIL.NS", "JINDALSTEL.NS", "NMDC.NS", "HINDZINC.NS", "APLAPOLLO.NS"]
    },
    "PSE": {
        "ticker": "^CNXPSE", 
        "stocks": ["COALINDIA.NS", "NTPC.NS", "POWERGRID.NS", "ONGC.NS", "GAIL.NS", "BPCL.NS", "BEL.NS", "HAL.NS", "PFC.NS", "RECLTD.NS"]
    },
    "Cement": {
        "ticker": "ULTRACEMCO.NS", # Proxy: Market Leader (No direct index easily avail in yf for free without digging)
        "stocks": ["ULTRACEMCO.NS", "GRASIM.NS", "SHREECEM.NS", "ACC.NS", "AMBUJACEM.NS", "DALBHARAT.NS", "JKCEMENT.NS", "RAMCOCEM.NS"]
    },
    "Banking": {
        "ticker": "^NSEBANK",
        "stocks": ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS", "INDUSINDBK.NS", "BANKBARODA.NS", "PUNJABNB.NS", "IDFCFIRSTB.NS", "AUBANK.NS", "FEDERALBNK.NS", "BANDHANBNK.NS"]
    },
    "Realty": {
        "ticker": "^CNXREALTY",
        "stocks": ["DLF.NS", "GODREJPROP.NS", "OBEROIRLTY.NS", "PHOENIXLTD.NS", "PRESTIGE.NS", "BRIGADE.NS", "SOBHA.NS"]
    },
    "PSU Bank": {
        "ticker": "^CNXPSUBANK",
        "stocks": ["SBIN.NS", "BANKBARODA.NS", "PUNJABNB.NS", "CANBK.NS", "UNIONBANK.NS", "INDIANB.NS", "BANKINDIA.NS"]
    },
    "Energy": {
        "ticker": "^CNXENERGY",
        "stocks": ["RELIANCE.NS", "NTPC.NS", "POWERGRID.NS", "ONGC.NS", "TATAPOWER.NS", "ADANIGREEN.NS", "ADANIPORTS.NS", "BPCL.NS", "IOC.NS"]
    },
    "Services": {
        "ticker": "^CNXSERVICE", # Nifty Services Sector
        "stocks": ["ADANIPORTS.NS", "APOLLOHOSP.NS", "HDFC.NS", "ICICIPRULI.NS", "HDFCLIFE.NS", "SBILIFE.NS", "BAJFINANCE.NS"]
    },
    "Finance": {
        "ticker": "^CNXFIN", # Nifty Financial Services
        "stocks": ["BAJFINANCE.NS", "BAJAJFINSV.NS", "HDFCBANK.NS", "ICICIBANK.NS", "AXISBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "HDFCLIFE.NS", "SBILIFE.NS", "PFC.NS", "RECLTD.NS"]
    },
    "Technology": {
        "ticker": "^CNXIT",
        "stocks": ["TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS", "TECHM.NS", "LTM.NS", "PERSISTENT.NS", "COFORGE.NS", "MPHASIS.NS"]
    },
    "Infra": {
        "ticker": "^CNXINFRA",
        "stocks": ["LT.NS", "RELIANCE.NS", "BHARTIARTL.NS", "ULTRACEMCO.NS", "POWERGRID.NS", "NTPC.NS", "ONGC.NS", "GRASIM.NS"]
    },
    "Pharma": {
        "ticker": "^CNXPHARMA",
        "stocks": ["SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "LUPIN.NS", "AUROPHARMA.NS", "ALKEM.NS", "TORNTPHARM.NS"]
    },
    "Consumer": {
        "ticker": "^CNXFMCG", # Proxy for Consumer
        "stocks": ["ITC.NS", "HINDUNILVR.NS", "NESTLEIND.NS", "TITAN.NS", "ASIANPAINT.NS", "BRITANNIA.NS", "TATACONSUM.NS", "MARICO.NS"]
    },
    "Auto": {
        "ticker": "^CNXAUTO",
        "stocks": ["M&M.NS", "TMCV.NS", "MARUTI.NS", "BAJAJ-AUTO.NS", "HEROMOTOCO.NS", "TVSMOTOR.NS", "EICHERMOT.NS", "TIINDIA.NS"]
    }
}

# ----- INDEX UNIVERSE (Used for Network Map) -----
INDEX_UNIVERSE = {
    "NIFTY50":      {"candidates": ["^NSEI", "NIFTYBEES.NS", "NIFTY.NS"],      "name": "NIFTY 50",        "marketCap": 350,  "sector": "Broad"},
    "SENSEX":       {"candidates": ["^BSESN", "SENSEX.BO"],     "name": "SENSEX",          "marketCap": 320,  "sector": "Broad"},
    "BANKNIFTY":    {"candidates": ["^NSEBANK", "BANKBEES.NS", "BANKNIFTY.NS"],    "name": "BANK NIFTY",     "marketCap": 280,  "sector": "Banking"},
    "NIFTYIT":      {"candidates": ["^CNXIT", "ITBEES.NS", "TCS.NS"],      "name": "NIFTY IT",       "marketCap": 150,  "sector": "Technology"},
    "NIFTYPHARMA":  {"candidates": ["^CNXPHARMA", "PHARMABEES.NS", "SUNPHARMA.NS"],  "name": "NIFTY PHARMA",   "marketCap": 100,  "sector": "Pharma"},
    "NIFTYFMCG":    {"candidates": ["^CNXFMCG", "HINDUNILVR.NS"],    "name": "NIFTY FMCG",     "marketCap": 110,  "sector": "Consumer"},
    "NIFTYAUTO":    {"candidates": ["^CNXAUTO", "AUTOBEES.NS", "MARUTI.NS"],    "name": "NIFTY AUTO",     "marketCap": 90,   "sector": "Auto"},
    "NIFTYMETAL":   {"candidates": ["^CNXMETAL", "TATASTEEL.NS"],   "name": "NIFTY METAL",    "marketCap": 70,   "sector": "Metal"},
    "NIFTYENERGY":  {"candidates": ["^CNXENERGY", "RELIANCE.NS"],  "name": "NIFTY ENERGY",   "marketCap": 130,  "sector": "Energy"},
    "NIFTYREALTY":  {"candidates": ["^CNXREALTY", "DLF.NS"],  "name": "NIFTY REALTY",   "marketCap": 40,   "sector": "Realty"},
    "NIFTYPSUBANK": {"candidates": ["^CNXPSUBANK", "PSUBNKBEES.NS", "SBIN.NS"], "name": "NIFTY PSU BANK", "marketCap": 55,   "sector": "PSU Banking"},
    "NIFTYFIN":     {"candidates": ["^CNXFIN", "FINNIFTY.NS", "HDFCBANK.NS"],     "name": "NIFTY FIN SVC",  "marketCap": 200,  "sector": "Finance"},
    "NIFTYINFRA":   {"candidates": ["^CNXINFRA", "INFRABEES.NS", "LT.NS"],   "name": "NIFTY INFRA",    "marketCap": 85,   "sector": "Infra"},
    "INDIAVIX":     {"candidates": ["^INDIAVIX", "^VIX"],   "name": "INDIA VIX",      "marketCap": 0,    "sector": "Volatility"},
}

# ----- NIFTY 50 SECTOR MAPPING (Hardcoded for Visual Hierarchies) -----
NIFTY_50_MAPPING = {
    "RELIANCE.NS": "Oil & Gas", "TCS.NS": "IT", "HDFCBANK.NS": "Financial Services", "ICICIBANK.NS": "Financial Services",
    "INFY.NS": "IT", "BHARTIARTL.NS": "Telecom", "ITC.NS": "FMCG", "SBIN.NS": "Financial Services",
    "LICI.NS": "Financial Services", "HINDUNILVR.NS": "FMCG", "LT.NS": "Construction", "BAJFINANCE.NS": "Financial Services",
    "HCLTECH.NS": "IT", "MARUTI.NS": "Automobile", "SUNPHARMA.NS": "Pharma", "TMCV.NS": "Automobile",
    "ULTRACEMCO.NS": "Cement", "AXISBANK.NS": "Financial Services", "NTPC.NS": "Power", "TITAN.NS": "Consumer Durables",
    "ONGC.NS": "Oil & Gas", "ADANIENT.NS": "Metals & Mining", "POWERGRID.NS": "Power", "KOTAKBANK.NS": "Financial Services",
    "WIPRO.NS": "IT", "M&M.NS": "Automobile", "BAJAJFINSV.NS": "Financial Services", "JSWSTEEL.NS": "Metals & Mining",
    "TATASTEEL.NS": "Metals & Mining", "COALINDIA.NS": "Metals & Mining", "ADANIPORTS.NS": "Services", "SIEMENS.NS": "Capital Goods",
    "SBILIFE.NS": "Financial Services", "GRASIM.NS": "Cement", "TECHM.NS": "IT", "BRITANNIA.NS": "FMCG",
    "HDFCLIFE.NS": "Financial Services", "INDUSINDBK.NS": "Financial Services", "HINDALCO.NS": "Metals & Mining", "DRREDDY.NS": "Pharma",
    "EICHERMOT.NS": "Automobile", "CIPLA.NS": "Pharma", "APOLLOHOSP.NS": "Healthcare", "TATACONSUM.NS": "FMCG",
    "NESTLEIND.NS": "FMCG", "BPCL.NS": "Oil & Gas", "HEROMOTOCO.NS": "Automobile", "DIVISLAB.NS": "Pharma",
    "SHRIRAMFIN.NS": "Financial Services", "TRENT.NS": "Consumer Services"
}

# ----- SENSEX MAPPING (Hardcoded) -----
SENSEX_MAPPING = {
    "RELIANCE.NS": "Oil & Gas", "TCS.NS": "IT", "HDFCBANK.NS": "Bank", "ICICIBANK.NS": "Bank",
    "INFY.NS": "IT", "BHARTIARTL.NS": "Telecom", "ITC.NS": "FMCG", "SBIN.NS": "Bank",
    "LICI.NS": "Insurance", "HINDUNILVR.NS": "FMCG", "LT.NS": "Infra", "BAJFINANCE.NS": "Finance",
    "HCLTECH.NS": "IT", "MARUTI.NS": "Auto", "SUNPHARMA.NS": "Pharma", "TMCV.NS": "Auto",
    "ULTRACEMCO.NS": "Cement", "AXISBANK.NS": "Bank", "NTPC.NS": "Power", "TITAN.NS": "Consumer",
    "POWERGRID.NS": "Power", "KOTAKBANK.NS": "Bank", "WIPRO.NS": "IT", "M&M.NS": "Auto",
    "BAJAJFINSV.NS": "Finance", "JSWSTEEL.NS": "Metal", "TATASTEEL.NS": "Metal", "ADANIPORTS.NS": "Infra",
    "TECHM.NS": "IT", "INDUSINDBK.NS": "Bank", "ASIANPAINT.NS": "Consumer", "NESTLEIND.NS": "FMCG"
}

# ----- SECTORAL INDICES MAPPINGS -----
BANKNIFTY_MAPPING = {
    "HDFCBANK.NS": "Banking", "ICICIBANK.NS": "Banking", "SBIN.NS": "PSU Banking", "AXISBANK.NS": "Banking",
    "KOTAKBANK.NS": "Banking", "INDUSINDBK.NS": "Banking", "BANKBARODA.NS": "PSU Banking", "PNB.NS": "PSU Banking",
    "AUBANK.NS": "Banking", "IDFCFIRSTB.NS": "Banking", "FEDERALBNK.NS": "Banking", "BANDHANBNK.NS": "Banking"
}

NIFTYIT_MAPPING = {
    "TCS.NS": "IT", "INFY.NS": "IT", "HCLTECH.NS": "IT", "WIPRO.NS": "IT", "TECHM.NS": "IT",
    "LTM.NS": "IT", "PERSISTENT.NS": "IT", "COFORGE.NS": "IT", "MPHASIS.NS": "IT", "LTTS.NS": "IT"
}

NIFTYAUTO_MAPPING = {
    "MARUTI.NS": "Auto", "TMCV.NS": "Auto", "M&M.NS": "Auto", "BAJAJ-AUTO.NS": "Auto",
    "EICHERMOT.NS": "Auto", "HEROMOTOCO.NS": "Auto", "TVSMOTOR.NS": "Auto", "BHARATFORG.NS": "Auto",
    "ASHOKLEY.NS": "Auto", "MOTHERSON.NS": "Auto"
}

NIFTYFMCG_MAPPING = {
    "ITC.NS": "FMCG", "HINDUNILVR.NS": "FMCG", "NESTLEIND.NS": "FMCG", "BRITANNIA.NS": "FMCG",
    "TATACONSUM.NS": "FMCG", "DABUR.NS": "FMCG", "GODREJCP.NS": "FMCG", "MARICO.NS": "FMCG",
    "COLPAL.NS": "FMCG", "VBL.NS": "FMCG"
}
