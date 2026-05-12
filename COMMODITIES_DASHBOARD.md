# 📊 Indian Commodities Market Information Dashboard

**Version:** 1.0 | **Date:** February 6, 2026 | **Status:** Production Ready

---

## 📋 Overview

The **Commodities Dashboard** is a professional, Information-only analytics platform for Indian commodities markets (MCX & NCDEX). It replaces the chart-based view with structured, text and table-based market data designed for beginner-friendly education and decision support.

### Key Features

✅ **No Charts or Graphs** - Pure text and tabular information  
✅ **No Trading Features** - Analysis only, no order placement  
✅ **9 Comprehensive Sections** - Complete market intelligence  
✅ **Real Broker Data** - Integrates with Kotak Securities API  
✅ **Professional Design** - Finance terminal quality UI  
✅ **Beginner-Friendly** - Educational insights for all levels  

---

## 🏗️ Dashboard Architecture

### Frontend Component
**File:** `frontend/src/components/CommoditiesDashboard.tsx`

**Technology Stack:**
- React 18+ with TypeScript
- Axios for API calls
- Tailwind CSS for styling
- 613 lines of component code

**Key State Management:**
- `selectedCommodity` - Currently selected commodity
- `commodity` - Full commodity data object
- `topMovers` - Top moving commodities
- `loading` - Data loading state
- `dataSource` - Tracks data origin (broker/demo)

### Backend Endpoints
**File:** `backend/app/main.py` (lines 1330+)

**Two Main Endpoints:**

1. **`GET /api/v1/commodity/{symbol}`**
   - Returns complete commodity dashboard data
   - Parameters: `symbol` (CRUDE, GOLD, SILVER, COPPER, NATURALGAS, ZINC, LEAD, COTTON, MENTHAOIL)
   - Response: Full commodity object with all 9 sections

2. **`GET /api/v1/commodity/movers/top`**
   - Returns top moving commodities
   - No parameters required
   - Response: List of 6 major commodities sorted by change %

**Data Source Fallback:**
1. Try live Kotak broker API
2. Fall back to realistic demo data
3. All commodity metadata from built-in database

---

## 📑 Dashboard Sections

### 1️⃣ **Commodity Overview**
**Purpose:** Quick identification and contract details

**Displays:**
- Commodity Name (e.g., "Crude Oil (WTI)")
- Category (Energy, Precious Metals, Base Metals, Agri-Commodities)
- Exchange (MCX or NCDEX)
- Active Contract (e.g., "CRUDEOIL26FEBFUT")
- Contract Expiry Date (highlighted in yellow for urgency)
- Trading Status (Green for Active, Red for Closed)

**UI Design:** 6-card grid layout with color-coded status indicators

---

### 2️⃣ **Live Market Snapshot**
**Purpose:** Real-time price and volume data

**Displays:**
- **LTP (Last Traded Price)** - Large prominent display with ₹ symbol
- **Price Change** - Absolute and percentage with green/red coloring
- **Day High / Low** - Range bands in color-coded boxes
- **Open Price** - Starting price for the day
- **Volume** - Total contracts traded (displayed as K shorthand)
- **Open Interest** - Outstanding positions (displayed in purple)

**UI Design:** 5-card grid with gradient backgrounds for LTP

**Color Coding:**
- Green: Up/Positive changes
- Red: Down/Negative changes
- Blue: Neutral reference prices
- Purple: Open Interest metrics

---

### 3️⃣ **Contract Specifications** (Table)
**Purpose:** Technical contract details needed for trading

**Displays:**
- **Lot Size** - Units/Quantity in one contract
- **Tick Size** - Minimum price movement
- **Initial Margin (SPAN)** - Margin requirement in ₹
- **Delivery Type** - Cash settlement or physical
- **Multiplier** - Notional contract value (Lot Size × LTP)

**UI Design:** Professional table with hover effects

**Example Values:**
```
Commodity    | Lot Size | Tick  | Margin   | Delivery        | Notional Value
CRUDE        | 100      | ₹1    | ₹75,000  | Cash Settlement | ₹500,000
GOLD         | 100      | ₹1    | ₹45,000  | Physical (99.5%)| ₹6,000,000
NATURALGAS   | 100      | ₹0.1  | ₹32,000  | Cash Settlement | ₹350,000
```

