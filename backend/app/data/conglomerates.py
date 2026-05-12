# pyre-ignore-all-errors
"""
Indian Conglomerate map: Parent company → Listed subsidiaries
Ownership percentages are approximate (public disclosures, as of 2024).
"""

CONGLOMERATE_MAP = {
    "TATA": {
        "symbol": "TCS.NS",
        "name": "Tata Group",
        "sector": "Conglomerate",
        "subsidiaries": [
            {"symbol": "TCS",          "name": "Tata Consultancy Services",  "sector": "IT",            "ownership": 72.3},
            {"symbol": "TATAMOTORS",   "name": "Tata Motors",                "sector": "Auto",          "ownership": 46.4},
            {"symbol": "TATASTEEL",    "name": "Tata Steel",                 "sector": "Metal",         "ownership": 34.2},
            {"symbol": "TATAPOWER",    "name": "Tata Power",                 "sector": "Energy",        "ownership": 46.9},
            {"symbol": "TATACOMM",     "name": "Tata Communications",         "sector": "Telecom",       "ownership": 58.9},
            {"symbol": "TATACONSUM",   "name": "Tata Consumer Products",     "sector": "FMCG",          "ownership": 34.7},
            {"symbol": "TATACHEM",     "name": "Tata Chemicals",             "sector": "Chemicals",     "ownership": 38.0},
            {"symbol": "TITAN",        "name": "Titan Company",              "sector": "Consumer",      "ownership": 52.9},
            {"symbol": "VOLTAS",       "name": "Voltas",                     "sector": "Consumer",      "ownership": 30.3},
            {"symbol": "INDIANHOTELS", "name": "Indian Hotels (Taj)",        "sector": "Hospitality",   "ownership": 38.3},
            {"symbol": "TRENT",        "name": "Trent",                      "sector": "Retail",        "ownership": 37.0},
        ]
    },
    "ADANI": {
        "symbol": "ADANIENT.NS",
        "name": "Adani Group",
        "sector": "Conglomerate",
        "subsidiaries": [
            {"symbol": "ADANIENT",     "name": "Adani Enterprises",          "sector": "Infrastructure","ownership": 73.7},
            {"symbol": "ADANIPORTS",   "name": "Adani Ports & SEZ",          "sector": "Ports",         "ownership": 65.2},
            {"symbol": "ADANIGREEN",   "name": "Adani Green Energy",         "sector": "Energy",        "ownership": 60.5},
            {"symbol": "ADANITRANS",   "name": "Adani Transmission",         "sector": "Energy",        "ownership": 73.7},
            {"symbol": "ADANIPOWER",   "name": "Adani Power",                "sector": "Energy",        "ownership": 75.0},
            {"symbol": "ADANIWILMAR",  "name": "Adani Wilmar",               "sector": "FMCG",          "ownership": 43.9},
            {"symbol": "ACC",          "name": "ACC Cement",                 "sector": "Cement",        "ownership": 56.7},
            {"symbol": "AMBUJACEM",    "name": "Ambuja Cements",             "sector": "Cement",        "ownership": 70.2},
            {"symbol": "NDTV",         "name": "NDTV",                       "sector": "Media",         "ownership": 64.7},
        ]
    },
    "RELIANCE": {
        "symbol": "RELIANCE.NS",
        "name": "Reliance Industries",
        "sector": "Conglomerate",
        "subsidiaries": [
            {"symbol": "RELIANCE",     "name": "Reliance Industries",        "sector": "Oil & Gas",     "ownership": 50.4},
            {"symbol": "JIOFINANC",    "name": "Jio Financial Services",     "sector": "Finance",       "ownership": 47.1},
            {"symbol": "NETWORK18",    "name": "Network18 Media",            "sector": "Media",         "ownership": 74.7},
            {"symbol": "HATHWAY",      "name": "Hathway Cable & Datacom",    "sector": "Telecom",       "ownership": 51.3},
            {"symbol": "SIEVERT",      "name": "Siemens (JV)",               "sector": "Engineering",   "ownership": 0},
        ]
    },
    "MAHINDRA": {
        "symbol": "MM.NS",
        "name": "Mahindra Group",
        "sector": "Conglomerate",
        "subsidiaries": [
            {"symbol": "MM",           "name": "Mahindra & Mahindra",        "sector": "Auto",          "ownership": 18.6},
            {"symbol": "MFSL",         "name": "Mahindra Financial Services","sector": "Finance",       "ownership": 52.2},
            {"symbol": "MAHLIFE",      "name": "Mahindra Lifespace",         "sector": "Real Estate",   "ownership": 50.0},
            {"symbol": "MAHLOG",       "name": "Mahindra Logistics",         "sector": "Logistics",     "ownership": 58.0},
            {"symbol": "TECHMAHINDRA", "name": "Tech Mahindra",              "sector": "IT",            "ownership": 36.4},
            {"symbol": "MAHINDCIE",    "name": "Mahindra CIE Automotive",    "sector": "Auto Parts",    "ownership": 11.5},
        ]
    },
    "BIRLA": {
        "symbol": "HINDALCO.NS",
        "name": "Aditya Birla Group",
        "sector": "Conglomerate",
        "subsidiaries": [
            {"symbol": "HINDALCO",     "name": "Hindalco Industries",        "sector": "Metal",         "ownership": 34.7},
            {"symbol": "ULTRACEMCO",   "name": "UltraTech Cement",           "sector": "Cement",        "ownership": 59.7},
            {"symbol": "GRASIM",       "name": "Grasim Industries",          "sector": "Diversified",   "ownership": 43.2},
            {"symbol": "ABCAPITAL",    "name": "Aditya Birla Capital",       "sector": "Finance",       "ownership": 69.1},
            {"symbol": "IDEA",         "name": "Vodafone Idea",              "sector": "Telecom",       "ownership": 17.8},
            {"symbol": "ABFRL",        "name": "Aditya Birla Fashion & Retail","sector": "Retail",      "ownership": 55.3},
            {"symbol": "ABIRLANUVO",   "name": "Aditya Birla Nuvo",          "sector": "Diversified",   "ownership": 56.9},
        ]
    },
    "BAJAJ": {
        "symbol": "BAJFINANCE.NS",
        "name": "Bajaj Group",
        "sector": "Conglomerate",
        "subsidiaries": [
            {"symbol": "BAJFINANCE",   "name": "Bajaj Finance",              "sector": "Finance",       "ownership": 55.9},
            {"symbol": "BAJAJFINSV",   "name": "Bajaj Finserv",              "sector": "Finance",       "ownership": 56.0},
            {"symbol": "BAJAJ-AUTO",   "name": "Bajaj Auto",                 "sector": "Auto",          "ownership": 56.0},
            {"symbol": "BAJAJELEC",    "name": "Bajaj Electricals",          "sector": "Consumer",      "ownership": 62.7},
        ]
    },
    "GODREJ": {
        "symbol": "GODREJCP.NS",
        "name": "Godrej Group",
        "sector": "Conglomerate",
        "subsidiaries": [
            {"symbol": "GODREJCP",     "name": "Godrej Consumer Products",   "sector": "FMCG",          "ownership": 63.2},
            {"symbol": "GODREJPROP",   "name": "Godrej Properties",          "sector": "Real Estate",   "ownership": 58.5},
            {"symbol": "GODREJIND",    "name": "Godrej Industries",           "sector": "Chemicals",     "ownership": 59.5},
            {"symbol": "GODREJAGROVET","name": "Godrej Agrovet",             "sector": "Agri",          "ownership": 58.5},
        ]
    },
}
