export interface Regulator {
  countryCode: string; // ISO-2
  country: string;
  name: string;
  acronym: string;
  website: string;
  founded: number;
  primaryExchange: string;
  jurisdiction: string;
  circuitBreakerNote: string;
  logoUrl?: string;
  lat: number;
  lng: number;
}

export const regulators: Record<string, Regulator> = {
  "IN": {
    countryCode: "IN",
    country: "India",
    name: "Securities and Exchange Board of India",
    acronym: "SEBI",
    website: "https://www.sebi.gov.in",
    founded: 1992,
    primaryExchange: "NSE / BSE",
    jurisdiction: "Ministry of Finance",
    circuitBreakerNote: "Market halts at 10%, 15%, and 20% index movement limits",
    lat: 19.0760, lng: 72.8777
  },
  "US": {
    countryCode: "US",
    country: "United States",
    name: "Securities and Exchange Commission",
    acronym: "SEC",
    website: "https://www.sec.gov",
    founded: 1934,
    primaryExchange: "NYSE / Nasdaq",
    jurisdiction: "Federal Government",
    circuitBreakerNote: "Level 1: 7%, Level 2: 13%, Level 3: 20%",
    lat: 38.9072, lng: -77.0369
  },
  "UK": {
    countryCode: "GB",
    country: "United Kingdom",
    name: "Financial Conduct Authority",
    acronym: "FCA",
    website: "https://www.fca.org.uk",
    founded: 2013,
    primaryExchange: "LSE",
    jurisdiction: "HM Treasury",
    circuitBreakerNote: "5 Minute single-stock price monitoring extensions",
    lat: 51.5074, lng: -0.1278
  },
  "JP": {
    countryCode: "JP",
    country: "Japan",
    name: "Financial Services Agency",
    acronym: "FSA",
    website: "https://www.fsa.go.jp/en/",
    founded: 2000,
    primaryExchange: "TSE",
    jurisdiction: "Cabinet Office",
    circuitBreakerNote: "Varies by stock price range",
    lat: 35.6762, lng: 139.6503
  },
  "CN": {
    countryCode: "CN",
    country: "China",
    name: "China Securities Regulatory Commission",
    acronym: "CSRC",
    website: "http://www.csrc.gov.cn/pub/csrc_en/",
    founded: 1992,
    primaryExchange: "SSE / SZSE",
    jurisdiction: "State Council",
    circuitBreakerNote: "Strict ±10% daily limit for normal stocks",
    lat: 39.9042, lng: 116.4074
  },
  "HK": {
    countryCode: "HK",
    country: "Hong Kong",
    name: "Securities and Futures Commission",
    acronym: "SFC",
    website: "https://www.sfc.hk/en/",
    founded: 1989,
    primaryExchange: "HKEX",
    jurisdiction: "HK Government",
    circuitBreakerNote: "Volatility Control Mechanism (VCM) at ±10% per 5 mins",
    lat: 22.3193, lng: 114.1694
  },
  "AU": {
    countryCode: "AU",
    country: "Australia",
    name: "Australian Securities & Investments Commission",
    acronym: "ASIC",
    website: "https://asic.gov.au/",
    founded: 1991,
    primaryExchange: "ASX",
    jurisdiction: "Australian Government",
    circuitBreakerNote: "Extreme Trade Range (ETR) controls",
    lat: -33.8688, lng: 151.2093
  },
  "SG": {
    countryCode: "SG",
    country: "Singapore",
    name: "Monetary Authority of Singapore",
    acronym: "MAS",
    website: "https://www.mas.gov.sg/",
    founded: 1971,
    primaryExchange: "SGX",
    jurisdiction: "Government of Singapore",
    circuitBreakerNote: "Dynamic circuit breakers set at ±10% of ref price",
    lat: 1.3521, lng: 103.8198
  },
  "AE": {
    countryCode: "AE",
    country: "United Arab Emirates",
    name: "Securities and Commodities Authority",
    acronym: "SCA",
    website: "https://www.sca.gov.ae/en/home.aspx",
    founded: 2000,
    primaryExchange: "ADX / DFM",
    jurisdiction: "Ministry of Economy",
    circuitBreakerNote: "Upper limit +15%, lower limit -10%",
    lat: 24.4539, lng: 54.3773
  },
  "FR": {
    countryCode: "FR",
    country: "France",
    name: "Autorité des Marchés Financiers",
    acronym: "AMF",
    website: "https://www.amf-france.org/en",
    founded: 2003,
    primaryExchange: "Euronext Paris",
    jurisdiction: "Ministry of Economy",
    circuitBreakerNote: "Static and dynamic collars on Euronext",
    lat: 48.8566, lng: 2.3522
  },
  "DE": {
    countryCode: "DE",
    country: "Germany",
    name: "Federal Financial Supervisory Authority",
    acronym: "BaFin",
    website: "https://www.bafin.de/EN/Home/home_node.html",
    founded: 2002,
    primaryExchange: "FSE",
    jurisdiction: "Federal Ministry of Finance",
    circuitBreakerNote: "Volatility interruption (Xetra) auctions",
    lat: 50.1109, lng: 8.6821
  },
  "CH": {
    countryCode: "CH",
    country: "Switzerland",
    name: "Financial Market Supervisory Authority",
    acronym: "FINMA",
    website: "https://www.finma.ch/en/",
    founded: 2009,
    primaryExchange: "SIX Swiss Exchange",
    jurisdiction: "Swiss Federal Council",
    circuitBreakerNote: "Stop Trading ranges based on instrument liquidity",
    lat: 46.9480, lng: 7.4474
  },
  "BR": {
    countryCode: "BR",
    country: "Brazil",
    name: "Comissão de Valores Mobiliários",
    acronym: "CVM",
    website: "https://www.gov.br/cvm/en",
    founded: 1976,
    primaryExchange: "B3",
    jurisdiction: "Ministry of Finance",
    circuitBreakerNote: "Halts at 10%, 15%, and 20%",
    lat: -22.9068, lng: -43.1729
  },
  "CA": {
    countryCode: "CA",
    country: "Canada",
    name: "Canadian Securities Administrators",
    acronym: "CSA",
    website: "https://www.securities-administrators.ca/",
    founded: 2003,
    primaryExchange: "TSX",
    jurisdiction: "Provincial Regulators",
    circuitBreakerNote: "Aligned similarly to US limits (7, 13, 20%)",
    lat: 43.6510, lng: -79.3470
  }
};