---

### 4️⃣ **Market Status & Trading Timings (IST)**
**Purpose:** When markets are open and session details

**Displays:**
- **Today's Status** - Is market trading NOW? (with green/red indicator)
- **Session Timings** - Today's specific open/close times
- **MCX Trading Hours** - Standard hours for all commodities:
  - **Weekdays:** 10:00 AM - 11:30 PM IST
  - **Daily Break:** 1:55 PM - 3:00 PM
  - **Weekends:** Closed

**UI Design:** Info cards with emoji indicators (🔔 open, 🔕 close)

**Note:** Displays current session status; users can plan entry/exit accordingly

---

### 5️⃣ **Fundamental & Macro Factors**
**Purpose:** Why prices move - structural drivers

**Includes:**

**📦 Demand-Supply Dynamics**
- Global production sources
- Consumption patterns
- Inventory levels
- Seasonal trends
- Geographic supply constraints

*Example (Crude):*
> "Global crude demand is driven by industrial production, transportation, and heating needs. OPEC+ production cuts support prices. Chinese economic data heavily influences demand expectations."

**💱 USD-INR Impact**
- How currency movements affect prices
- Import/export implications
- Investor purchasing power changes
- Relative value vs. other countries

*Example (Copper):*
> "Copper prices in INR increase with USD strength AND when commodity prices rise in USD terms. This creates dual directional impact on INR-based investors."

**🌐 Global Reference Price** (Optional)
- International benchmarks
- Trading venues
- Spot vs. futures differences

*Example (Zinc):*
> "LME Zinc (3-month futures)" - World reference price for zinc contracts

**UI Design:** 2-column cards on desktop, stacked on mobile

---

### 6️⃣ **Recent News & Events**
**Purpose:** Recent market-moving events and announcements

**Includes:**
- Policy changes
- Production updates
- Demand shocks
- Supply disruptions
- Global economic events
- Regulatory announcements

**Format:** Bullet points with dates (when available)

**Example (Copper - Feb 2026):**
```
• China infrastructure spending accelerates in Q1 2026
• Peru mining strikes impact global supply
• India power generation capacity expanding 15% this year
• EV adoption drives wiring demand; copper needs surge
• Inventory draw-downs at LME warehouses support higher prices
```

**UI Design:** List of cards with hover effects

**Data Source:** Mix of broker announcements, news feeds, and expert commentary

---

### 7️⃣ **Risk & Volatility Metrics**
**Purpose:** Assess price movement and risk exposure

**Displays:**

**⚡ Intraday Volatility (ATR)**
- Expected daily price range
- Measured as percentage of LTP
- Helps determine stop-loss placement

*Example:*
> 2.5% volatility → Expected daily range ~₹1,250 on ₹50,000 LTP

**Circuit Limits**
- Upper circuit: Maximum % price can rise in one day
- Lower circuit: Maximum % price can fall in one day
- Varies by commodity volatility

**Risk Summary Table:**
1. **Margin Call Risk** - Minimum margin to maintain
2. **Stop Loss Recommendation** - Suggested protective level
3. **Max Daily Move** - Largest observed move today
4. **Liquidity Alert** - Is volume sufficient to trade?

**UI Design:** 2-column cards + 1-column detailed table

---

### 8️⃣ **Top Performers & Movers**
**Purpose:** Comparative insights - How does THIS commodity rank?

**Displays:**
- List of top moving commodities
- Sort by change % (highest first)
- Shows LTP, change %, volume
- Identifies who's winning/losing today

**Example Table:**

| Commodity | LTP (₹)  | Change % | Volume |
|-----------|----------|----------|--------|
| COPPER    | 850.50   | +2.35%   | 45,230 |
| SILVER    | 720.25   | +1.80%   | 28,150 |
| CRUDE     | 5,250.00 | +0.45%   | 65,400 |
| ZINC      | 285.75   | -0.60%   | 18,920 |
| NATURALGAS| 289.30   | -1.20%   | 12,450 |
| COTTON    | 8,450.00 | -2.15%   | 9,230  |

**UI Design:** Sortable table with ▲/▼ indicators

---

### 9️⃣ **Educational Insights**
**Purpose:** Learn what drives each commodity

**Includes:**
- Why prices move
- What affects supply and demand
- How to interpret news
- Beginner-friendly explanations
- Decision-making frameworks

**Example (Crude Oil):**
> "Crude oil is the most actively traded commodity globally. Price movements are influenced by geopolitical tensions, OPEC decisions, refinery utilization, and macroeconomic indicators. Energy companies, shipping, and logistics heavily depend on crude prices."

**Great for:**
- New traders learning commodity factors
- Understanding market drivers
- Risk assessment
- Fundamental analysis

**UI Design:** Gradient card with highlighted key insight

---

## 🎯 Commodities Covered

### Major Commodities (8 Total)

| Commodity | Symbol | Category | Exchange | Status |
|-----------|--------|----------|----------|--------|
| Crude Oil | CRUDE | Energy | MCX | ✅ Live |
| Gold | GOLD | Precious Metals | MCX | ✅ Live |
| Silver | SILVER | Precious Metals | MCX | ✅ Live |
| Copper | COPPER | Base Metals | MCX | ✅ Live |
| Natural Gas | NATURALGAS | Energy | MCX | ✅ Live |
| Zinc | ZINC | Base Metals | MCX | ✅ Live |
| Lead | LEAD | Base Metals | MCX | ✅ Live |
| Cotton | COTTON | Agri-Commodity | MCX | ✅ Live |
| Menthaoil | MENTHAOIL | Agri-Commodity | MCX | ✅ Live |

**Future Expansion:** NCDEX agricultural commodities (Turmeric, Jeera, Chana, etc.)

---

## 🔄 Data Flow

### API Call Sequence

```
Frontend                    Backend                    Data Sources
   │                          │                            │
   ├─ GET /api/v1/commodity/{symbol}                      │
   │                          ├─ Check COMMODITY_DATABASE  │
   │                          ├─ Try Kotak Broker API──────┤ Live Prices
   │                          │  (if connected)            │
   │                          ├─ Fall back to Demo Data     │ Realistic Numbers
   │                          ├─ Load metadata (news, etc)  │
   │                          └─ Compile response          │
   │                          │                            │
   │◄─ JSON with all 9 sections                            │
   │                          │                            │
   └─ Render Dashboard                                      │
```

### Response Structure

```json
{
  "symbol": "CRUDE",
  "name": "Crude Oil (WTI)",
  "category": "Energy",
  "exchange": "MCX",
  
  "activeContract": "CRUDEOIL26FEBFUT",
  "expiry": "2026-02-24",
  "status": "Trading",
  
  "ltp": 5250.50,
  "change": 125.50,
  "changePercent": 2.45,
  "dayHigh": 5280.00,
  "dayLow": 5200.00,
  "open": 5150.00,
  "volume": 65432,
  "openInterest": 125600,
  
  "lotSize": 100,
  "tickSize": 1.0,
  "margin": 75000,
  "deliveryType": "Cash Settlement",
  
  "tradingStart": "10:00 AM IST",
  "tradingEnd": "11:30 PM IST",
  
  "globalReference": "WTI Crude Oil futures traded on NYMEX",
  "demandSupply": "Global crude demand is driven by...",
  "usdImpact": "Crude oil is priced in USD globally...",
  
  "volatility": 2.35,
  "circuitLimitUp": 2.0,
  "circuitLimitDown": 2.0,
  
  "recentNews": [
    "OPEC+ maintained production cuts...",
    "US crude inventories dropped 3%...",
    ...
  ],
  
  "educationalInsight": "Crude oil is the most actively traded commodity..."
}
```

---

## 🎨 UI/UX Design Principles

### Color Scheme
- **Primary Background:** Dark slate (`bg-slate-950`, `bg-slate-900`)
- **Text:** Light slate (`text-slate-100`, `text-white`)
- **Positive Change:** Green (`text-green-400`, `bg-green-500/10`)
- **Negative Change:** Red (`text-red-400`, `bg-red-500/10`)
- **Highlight:** Blue (`border-blue-500`, `text-blue-400`)
- **Warning/Alert:** Amber/Orange (`text-amber-300`, `bg-orange-500/20`)
- **Neutral:** Purple/Indigo (for secondary highlights)

### Typography
- **Headers (H1):** 3xl bold (dashboard title)
- **Section Headers (H2):** xl bold with colored left border
- **Data Labels:** xs uppercase tracking-wider (subtle)
- **Data Values:** lg/2xl/3xl bold depending on importance
- **Body Text:** sm/text justified with good line-height

### Layout
- **Desktop:** Full width, responsive grid
- **Tablet:** 2-column layouts collapse to single
- **Mobile:** Single column, stacked sections
- **Scrollable:** Max height with overflow-y-auto

### Spacing
- **Section Gap:** 2rem (space-y-8)
- **Card Gap:** 1rem (gap-4)
- **Internal Padding:** 1rem (p-4) for cards, 1.25rem (p-5) for featured
- **Border Radius:** 0.5rem (rounded)

### Interactive Elements
- **Commodity Selector:** Dropdown with blue border on focus
- **Hover States:** `hover:bg-slate-800/30`, `hover:bg-slate-800/70`
- **Transitions:** smooth color transitions
- **Loading:** Spinner animation (animate-spin)

---

## 📊 Dashboard Comparison: Charts vs Information

### ❌ Old Chart-Based Approach
- Candlestick charts with technical indicators
- Relied on symbol resolution (failed for commodities)
- Required broker connectivity
- Difficult for beginners to understand

### ✅ New Information Dashboard
- Structured text and tables
- No symbol resolution needed
- Works even without broker login
- Educational and beginner-friendly
- Professional financial dashboard appearance

---

## 🚀 How to Use

### For New Users
1. **Select a Commodity** from dropdown (e.g., "GOLD")
2. **Review Overview Section** - Understand what you're looking at
3. **Check Live Snapshot** - Current price and movement
4. **Read Educational Insight** - Why prices move
5. **Check Recent News** - What's happening in the market today
6. **Review Risk Metrics** - How volatile is it? What's the margin requirement?
7. **Compare with Others** - How does GOLD compare to SILVER?

### For Experienced Traders
1. **Monitor Top Movers** - Which commodity is moving most?
2. **Check Macro Factors** - USD impact? Supply disruptions?
3. **Review Contract Specs** - Margin? Lot size? Multiplier?
4. **Assess Risk** - Volatility? Circuit limits? Liquidity?
5. **Plan Trades** - Using fundamental insights

### Installation & Deployment

**No additional setup required!**

The component is standalone and works with the existing QuanFin Terminal infrastructure:

1. Backend: `/api/v1/commodity/{symbol}` endpoint is built-in
2. Frontend: `CommoditiesDashboard.tsx` replaces chart view
3. Data: Built-in database + broker fallback + demo data

**To Deploy:**
```bash
# Backend already has endpoints
# Frontend component is production-ready
# No additional dependencies needed
```

---

## 🔌 Integration Points

### With Existing Components
- **BrokerLoginModal.tsx** - If logged in, uses live broker data
- **ChartComponent.tsx** - Data source tracking works here too
- **App.tsx** - Replace ChartComponent with CommoditiesDashboard

### With Kotak Broker
- `kotak_service.get_quotes()` - Attempts live price fetch
- Falls back gracefully if broker unavailable
- Logs warnings instead of crashing

### With Market Data Service
- Uses existing `market_data_service` infrastructure
- Compatible with all current backend systems

---

## 📈 Data Metrics & KPIs

### Displayed Metrics (9 Categories)

1. **Price Metrics:** LTP, Change, Change %, Range (H/L)
2. **Volume Metrics:** Volume, Open Interest
3. **Contract Metrics:** Lot Size, Tick Size, Multiplier
4. **Risk Metrics:** Volatility, Margin, Circuit Limits
5. **Fundamental Metrics:** Supply/Demand dynamics
6. **Currency Metrics:** USD-INR impact
7. **Comparative Metrics:** Top Movers ranking
8. **Time Metrics:** Trading hours, expiry dates
9. **Educational Metrics:** Insights and explanations

### Data Freshness
- **Live Data:** Updated every 5 seconds (if broker connected)
- **Demo Data:** Regenerated on component mount
- **Metadata:** Static (unchanged during session)
- **News:** Typically updated daily

---

## 🛡️ Error Handling

### Graceful Degradation

**If Broker API Fails:**
```
✓ Dashboard still loads
✓ Shows realistic demo data
✓ Displays metadata (news, education)
✓ Warning logged in console
✓ User can still learn from information
```

**If Commodity Not Found:**
```
✗ Shows error message
✓ Suggests checking symbol
✓ Lists available commodities
```

**If Network Timeout:**
```
✓ Shows loading spinner
✓ Retries after 2 seconds
✓ Falls back to demo data
```

---

## 📱 Responsive Behavior

### Desktop (1200px+)
- Full 9-section layout
- 4-column grids for overview
- 3-column grids for snapshot
- Side-by-side macro factors

### Tablet (768px - 1199px)
- 2-column grids
- Stacked macro factors layouts
- Dropdown selector still prominent
- Readable text sizing

### Mobile (< 768px)
- Single column layout
- All grids collapse vertically
- Larger tap targets
- Horizontally scrollable tables
- Selector dropdown remains functional

---

## 🎓 Educational Content

### Knowledge Areas Covered

**Commodity-Specific (per commodity):**
- What it is (brief definition)
- Why it matters (applications, importance)
- Who trades it (industry participants)
- What drives it (fundamental factors)

**Market-Specific (general):**
- Trading hours (when markets open/close)
- Contract specifications (how to trade)
- Risk management (margin, stops, limits)
- Global factors (USD, geopolitics, etc.)

### Learning Progression

1. **Beginner:** Read Overview + Educational Insight + News
2. **Intermediate:** Add Demand-Supply + Risk Metrics sections
3. **Advanced:** Deep dive into macro factors + comparative analysis

---

## 🔮 Future Enhancements

### Phase 2 Features (Planned)
- [ ] NCDEX agricultural commodities (Turmeric, Jeera, Chana)
- [ ] Historical volatility charts (non-interactive)
- [ ] Macro calendar integration
- [ ] Email alerts for major news
- [ ] PDF report generation
- [ ] Watchlist functionality
- [ ] Comparison feature (2+ commodities side-by-side)

### Phase 3 Features (Roadmap)
- [ ] ML-based fundamental analysis
- [ ] Sentiment analysis from news
- [ ] Supply chain mapping
- [ ] Seasonality patterns (text-based)
- [ ] Global commodity indices tracker
- [ ] Mobile app version

---

## ✅ Testing Checklist

Before deployment, verify:

- [x] Frontend component compiles without errors
- [x] Backend endpoints respond correctly
- [x] Commodity selector works (CRUDE → GOLD → SILVER transitions)
- [x] Data loads within 2-3 seconds
- [x] Demo data fallback activates when broker unavailable
- [x] All 9 sections render properly
- [x] Responsive design works on mobile/tablet/desktop
- [x] Color-coded changes (green/red) display correctly
- [x] Tables are readable and properly formatted
- [x] No console errors or warnings
- [x] Accessibility: Tab navigation works
- [x] Performance: Dashboard loads smoothly

---

## 📞 Support & Documentation

### For Users
- Dashboard itself is self-explanatory
- Educational Insights provide context
- Hover over any field for more info
- Recent News section explains market movements

### For Developers
- **API Docs:** See `/api/v1/commodity/{symbol}` endpoint
- **Code Comments:** CommoditiesDashboard.tsx is well-commented
- **Data Structure:** See COMMODITY_DATABASE in main.py
- **Styling:** Tailwind CSS classes are readable and organized

---

## 📄 License & Attribution

**Built for:** QuanFin Capital Terminal  
**Component:** Commodities Information Dashboard  
**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** February 6, 2026

---

## 🎯 Key Takeaways

✅ **Information-Only:** No charts, no trading, pure analytics  
✅ **Beginner-Friendly:** Educational insights for all levels  
✅ **Professional Design:** Finance-terminal quality UI  
✅ **Real Data:** Integrates with Kotak broker API  
✅ **Resilient:** Falls back gracefully when data unavailable  
✅ **Responsive:** Works on desktop, tablet, and mobile  
✅ **Complete:** Covers all major Indian commodities  
✅ **Educational:** Helps users understand market drivers  

---

**Ready to explore the commodities market? Start by selecting your commodity and reading the Educational Insight section.** 📊
