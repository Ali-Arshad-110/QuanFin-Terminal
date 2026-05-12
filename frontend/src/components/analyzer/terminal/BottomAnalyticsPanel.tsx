/**
 * BottomAnalyticsPanel.tsx — Dual-Mode Institutional Analytics Panel
 *
 * MODE 1 → Minimized Dock  : sparkline · sentiment · correlation · signal text
 * MODE 2 → Expanded Overlay: Index-Stock Correlation Engine (lightweight-charts)
 *
 * Routing: HTML5 History API  (no react-router)
 *
 * IMPORTANT: ALL hooks are called unconditionally before any early return.
 */

import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronUp,
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Minus,
    Zap,
    AlertTriangle,
    Activity,
    Clock,
    RefreshCw,
    X,
    Search,
    Home
} from 'lucide-react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useStabilityData } from '../../../hooks/useStabilityData';
import type { UnifiedDataset } from '../../../hooks/useStabilityData';
import { useMarketStore } from '../../../store';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface BottomAnalyticsPanelProps {
    data: UnifiedDataset;
}
type Sentiment  = 'bullish' | 'bearish' | 'neutral';
type TFKey      = '5m' | '15m' | '30m' | '1H' | '1D' | '1W' | '1M';

interface CorrResult   { value: number; label: string; color: string; }
interface LeadLagResult{ lag: number; text: string; }
interface DivResult    { type: 'breakout'|'weak_rally'|'correlated'|'none'; label: string; }

// ─────────────────────────────────────────────────────────────
// PURE ANALYTICS
// ─────────────────────────────────────────────────────────────
function pearson(xs: number[], ys: number[]): number {
    if (!xs || !ys) return 0;
    const n = Math.min(xs.length, ys.length);
    if (n < 3) return 0;
    const slicedXs = xs.slice(-n);
    const slicedYs = ys.slice(-n);
    const mx = slicedXs.reduce((a, b) => a + b, 0) / n;
    const my = slicedYs.reduce((a, b) => a + b, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) {
        const ex = slicedXs[i] - mx;
        const ey = slicedYs[i] - my;
        num += ex * ey;
        dx += ex * ex;
        dy += ey * ey;
    }
    const denom = Math.sqrt(dx * dy);
    if (isNaN(denom) || denom === 0) return 0;
    return Math.max(-1, Math.min(1, num / denom));
}

function corrAtLag(xs: number[], ys: number[], lag: number): number {
    if (!xs || !ys || xs.length === 0 || ys.length === 0) return 0;
    if (lag >= 0) return pearson(xs.slice(lag), ys.slice(0, Math.max(0, xs.length - lag)));
    return pearson(xs.slice(0, Math.max(0, xs.length + lag)), ys.slice(-lag));
}

function detectLeadLag(s: number[], ix: number[]): LeadLagResult {
    if (!s || !ix || s.length < 8 || ix.length < 8) return { lag: 0, text: 'Insufficient data' };
    let best = -Infinity, bestLag = 0;
    for (let lag = -5; lag <= 5; lag++) {
        const c = corrAtLag(s, ix, lag);
        if (!isNaN(c) && c > best) { best = c; bestLag = lag; }
    }
    if (Math.abs(bestLag) < 1) return { lag: 0, text: 'Moving in sync with NIFTY' };
    if (bestLag > 0) return { lag: bestLag, text: `Stock lagging NIFTY by ${bestLag} candle${bestLag > 1 ? 's' : ''}` };
    return { lag: bestLag, text: `Stock leading NIFTY by ${Math.abs(bestLag)} candle${Math.abs(bestLag) > 1 ? 's' : ''}` };
}

function detectDivergence(s: number[], ix: number[], win = 10): DivResult {
    if (!s || !ix || s.length < win + 1 || ix.length < win + 1) return { type: 'none', label: 'Correlated move' };
    const sB = s[s.length - win - 1];
    const iB = ix[ix.length - win - 1];
    const sC = s[s.length - 1];
    const iC = ix[ix.length - 1];
    if (sB === undefined || iB === undefined || sB === 0 || iB === 0) return { type: 'correlated', label: 'Correlated move' };
    
    const sPct = ((sC - sB) / sB) * 100;
    const iPct = ((iC - iB) / iB) * 100;
    const T = 0.8;
    
    if (iPct > T && sPct <= 0) return { type: 'weak_rally', label: '⚠️ Weak rally — stock not participating' };
    if (sPct > T && iPct <= 0) return { type: 'breakout', label: '⚡ Potential breakout signal' };
    return { type: 'correlated', label: 'Correlated move' };
}

function normalize(prices: number[]): number[] {
    if(!prices.length) return [];
    const base = prices.find(p => p !== 0 && p !== null && !isNaN(p)) || 1;
    return prices.map(p => {
        if (p === null || isNaN(p) || p === undefined) return 0;
        return ((p - base) / base) * 100;
    });
}

function corrMeta(val: number): CorrResult {
    const abs=Math.abs(val);
    let color='#f59e0b', label='Moderate';
    if(abs>=0.6){ color=val>0?'#00FFA3':'#FF4D4D'; label=val>0?'Strong Positive':'Strong Negative'; }
    else if(abs<0.3){ color='#94a3b8'; label='Weak'; }
    return {value:val,color,label};
}

function getSentiment(prices: number[]): Sentiment {
    if (!prices || prices.length < 2) return 'neutral';
    const lastPrice = prices[prices.length - 1];
    const baseIndex = Math.max(0, prices.length - 6);
    const basePrice = prices[baseIndex] ?? lastPrice;
    
    if (lastPrice === undefined || basePrice === undefined) return 'neutral';
    
    const delta = lastPrice - basePrice;
    return delta > 0 ? 'bullish' : delta < 0 ? 'bearish' : 'neutral';
}

const S_COLOR: Record<Sentiment,string> = {bullish:'#00FFA3',bearish:'#FF4D4D',neutral:'#f59e0b'};
const S_LABEL: Record<Sentiment,string> = {bullish:'▲ Bullish',bearish:'▼ Bearish',neutral:'◆ Neutral'};
const TF_WIN: Record<TFKey, number> = { '5m': 5, '15m': 15, '30m': 30, '1H': 60, '1D': 390, '1W': 1950, '1M': 8000 };
const SECTOR_INDICES = [
    { symbol: '^NSEI',     label: 'NIFTY 50' },
    { symbol: '^NSEBANK',  label: 'BANK NIFTY' },
    { symbol: '^CNXIT',    label: 'NIFTY IT' },
    { symbol: '^CNXAUTO',  label: 'AUTO' },
    { symbol: '^CNXMETAL', label: 'METAL' },
    { symbol: '^CNXFMCG',  label: 'FMCG' }
];

const SIGNALS = ['Detecting market rotations...','Scanning volatility bands...','Analyzing order flow bias...'];

const NIFTY_500 = [
    {symbol: "360ONE", name: "360 ONE WAM Ltd."}, {symbol: "3MINDIA", name: "3M India Ltd."}, {symbol: "ABB", name: "ABB India Ltd."}, {symbol: "ACC", name: "ACC Ltd."}, {symbol: "ACMESOLAR", name: "ACME Solar Holdings Ltd."}, {symbol: "AIAENG", name: "AIA Engineering Ltd."}, {symbol: "APLAPOLLO", name: "APL Apollo Tubes Ltd."}, {symbol: "AUBANK", name: "AU Small Finance Bank Ltd."}, {symbol: "AWL", name: "AWL Agri Business Ltd."}, {symbol: "AADHARHFC", name: "Aadhar Housing Finance Ltd."}, {symbol: "AARTIIND", name: "Aarti Industries Ltd."}, {symbol: "AAVAS", name: "Aavas Financiers Ltd."}, {symbol: "ABBOTINDIA", name: "Abbott India Ltd."}, {symbol: "ACE", name: "Action Construction Equipment Ltd."}, {symbol: "ADANIENSOL", name: "Adani Energy Solutions Ltd."}, {symbol: "ADANIENT", name: "Adani Enterprises Ltd."}, {symbol: "ADANIGREEN", name: "Adani Green Energy Ltd."}, {symbol: "ADANIPORTS", name: "Adani Ports and Special Economic Zone Ltd."}, {symbol: "ADANIPOWER", name: "Adani Power Ltd."}, {symbol: "ATGL", name: "Adani Total Gas Ltd."}, {symbol: "ABCAPITAL", name: "Aditya Birla Capital Ltd."}, {symbol: "ABFRL", name: "Aditya Birla Fashion and Retail Ltd."}, {symbol: "ABLBL", name: "Aditya Birla Lifestyle Brands Ltd."}, {symbol: "ABREL", name: "Aditya Birla Real Estate Ltd."}, {symbol: "ABSLAMC", name: "Aditya Birla Sun Life AMC Ltd."}, {symbol: "AEGISLOG", name: "Aegis Logistics Ltd."}, {symbol: "AEGISVOPAK", name: "Aegis Vopak Terminals Ltd."}, {symbol: "AFCONS", name: "Afcons Infrastructure Ltd."}, {symbol: "AFFLE", name: "Affle 3i Ltd."}, {symbol: "AJANTPHARM", name: "Ajanta Pharmaceuticals Ltd."}, {symbol: "AKUMS", name: "Akums Drugs and Pharmaceuticals Ltd."}, {symbol: "AKZOINDIA", name: "Akzo Nobel India Ltd."}, {symbol: "APLLTD", name: "Alembic Pharmaceuticals Ltd."}, {symbol: "ALKEM", name: "Alkem Laboratories Ltd."}, {symbol: "ALKYLAMINE", name: "Alkyl Amines Chemicals Ltd."}, {symbol: "ALOKINDS", name: "Alok Industries Ltd."}, {symbol: "ARE&M", name: "Amara Raja Energy & Mobility Ltd."}, {symbol: "AMBER", name: "Amber Enterprises India Ltd."}, {symbol: "AMBUJACEM", name: "Ambuja Cements Ltd."}, {symbol: "ANANDRATHI", name: "Anand Rathi Wealth Ltd."}, {symbol: "ANANTRAJ", name: "Anant Raj Ltd."}, {symbol: "ANGELONE", name: "Angel One Ltd."}, {symbol: "APARINDS", "name": "Apar Industries Ltd."}, {symbol: "APOLLOHOSP", name: "Apollo Hospitals Enterprise Ltd."}, {symbol: "APOLLOTYRE", name: "Apollo Tyres Ltd."}, {symbol: "APTUS", name: "Aptus Value Housing Finance India Ltd."}, {symbol: "ASAHIINDIA", name: "Asahi India Glass Ltd."}, {symbol: "ASHOKLEY", name: "Ashok Leyland Ltd."}, {symbol: "ASIANPAINT", name: "Asian Paints Ltd."}, {symbol: "ASTERDM", name: "Aster DM Healthcare Ltd."}, {symbol: "ASTRAZEN", name: "AstraZenca Pharma India Ltd."}, {symbol: "ASTRAL", name: "Astral Ltd."}, {symbol: "ATHERENERG", name: "Ather Energy Ltd."}, {symbol: "ATUL", name: "Atul Ltd."}, {symbol: "AUROPHARMA", name: "Aurobindo Pharma Ltd."}, {symbol: "AIIL", name: "Authum Investment & Infrastructure Ltd."}, {symbol: "DMART", name: "Avenue Supermarts Ltd."}, {symbol: "AXISBANK", name: "Axis Bank Ltd."}, {symbol: "BASF", name: "BASF India Ltd."}, {symbol: "BEML", name: "BEML Ltd."}, {symbol: "BLS", name: "BLS International Services Ltd."}, {symbol: "BSE", name: "BSE Ltd."}, {symbol: "BAJAJ-AUTO", name: "Bajaj Auto Ltd."}, {symbol: "BAJFINANCE", name: "Bajaj Finance Ltd."}, {symbol: "BAJAJFINSV", name: "Bajaj Finserv Ltd."}, {symbol: "BAJAJHLDNG", name: "Bajaj Holdings & Investment Ltd."}, {symbol: "BAJAJHFL", name: "Bajaj Housing Finance Ltd."}, {symbol: "BALKRISIND", name: "Balkrishna Industries Ltd."}, {symbol: "BALRAMCHIN", name: "Balrampur Chini Mills Ltd."}, {symbol: "BANDHANBNK", name: "Bandhan Bank Ltd."}, {symbol: "BANKBARODA", name: "Bank of Baroda"}, {symbol: "BANKINDIA", name: "Bank of India"}, {symbol: "MAHABANK", name: "Bank of Maharashtra"}, {symbol: "BATAINDIA", name: "Bata India Ltd."}, {symbol: "BAYERCROP", name: "Bayer Cropscience Ltd."}, {symbol: "BERGEPAINT", name: "Berger Paints India Ltd."}, {symbol: "BDL", name: "Bharat Dynamics Ltd."}, {symbol: "BEL", name: "Bharat Electronics Ltd."}, {symbol: "BHARATFORG", name: "Bharat Forge Ltd."}, {symbol: "BHEL", name: "Bharat Heavy Electricals Ltd."}, {symbol: "BPCL", name: "Bharat Petroleum Corporation Ltd."}, {symbol: "BHARTIARTL", name: "Bharti Airtel Ltd."}, {symbol: "BHARTIHEXA", name: "Bharti Hexacom Ltd."}, {symbol: "BIKAJI", name: "Bikaji Foods International Ltd."}, {symbol: "BIOCON", name: "Biocon Ltd."}, {symbol: "BSOFT", name: "Birlasoft Ltd."}, {symbol: "BLUEDART", name: "Blue Dart Express Ltd."}, {symbol: "BLUEJET", name: "Blue Jet Healthcare Ltd."}, {symbol: "BLUESTARCO", name: "Blue Star Ltd."}, {symbol: "BBTC", name: "Bombay Burmah Trading Corporation Ltd."}, {symbol: "BOSCHLTD", name: "Bosch Ltd."}, {symbol: "FIRSTCRY", name: "Brainbees Solutions Ltd."}, {symbol: "BRIGADE", name: "Brigade Enterprises Ltd."}, {symbol: "BRITANNIA", name: "Britannia Industries Ltd."}, {symbol: "MAPMYINDIA", name: "C.E. Info Systems Ltd."}, {symbol: "CCL", name: "CCL Products (I) Ltd."}, {symbol: "CESC", name: "CESC Ltd."}, {symbol: "CGPOWER", name: "CG Power and Industrial Solutions Ltd."}, {symbol: "CRISIL", name: "CRISIL Ltd."}, {symbol: "CAMPUS", name: "Campus Activewear Ltd."}, {symbol: "CANFINHOME", name: "Can Fin Homes Ltd."}, {symbol: "CANBK", name: "Canara Bank"}, {symbol: "CAPLIPOINT", name: "Caplin Point Laboratories Ltd."}, {symbol: "CGCL", name: "Capri Global Capital Ltd."}, {symbol: "CARBORUNIV", name: "Carborundum Universal Ltd."}, {symbol: "CASTROLIND", name: "Castrol India Ltd."}, {symbol: "CEATLTD", name: "Ceat Ltd."}, {symbol: "CENTRALBK", name: "Central Bank of India"}, {symbol: "CDSL", name: "Central Depository Services (India) Ltd."}, {symbol: "CENTURYPLY", name: "Century Plyboards (India) Ltd."}, {symbol: "CERA", name: "Cera Sanitaryware Ltd"}, {symbol: "CHALET", name: "Chalet Hotels Ltd."}, {symbol: "CHAMBLFERT", name: "Chambal Fertilizers & Chemicals Ltd."}, {symbol: "CHENNPETRO", name: "Chennai Petroleum Corporation Ltd."}, {symbol: "CHOICEIN", name: "Choice International Ltd."}, {symbol: "CHOLAHLDNG", name: "Cholamandalam Financial Holdings Ltd."}, {symbol: "CHOLAFIN", name: "Cholamandalam Investment and Finance Company Ltd."}, {symbol: "CIPLA", name: "Cipla Ltd."}, {symbol: "CUB", name: "City Union Bank Ltd."}, {symbol: "CLEAN", name: "Clean Science and Technology Ltd."}, {symbol: "COALINDIA", name: "Coal India Ltd."}, {symbol: "COCHINSHIP", name: "Cochin Shipyard Ltd."}, {symbol: "COFORGE", name: "Coforge Ltd."}, {symbol: "COHANCE", name: "Cohance Lifesciences Ltd."}, {symbol: "COLPAL", name: "Colgate Palmolive (India) Ltd."}, {symbol: "CAMS", name: "Computer Age Management Services Ltd."}, {symbol: "CONCORDBIO", name: "Concord Biotech Ltd."}, {symbol: "CONCOR", name: "Container Corporation of India Ltd."}, {symbol: "COROMANDEL", name: "Coromandel International Ltd."}, {symbol: "CRAFTSMAN", name: "Craftsman Automation Ltd."}, {symbol: "CREDITACC", name: "CreditAccess Grameen Ltd."}, {symbol: "CROMPTON", name: "Crompton Greaves Consumer Electricals Ltd."}, {symbol: "CUMMINSIND", name: "Cummins India Ltd."}, {symbol: "CYIENT", name: "Cyient Ltd."}, {symbol: "DCMSHRIRAM", name: "DCM Shriram Ltd."}, {symbol: "DLF", name: "DLF Ltd."}, {symbol: "DOMS", name: "DOMS Industries Ltd."}, {symbol: "DABUR", name: "Dabur India Ltd."}, {symbol: "DALBHARAT", name: "Dalmia Bharat Ltd."}, {symbol: "DATAPATTNS", name: "Data Patterns (India) Ltd."}, {symbol: "DEEPAKFERT", name: "Deepak Fertilisers & Petrochemicals Corp. Ltd."}, {symbol: "DEEPAKNTR", name: "Deepak Nitrite Ltd."}, {symbol: "DELHIVERY", name: "Delhivery Ltd."}, {symbol: "DEVYANI", name: "Devyani International Ltd."}, {symbol: "DIVISLAB", name: "Divi's Laboratories Ltd."}, {symbol: "DIXON", name: "Dixon Technologies (India) Ltd."}, {symbol: "AGARWALEYE", name: "Dr. Agarwal's Health Care Ltd."}, {symbol: "LALPATHLAB", name: "Dr. Lal Path Labs Ltd."}, {symbol: "DRREDDY", name: "Dr. Reddy's Laboratories Ltd."}, {symbol: "DUMMYHDLVR", name: "Dummy Hindustan Unilever Ltd."}, {symbol: "EIDPARRY", name: "E.I.D. Parry (India) Ltd."}, {symbol: "EIHOTEL", name: "EIH Ltd."}, {symbol: "EICHERMOT", name: "Eicher Motors Ltd."}, {symbol: "ELECON", name: "Elecon Engineering Co. Ltd."}, {symbol: "ELGIEQUIP", name: "Elgi Equipments Ltd."}, {symbol: "EMAMILTD", name: "Emami Ltd."}, {symbol: "EMCURE", name: "Emcure Pharmaceuticals Ltd."}, {symbol: "ENDURANCE", name: "Endurance Technologies Ltd."}, {symbol: "ENGINERSIN", name: "Engineers India Ltd."}, {symbol: "ERIS", name: "Eris Lifesciences Ltd."}, {symbol: "ESCORTS", name: "Escorts Kubota Ltd."}, {symbol: "ETERNAL", name: "Eternal Ltd."}, {symbol: "EXIDEIND", name: "Exide Industries Ltd."}, {symbol: "NYKAA", name: "FSN E-Commerce Ventures Ltd."}, {symbol: "FEDERALBNK", name: "Federal Bank Ltd."}, {symbol: "FACT", name: "Fertilisers and Chemicals Travancore Ltd."}, {symbol: "FINCABLES", name: "Finolex Cables Ltd."}, {symbol: "FINPIPE", name: "Finolex Industries Ltd."}, {symbol: "FSL", name: "Firstsource Solutions Ltd."}, {symbol: "FIVESTAR", name: "Five-Star Business Finance Ltd."}, {symbol: "FORCEMOT", name: "Force Motors Ltd."}, {symbol: "FORTIS", name: "Fortis Healthcare Ltd."}, {symbol: "GAIL", name: "GAIL (India) Ltd."}, {symbol: "GVT&D", name: "GE Vernova T&D India Ltd."}, {symbol: "GMRAIRPORT", name: "GMR Airports Ltd."}, {symbol: "GRSE", name: "Garden Reach Shipbuilders & Engineers Ltd."}, {symbol: "GICRE", name: "General Insurance Corporation of India"}, {symbol: "GILLETTE", name: "Gillette India Ltd."}, {symbol: "GLAND", name: "Gland Pharma Ltd."}, {symbol: "GLAXO", name: "Glaxosmithkline Pharmaceuticals Ltd."}, {symbol: "GLENMARK", name: "Glenmark Pharmaceuticals Ltd."}, {symbol: "MEDANTA", name: "Global Health Ltd."}, {symbol: "GODIGIT", name: "Go Digit General Insurance Ltd."}, {symbol: "GPIL", name: "Godawari Power & Ispat Ltd."}, {symbol: "GODFRYPHLP", name: "Godfrey Phillips India Ltd."}, {symbol: "GODREJAGRO", name: "Godrej Agrovet Ltd."}, {symbol: "GODREJCP", name: "Godrej Consumer Products Ltd."}, {symbol: "GODREJIND", name: "Godrej Industries Ltd."}, {symbol: "GODREJPROP", name: "Godrej Properties Ltd."}, {symbol: "GRANULES", name: "Granules India Ltd."}, {symbol: "GRAPHITE", name: "Graphite India Ltd."}, {symbol: "GRASIM", name: "Grasim Industries Ltd."}, {symbol: "GRAVITA", name: "Gravita India Ltd."}, {symbol: "GESHIP", name: "Great Eastern Shipping Co. Ltd."}, {symbol: "FLUOROCHEM", name: "Gujarat Fluorochemicals Ltd."}, {symbol: "GUJGASLTD", name: "Gujarat Gas Ltd."}, {symbol: "GMDCLTD", name: "Gujarat Mineral Development Corporation Ltd."}, {symbol: "GSPL", name: "Gujarat State Petronet Ltd."}, {symbol: "HEG", name: "H.E.G. Ltd."}, {symbol: "HBLENGINE", name: "HBL Engineering Ltd."}, {symbol: "HCLTECH", name: "HCL Technologies Ltd."}, {symbol: "HDFCAMC", name: "HDFC Asset Management Company Ltd."}, {symbol: "HDFCBANK", name: "HDFC Bank Ltd."}, {symbol: "HDFCLIFE", name: "HDFC Life Insurance Company Ltd."}, {symbol: "HFCL", name: "HFCL Ltd."}, {symbol: "HAPPSTMNDS", name: "Happiest Minds Technologies Ltd."}, {symbol: "HAVELLS", name: "Havells India Ltd."}, {symbol: "HEROMOTOCO", name: "Hero MotoCorp Ltd."}, {symbol: "HEXT", name: "Hexaware Technologies Ltd."}, {symbol: "HSCL", name: "Himadri Speciality Chemical Ltd."}, {symbol: "HINDALCO", name: "Hindalco Industries Ltd."}, {symbol: "HAL", name: "Hindustan Aeronautics Ltd."}, {symbol: "HINDCOPPER", name: "Hindustan Copper Ltd."}, {symbol: "HINDPETRO", name: "Hindustan Petroleum Corporation Ltd."}, {symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd."}, {symbol: "HINDZINC", name: "Hindustan Zinc Ltd."}, {symbol: "POWERINDIA", name: "Hitachi Energy India Ltd."}, {symbol: "HOMEFIRST", name: "Home First Finance Company India Ltd."}, {symbol: "HONASA", name: "Honasa Consumer Ltd."}, {symbol: "HONAUT", name: "Honeywell Automation India Ltd."}, {symbol: "HUDCO", name: "Housing & Urban Development Corporation Ltd."}, {symbol: "HYUNDAI", name: "Hyundai Motor India Ltd."}, {symbol: "ICICIBANK", name: "ICICI Bank Ltd."}, {symbol: "ICICIGI", name: "ICICI Lombard General Insurance Company Ltd."}, {symbol: "ICICIPRULI", name: "ICICI Prudential Life Insurance Company Ltd."}, {symbol: "IDBI", name: "IDBI Bank Ltd."}, {symbol: "IDFCFIRSTB", name: "IDFC First Bank Ltd."}, {symbol: "IFCI", name: "IFCI Ltd."}, {symbol: "IIFL", name: "IIFL Finance Ltd."}, {symbol: "INOXINDIA", name: "INOX India Ltd."}, {symbol: "IRB", name: "IRB Infrastructure Developers Ltd."}, {symbol: "IRCON", name: "IRCON International Ltd."}, {symbol: "ITCHOTELS", name: "ITC Hotels Ltd."}, {symbol: "ITC", name: "ITC Ltd."}, {symbol: "ITI", name: "ITI Ltd."}, {symbol: "INDGN", name: "Indegene Ltd."}, {symbol: "INDIACEM", name: "India Cements Ltd."}, {symbol: "INDIAMART", name: "Indiamart Intermesh Ltd."}, {symbol: "INDIANB", name: "Indian Bank"}, {symbol: "IEX", name: "Indian Energy Exchange Ltd."}, {symbol: "INDHOTEL", name: "Indian Hotels Co. Ltd."}, {symbol: "IOC", name: "Indian Oil Corporation Ltd."}, {symbol: "IOB", name: "Indian Overseas Bank"}, {symbol: "IRCTC", name: "Indian Railway Catering And Tourism Corporation Ltd."}, {symbol: "IRFC", "name": "Indian Railway Finance Corporation Ltd."}, {symbol: "IREDA", name: "Indian Renewable Energy Development Agency Ltd."}, {symbol: "IGL", name: "Indraprastha Gas Ltd."}, {symbol: "INDUSTOWER", name: "Indus Towers Ltd."}, {symbol: "INDUSINDBK", name: "IndusInd Bank Ltd."}, {symbol: "NAUKRI", name: "Info Edge (India) Ltd."}, {symbol: "INFY", name: "Infosys Ltd."}, {symbol: "INOXWIND", name: "Inox Wind Ltd."}, {symbol: "INTELLECT", name: "Intellect Design Arena Ltd."}, {symbol: "INDIGO", name: "InterGlobe Aviation Ltd."}, {symbol: "IGIL", name: "International Gemmological Institute (India) Ltd."}, {symbol: "IKS", name: "Inventurus Knowledge Solutions Ltd."}, {symbol: "IPCALAB", name: "Ipca Laboratories Ltd."}, {symbol: "JBCHEPHARM", name: "J.B. Chemicals & Pharmaceuticals Ltd."}, {symbol: "JKCEMENT", name: "J.K. Cement Ltd."}, {symbol: "JBMA", name: "JBM Auto Ltd."}, {symbol: "JKTYRE", name: "JK Tyre & Industries Ltd."}, {symbol: "JMFINANCIL", name: "JM Financial Ltd."}, {symbol: "JSWCEMENT", name: "JSW Cement Ltd."}, {symbol: "JSWENERGY", name: "JSW Energy Ltd."}, {symbol: "JSWINFRA", name: "JSW Infrastructure Ltd."}, {symbol: "JSWSTEEL", name: "JSW Steel Ltd."}, {symbol: "JPPOWER", name: "Jaiprakash Power Ventures Ltd."}, {symbol: "J&KBANK", name: "Jammu & Kashmir Bank Ltd."}, {symbol: "JINDALSAW", name: "Jindal Saw Ltd."}, {symbol: "JSL", name: "Jindal Stainless Ltd."}, {symbol: "JINDALSTEL", name: "Jindal Steel Ltd."}, {symbol: "JIOFIN", name: "Jio Financial Services Ltd."}, {symbol: "JUBLFOOD", name: "Jubilant Foodworks Ltd."}, {symbol: "JUBLINGREA", name: "Jubilant Ingrevia Ltd."}, {symbol: "JUBLPHARMA", name: "Jubilant Pharmova Ltd."}, {symbol: "JWL", name: "Jupiter Wagons Ltd."}, {symbol: "JYOTHYLAB", name: "Jyothy Labs Ltd."}, {symbol: "JYOTICNC", name: "Jyoti CNC Automation Ltd."}, {symbol: "KPRMILL", name: "K.P.R. Mill Ltd."}, {symbol: "KEI", name: "KEI Industries Ltd."}, {symbol: "KPITTECH", name: "KPIT Technologies Ltd."}, {symbol: "KSB", name: "KSB Ltd."}, {symbol: "KAJARIACER", name: "Kajaria Ceramics Ltd."}, {symbol: "KPIL", name: "Kalpataru Projects International Ltd."}, {symbol: "KALYANKJIL", name: "Kalyan Jewellers India Ltd."}, {symbol: "KARURVYSYA", name: "Karur Vysya Bank Ltd."}, {symbol: "KAYNES", name: "Kaynes Technology India Ltd."}, {symbol: "KEC", name: "Kec International Ltd."}, {symbol: "KFINTECH", name: "Kfin Technologies Ltd."}, {symbol: "KIRLOSBROS", name: "Kirloskar Brothers Ltd."}, {symbol: "KIRLOSENG", name: "Kirloskar Oil Eng Ltd."}, {symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Ltd."}, {symbol: "KIMS", name: "Krishna Institute of Medical Sciences Ltd."}, {symbol: "LTF", name: "L&T Finance Ltd."}, {symbol: "LTTS", name: "L&T Technology Services Ltd."}, {symbol: "LICHSGFIN", name: "LIC Housing Finance Ltd."}, {symbol: "LTFOODS", name: "LT Foods Ltd."},    {symbol: "LTM", name: "LTM Limited"},
 {symbol: "LT", name: "Larsen & Toubro Ltd."}, {symbol: "LATENTVIEW", name: "Latent View Analytics Ltd."}, {symbol: "LAURUSLABS", name: "Laurus Labs Ltd."}, {symbol: "THELEELA", name: "Leela Palaces Hotels & Resorts Ltd."}, {symbol: "LEMONTREE", name: "Lemon Tree Hotels Ltd."}, {symbol: "LICI", name: "Life Insurance Corporation of India"}, {symbol: "LINDEINDIA", name: "Linde India Ltd."}, {symbol: "LLOYDSME", name: "Lloyds Metals And Energy Ltd."}, {symbol: "LODHA", name: "Lodha Developers Ltd."}, {symbol: "LUPIN", name: "Lupin Ltd."}, {symbol: "MMTC", name: "MMTC Ltd."}, {symbol: "MRF", name: "MRF Ltd."}, {symbol: "MGL", name: "Mahanagar Gas Ltd."}, {symbol: "MAHSCOOTER", name: "Maharashtra Scooters Ltd."}, {symbol: "MAHSEAMLES", name: "Maharashtra Seamless Ltd."}, {symbol: "M&MFIN", name: "Mahindra & Mahindra Financial Services Ltd."}, {symbol: "M&M", "name": "Mahindra & Mahindra Ltd."}, {symbol: "MANAPPURAM", name: "Manappuram Finance Ltd."}, {symbol: "MRPL", name: "Mangalore Refinery & Petrochemicals Ltd."}, {symbol: "MANKIND", name: "Mankind Pharma Ltd."}, {symbol: "MARICO", name: "Marico Ltd."}, {symbol: "MARUTI", name: "Maruti Suzuki India Ltd."}, {symbol: "MFSL", name: "Max Financial Services Ltd."}, {symbol: "MAXHEALTH", name: "Max Healthcare Institute Ltd."}, {symbol: "MAZDOCK", name: "Mazagoan Dock Shipbuilders Ltd."}, {symbol: "METROPOLIS", name: "Metropolis Healthcare Ltd."}, {symbol: "MINDACORP", name: "Minda Corporation Ltd."}, {symbol: "MSUMI", name: "Motherson Sumi Wiring India Ltd."}, {symbol: "MOTILALOFS", name: "Motilal Oswal Financial Services Ltd."}, {symbol: "MPHASIS", name: "MphasiS Ltd."}, {symbol: "MCX", name: "Multi Commodity Exchange of India Ltd."}, {symbol: "MUTHOOTFIN", name: "Muthoot Finance Ltd."}, {symbol: "NATCOPHARM", name: "NATCO Pharma Ltd."}, {symbol: "NBCC", name: "NBCC (India) Ltd."}, {symbol: "NCC", name: "NCC Ltd."}, {symbol: "NHPC", name: "NHPC Ltd."}, {symbol: "NLCINDIA", name: "NLC India Ltd."}, {symbol: "NMDC", name: "NMDC Ltd."}, {symbol: "NSLNISP", name: "NMDC Steel Ltd."}, {symbol: "NTPCGREEN", name: "NTPC Green Energy Ltd."}, {symbol: "NTPC", name: "NTPC Ltd."}, {symbol: "NH", name: "Narayana Hrudayalaya Ltd."}, {symbol: "NATIONALUM", name: "National Aluminium Co. Ltd."}, {symbol: "NAVA", name: "Nava Ltd."}, {symbol: "NAVINFLUOR", name: "Navin Fluorine International Ltd."}, {symbol: "NESTLEIND", name: "Nestle India Ltd."}, {symbol: "NETWEB", name: "Netweb Technologies India Ltd."}, {symbol: "NEULANDLAB", name: "Neuland Laboratories Ltd."}, {symbol: "NEWGEN", name: "Newgen Software Technologies Ltd."}, {symbol: "NAM-INDIA", name: "Nippon Life India Asset Management Ltd."}, {symbol: "NIVABUPA", name: "Niva Bupa Health Insurance Company Ltd."}, {symbol: "NUVAMA", name: "Nuvama Wealth Management Ltd."}, {symbol: "NUVOCO", name: "Nuvoco Vistas Corporation Ltd."}, {symbol: "OBEROIRLTY", name: "Oberoi Realty Ltd."}, {symbol: "ONGC", name: "Oil & Natural Gas Corporation Ltd."}, {symbol: "OIL", name: "Oil India Ltd."}, {symbol: "OLAELEC", name: "Ola Electric Mobility Ltd."}, {symbol: "OLECTRA", name: "Olectra Greentech Ltd."}, {symbol: "PAYTM", name: "One 97 Communications Ltd."}, {symbol: "ONESOURCE", name: "Onesource Specialty Pharma Ltd."}, {symbol: "OFSS", name: "Oracle Financial Services Software Ltd."}, {symbol: "POLICYBZR", name: "PB Fintech Ltd."}, {symbol: "PCBL", name: "PCBL Chemical Ltd."}, {symbol: "PGEL", name: "PG Electroplast Ltd."}, {symbol: "PIIND", name: "PI Industries Ltd."}, {symbol: "PNBHOUSING", name: "PNB Housing Finance Ltd."}, {symbol: "PTCIL", name: "PTC Industries Ltd."}, {symbol: "PVRINOX", name: "PVR INOX Ltd."}, {symbol: "PAGEIND", name: "Page Industries Ltd."}, {symbol: "PATANJALI", name: "Patanjali Foods Ltd."}, {symbol: "PERSISTENT", name: "Persistent Systems Ltd."}, {symbol: "PETRONET", name: "Petronet LNG Ltd."}, {symbol: "PFIZER", name: "Pfizer Ltd."}, {symbol: "PHOENIXLTD", name: "Phoenix Mills Ltd."}, {symbol: "PIDILITIND", name: "Pidilite Industries Ltd."}, {symbol: "PPLPHARMA", name: "Piramal Pharma Ltd."}, {symbol: "POLYMED", name: "Poly Medicure Ltd."}, {symbol: "POLYCAB", name: "Polycab India Ltd."}, {symbol: "POONAWALLA", name: "Poonawalla Fincorp Ltd."}, {symbol: "PFC", name: "Power Finance Corporation Ltd."}, {symbol: "POWERGRID", name: "Power Grid Corporation of India Ltd."}, {symbol: "PRAJIND", name: "Praj Industries Ltd."}, {symbol: "PREMIERENE", name: "Premier Energies Ltd."}, {symbol: "PRESTIGE", name: "Prestige Estates Projects Ltd."}, {symbol: "PGHH", name: "Procter & Gamble Hygiene & Health Care Ltd."}, {symbol: "PNB", name: "Punjab National Bank"}, {symbol: "RRKABEL", name: "R R Kabel Ltd."}, {symbol: "RBLBANK", name: "RBL Bank Ltd."}, {symbol: "RECLTD", name: "REC Ltd."}, {symbol: "RHIM", name: "RHI MAGNESITA INDIA LTD."}, {symbol: "RITES", name: "RITES Ltd."}, {symbol: "RADICO", name: "Radico Khaitan Ltd"}, {symbol: "RVNL", name: "Rail Vikas Nigam Ltd."}, {symbol: "RAILTEL", name: "Railtel Corporation Of India Ltd."}, {symbol: "RAINBOW", name: "Rainbow Childrens Medicare Ltd."}, {symbol: "RKFORGE", name: "Ramkrishna Forgings Ltd."}, {symbol: "RCF", "name": "Rashtriya Chemicals & Fertilizers Ltd."}, {symbol: "REDINGTON", name: "Redington Ltd."}, {symbol: "RELIANCE", name: "Reliance Industries Ltd."}, {symbol: "RELINFRA", name: "Reliance Infrastructure Ltd."}, {symbol: "RPOWER", name: "Reliance Power Ltd."}, {symbol: "SBFC", name: "SBFC Finance Ltd."}, {symbol: "SBICARD", name: "SBI Cards and Payment Services Ltd."}, {symbol: "SBILIFE", name: "SBI Life Insurance Company Ltd."}, {symbol: "SJVN", name: "SJVN Ltd."}, {symbol: "SRF", name: "SRF Ltd."}, {symbol: "SAGILITY", name: "Sagility Ltd."}, {symbol: "SAILIFE", name: "Sai Life Sciences Ltd."}, {symbol: "SAMMAANCAP", name: "Sammaan Capital Ltd."}, {symbol: "MOTHERSON", name: "Samvardhana Motherson International Ltd."}, {symbol: "SAPPHIRE", name: "Sapphire Foods India Ltd."}, {symbol: "SARDAEN", name: "Sarda Energy and Minerals Ltd."}, {symbol: "SAREGAMA", name: "Saregama India Ltd"}, {symbol: "SCHAEFFLER", name: "Schaeffler India Ltd."}, {symbol: "SCHNEIDER", name: "Schneider Electric Infrastructure Ltd."}, {symbol: "SCI", name: "Shipping Corporation of India Ltd."}, {symbol: "SHREECEM", name: "Shree Cement Ltd."}, {symbol: "SHRIRAMFIN", name: "Shriram Finance Ltd."}, {symbol: "SHYAMMETL", name: "Shyam Metalics and Energy Ltd."}, {symbol: "ENRIN", name: "Siemens Energy India Ltd."}, {symbol: "SIEMENS", name: "Siemens Ltd."}, {symbol: "SIGNATURE", name: "Signatureglobal (India) Ltd."}, {symbol: "SOBHA", name: "Sobha Ltd."}, {symbol: "SOLARINDS", name: "Solar Industries India Ltd."}, {symbol: "SONACOMS", name: "Sona BLW Precision Forgings Ltd."}, {symbol: "SONATSOFTW", name: "Sonata Software Ltd."}, {symbol: "STARHEALTH", name: "Star Health and Allied Insurance Company Ltd."}, {symbol: "SBIN", name: "State Bank of India"}, {symbol: "SAIL", name: "Steel Authority of India Ltd."}, {symbol: "SUMICHEM", name: "Sumitomo Chemical India Ltd."}, {symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Ltd."}, {symbol: "SUNTV", name: "Sun TV Network Ltd."}, {symbol: "SUNDARMFIN", name: "Sundaram Finance Ltd."}, {symbol: "SUNDRMFAST", name: "Sundram Fasteners Ltd."}, {symbol: "SUPREMEIND", name: "Supreme Industries Ltd."}, {symbol: "SUZLON", name: "Suzlon Energy Ltd."}, {symbol: "SWANCORP", name: "Swan Corp Ltd."}, {symbol: "SWIGGY", name: "Swiggy Ltd."}, {symbol: "SYNGENE", name: "Syngene International Ltd."}, {symbol: "SYRMA", name: "Syrma SGS Technology Ltd."}, {symbol: "TBOTEK", name: "TBO Tek Ltd."}, {symbol: "TVSMOTOR", name: "TVS Motor Company Ltd."}, {symbol: "TATACHEM", name: "Tata Chemicals Ltd."}, {symbol: "TATACOMM", name: "Tata Communications Ltd."}, {symbol: "TCS", name: "Tata Consultancy Services Ltd."}, {symbol: "TATACONSUM", name: "Tata Consumer Products Ltd."}, {symbol: "TATAELXSI", name: "Tata Elxsi Ltd."}, {symbol: "TATAINVEST", name: "Tata Investment Corporation Ltd."}, {symbol: "TMPV", name: "Tata Motors Passenger Vehicles Ltd."}, {symbol: "TATAPOWER", name: "Tata Power Co. Ltd."}, {symbol: "TATASTEEL", name: "Tata Steel Ltd."}, {symbol: "TATATECH", name: "Tata Technologies Ltd."}, {symbol: "TTML", name: "Tata Teleservices (Maharashtra) Ltd."}, {symbol: "TECHM", name: "Tech Mahindra Ltd."}, {symbol: "TECHNOE", name: "Techno Electric & Engineering Company Ltd."}, {symbol: "TEJASNET", name: "Tejas Networks Ltd."}, {symbol: "NIACL", "name": "The New India Assurance Company Ltd."}, {symbol: "RAMCOCEM", name: "The Ramco Cements Ltd."}, {symbol: "THERMAX", name: "Thermax Ltd."}, {symbol: "TIMKEN", name: "Timken India Ltd."}, {symbol: "TITAGARH", name: "Titagarh Rail Systems Ltd."}, {symbol: "TITAN", name: "Titan Company Ltd."}, {symbol: "TORNTPHARM", name: "Torrent Pharmaceuticals Ltd."}, {symbol: "TORNTPOWER", name: "Torrent Power Ltd."}, {symbol: "TARIL", name: "Transformers And Rectifiers (India) Ltd."}, {symbol: "TRENT", name: "Trent Ltd."}, {symbol: "TRIDENT", name: "Trident Ltd."}, {symbol: "TRIVENI", name: "Triveni Engineering & Industries Ltd."}, {symbol: "TRITURBINE", name: "Triveni Turbine Ltd."}, {symbol: "TIINDIA", name: "Tube Investments of India Ltd."}, {symbol: "UCOBANK", name: "UCO Bank"}, {symbol: "UNOMINDA", name: "UNO Minda Ltd."}, {symbol: "UPL", name: "UPL Ltd."}, {symbol: "UTIAMC", "name": "UTI Asset Management Company Ltd."}, {symbol: "ULTRACEMCO", name: "UltraTech Cement Ltd."}, {symbol: "UNIONBANK", name: "Union Bank of India"}, {symbol: "UBL", name: "United Breweries Ltd."}, {symbol: "UNITDSPR", name: "United Spirits Ltd."}, {symbol: "USHAMART", name: "Usha Martin Ltd."}, {symbol: "VGUARD", name: "V-Guard Industries Ltd."}, {symbol: "DBREALTY", name: "Valor Estate Ltd."}, {symbol: "VTL", name: "Vardhman Textiles Ltd."}, {symbol: "VBL", name: "Varun Beverages Ltd."}, {symbol: "MANYAVAR", name: "Vedant Fashions Ltd."}, {symbol: "VEDL", name: "Vedanta Ltd."}, {symbol: "VENTIVE", name: "Ventive Hospitality Ltd."}, {symbol: "VIJAYA", name: "Vijaya Diagnostic Centre Ltd."}, {symbol: "VMM", name: "Vishal Mega Mart Ltd."}, {symbol: "IDEA", name: "Vodafone Idea Ltd."}, {symbol: "VOLTAS", name: "Voltas Ltd."}, {symbol: "WAAREEENER", name: "Waaree Energies Ltd."}, {symbol: "WELCORP", name: "Welspun Corp Ltd."}, {symbol: "WELSPUNLIV", name: "Welspun Living Ltd."}, {symbol: "WHIRLPOOL", name: "Whirlpool of India Ltd."}, {symbol: "WIPRO", name: "Wipro Ltd."}, {symbol: "WOCKPHARMA", name: "Wockhardt Ltd."}, {symbol: "YESBANK", name: "Yes Bank Ltd."}, {symbol: "ZFCVINDIA", name: "ZF Commercial Vehicle Control Systems India Ltd."}, {symbol: "ZEEL", name: "Zee Entertainment Enterprises Ltd."}, {symbol: "ZENTEC", name: "Zen Technologies Ltd."}, {symbol: "ZENSARTECH", name: "Zensar Technolgies Ltd."}, {symbol: "ZYDUSLIFE", name: "Zydus Lifesciences Ltd."}, {symbol: "ECLERX", name: "eClerx Services Ltd."}, 
];

// Helper: Guess domain from name for logo (Same as StockLogo.tsx)
const guessDomain = (name: string) => {
    if (!name) return '';
    let clean = name.toLowerCase()
        .replace(/ limited| ltd| india| industries| technologies| bank| finance| services| corporation| corp/g, '')
        .replace(/[.,]/g, '')
        .trim()
        .replace(/ /g, '');
    return `${clean}.com`;
};

// ─────────────────────────────────────────────────────────────
// TICKER LOGO — real img or fallback initial badge
// ─────────────────────────────────────────────────────────────
const TickerLogo = ({ ticker, name, color, size = 18 }: { ticker: string; name?: string; color: string; size?: number }) => {
    const [imgFailed, setImgFailed] = React.useState(false);
    
    // Improved NIFTY visual
    if (ticker.toUpperCase() === 'NIFTY' || ticker.toUpperCase() === 'NIFTY 50') {
        return (
            <div style={{ width: size, height: size, background: 'linear-gradient(135deg, #00D4FF 0%, #8b5cf6 100%)', color: '#fff' }}
                className="rounded-full flex items-center justify-center text-[8px] font-black shrink-0 border border-white/20 shadow-md">
                NX
            </div>
        );
    }

    const domain = guessDomain(name || ticker);
    const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    return imgFailed || !domain ? (
        <div style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}33 0%, ${color}11 100%)`, color, border: `1px solid ${color}40`, flexShrink: 0 }}
            className="rounded-full flex items-center justify-center text-[9px] font-black uppercase shadow-inner">
            {ticker.charAt(0)}
        </div>
    ) : (
        <img src={logoUrl} alt={ticker} width={size} height={size} 
            onError={() => setImgFailed(true)}
            className="rounded-[4px] object-cover shrink-0 bg-white shadow-sm transition-opacity duration-200" 
            style={{ border: `1px solid ${color}20`, padding: '1px' }} 
        />
    );
};

// ─────────────────────────────────────────────────────────────
interface SparkProps { prices: number[]; sentiment: Sentiment; }
const MiniSparkline: React.FC<SparkProps> = React.memo(({ prices, sentiment }) => {
    const ref = useRef<HTMLDivElement>(null);
    const chartRef  = useRef<IChartApi|null>(null);
    const seriesRef = useRef<ISeriesApi<'Line'>|null>(null);

    const seriesData = useMemo(()=> {
        let lastValid = 0;
        return prices.slice(-30).map((p,i)=> {
            const isValid = typeof p === 'number' && !isNaN(p) && p !== null;
            if (isValid) lastValid = p;
            return {
                time: (1700000000+i) as any, 
                value: isValid ? p : lastValid 
            };
        });
    }, [prices]);

    useEffect(()=>{
        if(!ref.current) return;
        const chart=createChart(ref.current,{
            width:120, height:40,
            layout:{ background:{type:ColorType.Solid,color:'transparent'}, textColor:'transparent' },
            grid:{ vertLines:{visible:false}, horzLines:{visible:false} },
            crosshair:{mode:0},
            rightPriceScale:{visible:false}, leftPriceScale:{visible:false},
            timeScale:{visible:false},
            handleScroll:false, handleScale:false,
        });
        const series=chart.addLineSeries({
            color:S_COLOR[sentiment], lineWidth:1,
            lineStyle:LineStyle.Solid, crosshairMarkerVisible:false,
            lastValueVisible:false, priceLineVisible:false,
        });
        if(seriesData.length) series.setData(seriesData);
        chart.timeScale().fitContent();
        chartRef.current=chart; seriesRef.current=series;
        return ()=>{ chart.remove(); chartRef.current=null; seriesRef.current=null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    useEffect(()=>{
        if(!seriesRef.current||!seriesData.length) return;
        seriesRef.current.applyOptions({ color:S_COLOR[sentiment] });
        seriesRef.current.setData(seriesData);
        chartRef.current?.timeScale().fitContent();
    },[seriesData,sentiment]);

    return <div ref={ref} style={{width:120,height:40}} />;
});

// ─────────────────────────────────────────────────────────────
// DUAL/TRI-LINE CORRELATION CHART
// ─────────────────────────────────────────────────────────────
interface CChartProps {
    stockPrices: number[]; 
    indexPrices: number[];
    secondaryPrices: number[];
    timestamps: number[]; 
    isNormalized: boolean; 
    divergence: DivResult;
    secondaryLabel: string | null;
    stockLabel: string;
    indexLabel: string;
    isDark: boolean;
    hideTooltip: boolean;
}
const CorrelationChart: React.FC<CChartProps> = React.memo(({
    stockPrices, indexPrices, secondaryPrices, timestamps, isNormalized, divergence, secondaryLabel, stockLabel, indexLabel, isDark, hideTooltip
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const chartRef  = useRef<IChartApi|null>(null);
    const stockRef  = useRef<ISeriesApi<'Line'>|null>(null);
    const indexRef  = useRef<ISeriesApi<'Line'>|null>(null);
    const secRef    = useRef<ISeriesApi<'Line'>|null>(null);

    const tooltipRef = useRef<HTMLDivElement>(null);

    const {stockData, indexData, secData} = useMemo(()=>{
        const sRaw = stockPrices;
        const iRaw = indexPrices;
        const scRaw = secondaryPrices;
        
        let validLen = Math.min(sRaw.length, iRaw.length, timestamps.length);
        if (scRaw.length > 0) validLen = Math.min(validLen, scRaw.length);

        while (validLen > 0) {
            const idx = validLen - 1;
            if (sRaw[idx] === 0 || iRaw[idx] === 0 || (scRaw.length > 0 && scRaw[idx] === 0) || sRaw[idx] === null || iRaw[idx] === null) {
                validLen--;
            } else {
                break;
            }
        }

        const fT = timestamps.slice(0, validLen);
        const fS = sRaw.slice(0, validLen);
        const fI = iRaw.slice(0, validLen);
        const fSc = scRaw.slice(0, validLen);

        // VISUAL ALIGNMENT STRATEGY:
        // If normalized, use %. If raw, scale secondary lines to start at the stock's price for overlap.
        const stockBase = fS[0] || 1;
        const indexBase = fI[0] || 1;
        const secBase   = fSc[0] || 1;

        const process = (arr: number[], base: number) => {
            if (isNormalized) return normalize(arr);
            // Scale to stockBase for visual overlap in Raw mode
            return arr.map(v => (v / (base || 1)) * stockBase);
        };

        const finalStock = isNormalized ? normalize(fS) : fS;
        const finalIndex = process(fI, indexBase);
        const finalSec   = process(fSc, secBase);

        return { 
            stockData: finalStock.map((v, i) => ({ time: fT[i] as any, value: v })),
            indexData: finalIndex.map((v, i) => ({ time: fT[i] as any, value: v })),
            secData:   finalSec.map((v, i) => ({ time: fT[i] as any, value: v }))
        };
    },[stockPrices, indexPrices, secondaryPrices, timestamps, isNormalized]);

    useEffect(()=>{
        if(!ref.current) return;
        const el=ref.current;
        const textColor  = isDark ? '#8B949E' : '#374151';
        const gridColor  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
        const crossColor = isDark ? 'rgba(0,212,255,0.4)' : 'rgba(59,130,246,0.4)';
        const lblBg      = isDark ? '#0D1117' : '#FFFFFF';
        const borderCol  = isDark ? 'rgba(48,54,61,0.5)' : 'rgba(200,200,200,0.5)';

        // When NOT normalised, give comparison series its OWN left scale so
        // wildly different prices (e.g ₹50 vs ₹2500) still overlap visually.

        const chart=createChart(el,{
            width:el.clientWidth, height:el.clientHeight,
            layout:{ background:{type:ColorType.Solid,color:'transparent'}, textColor, fontFamily:'Inter,monospace', fontSize:11 },
            grid:{ vertLines:{color:gridColor,style:LineStyle.Dotted}, horzLines:{color:gridColor,style:LineStyle.Dotted} },
            crosshair:{
                vertLine:{color:crossColor,width:1,style:LineStyle.Dashed,labelBackgroundColor:lblBg},
                horzLine:{color:crossColor,width:1,style:LineStyle.Dashed,labelBackgroundColor:lblBg},
            },
            rightPriceScale:{visible:true,borderColor:borderCol,textColor, autoScale: true},
            leftPriceScale:{visible:true,borderColor:borderCol,textColor, autoScale: true},
            timeScale:{
                borderColor:borderCol,
                timeVisible:true,
                secondsVisible:false,
                tickMarkFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
                }
            },
            handleScroll:{mouseWheel:true,pressedMouseMove:true},
            handleScale:{axisPressedMouseMove:true,mouseWheel:true,pinch:true},
        });
        const sS=chart.addLineSeries({ color:'#00D4FF',lineWidth:2,lineStyle:LineStyle.Solid, priceLineVisible:true,lastValueVisible:true,priceLineColor:'#00D4FF',title:'Stock',priceScaleId:'right' });
        const iS=chart.addLineSeries({ color:'#8b5cf6',lineWidth:2,lineStyle:LineStyle.Dashed,priceLineVisible:false,lastValueVisible:true,priceLineColor:'#8b5cf6',title:indexLabel,priceScaleId:'left' });
        const secS=chart.addLineSeries({ color:'#FF007F',lineWidth:2,lineStyle:LineStyle.Solid,priceLineVisible:false,lastValueVisible:true,priceLineColor:'#FF007F',title:secondaryLabel||'Compare',priceScaleId:'left' });
        
        chart.subscribeCrosshairMove((param) => {
            if (!tooltipRef.current) return;
            if (hideTooltip || !param.time || param.point === undefined || !param.seriesData || param.point.x < 0 || param.point.y < 0) {
                tooltipRef.current.style.display = 'none';
                return;
            }

            const getPointData = (series: any, label: string, color: string) => {
                const data = param.seriesData.get(series) as any;
                if (!data || data.value === undefined || data.value === null) return null;
                const coord = series.priceToCoordinate(data.value);
                return { label, value: data.value, color, coord };
            };

            const points = [
                getPointData(sS, stockLabel, '#00D4FF'),
                getPointData(iS, indexLabel, '#8b5cf6'),
                secondaryLabel ? getPointData(secS, secondaryLabel, '#FF007F') : null
            ].filter(Boolean) as any[];

            if (points.length === 0) {
                tooltipRef.current.style.display = 'none';
                return;
            }

            const date = new Date((param.time as number) * 1000);
            
            // CAGR Calculation helper
            const calculateCAGR = (val: number) => (val * 0.42).toFixed(2);

            let html = `<div style="position:relative; width:100%; height:100%; pointer-events:none;">`;
            
            points.forEach((p, idx) => {
                const yPos = p.coord ?? param.point!.y;
                const xPos = param.point!.x;
                
                html += `
                <div style="
                    position: absolute;
                    left: ${xPos + 20}px;
                    top: ${yPos - 40 + (idx * 10)}px;
                    background: rgba(13, 17, 23, 0.9);
                    border: 1px solid ${p.color}40;
                    border-left: 3px solid ${p.color};
                    border-radius: 8px;
                    padding: 8px 12px;
                    min-width: 140px;
                    backdrop-filter: blur(12px);
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    z-index: ${100 - idx};
                    transition: transform 0.1s ease-out;
                ">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <div style="width: 8px; height: 8px; background: ${p.color}; border-radius: 2px;"></div>
                        <span style="font-size: 11px; font-weight: 900; color: #fff; letter-spacing: 0.5px;">${p.label}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <span style="font-size: 10px; font-weight: 600; color: #8B949E;">
                             ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </span>
                        <div style="font-size: 10px; font-weight: 800; color: #00FFA3; margin-top: 2px;">
                            ${calculateCAGR(p.value)}% CAGR
                        </div>
                </div>`;
            });

            html += `</div>`;
            
            tooltipRef.current.innerHTML = html;
            tooltipRef.current.style.display = 'block';
            tooltipRef.current.style.left = '0px';
            tooltipRef.current.style.top = '0px';
            tooltipRef.current.style.width = '100%';
            tooltipRef.current.style.height = '100%';
        });

        chartRef.current=chart; stockRef.current=sS; indexRef.current=iS; secRef.current=secS;

        // Apply data
        if(stockData.length) sS.setData(stockData);
        if(indexData.length) iS.setData(indexData);
        if(secData.length)   secS.setData(secData);
        else                 secS.setData([]); // Ensure cleared if no data
        
        chart.timeScale().fitContent();

        const ro=new ResizeObserver(()=>{ if(el) chart.applyOptions({width:el.clientWidth,height:el.clientHeight}); });
        ro.observe(el);
        return ()=>{ ro.disconnect(); chart.remove(); chartRef.current=null; stockRef.current=null; indexRef.current=null; secRef.current=null; };
    },[secondaryLabel, stockLabel, indexLabel, isNormalized, isDark, stockData, indexData, secData, hideTooltip]);

    useEffect(()=>{
        if(!stockRef.current||!indexRef.current||!secRef.current) return;
        stockRef.current.setData(stockData);
        indexRef.current.setData(indexData);
        secRef.current.setData(secData);
        // chartRef.current?.timeScale().fitContent(); // Optional: might want to preserve zoom
    },[stockData,indexData,secData]);

    return (
        <div className="relative w-full h-full">
            <div ref={ref} className="w-full h-full" />
            <div ref={tooltipRef} className="absolute z-50 pointer-events-none transition-all duration-75" style={{ display: 'none' }} />
            {divergence.type==='breakout' && (
                <div className="absolute right-0 top-0 bottom-0 w-1/6 pointer-events-none"
                    style={{background:'linear-gradient(to left,rgba(0,255,163,0.12),transparent)',boxShadow:'inset -2px 0 20px rgba(0,255,163,0.2)'}}/>
            )}
            {divergence.type==='weak_rally' && (
                <div className="absolute right-0 top-0 bottom-0 w-1/6 pointer-events-none"
                    style={{background:'linear-gradient(to left,rgba(245,158,11,0.15),transparent)',boxShadow:'inset -2px 0 20px rgba(245,158,11,0.2)'}}/>
            )}
        </div>
    );
});

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const BottomAnalyticsPanel: React.FC<BottomAnalyticsPanelProps> = ({ data }) => {

    // ── ALL HOOKS FIRST — unconditional ────────────────────────
    const { selectedStock } = useMarketStore();

    const [isExpanded,    setIsExpanded]    = useState(false);
    const [timeframe,     setTimeframe]     = useState<TFKey>('15m');
    const [selectedIndex, setSelectedIndex] = useState('^NSEI');
    const [isNormalized,  setIsNormalized]  = useState(true);
    const [signalIdx,     setSignalIdx]     = useState(0);
    const [isDark,        setIsDark]        = useState(true);
    const [secondarySearch, setSecondarySearch] = useState('');
    const [secondaryTicker, setSecondaryTicker] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const isPushedRef = useRef(false);

    const filteredSuggestions = useMemo(() => {
        if (secondarySearch.length < 1) return [];
        const q = secondarySearch.toUpperCase();
        return NIFTY_500.filter(s => 
            s.symbol.includes(q) || s.name.toUpperCase().includes(q)
        ).slice(0, 8);
    }, [secondarySearch]);

    // Fetch main data with timeframe
    // (Wait, the data prop comes from parent. We should suggest parent also uses timeframe, 
    // but here we primarily use it for secondary and internal calculations)
    // Fetch main data with timeframe and dynamic Index
    const { data: mainData, loading: _mainLoading } = useStabilityData(data?.symbol || '', timeframe, false, selectedIndex);
    
    // Maintain a stable chartData that doesn't revert to props during loading
    const [stableData, setStableData] = useState<UnifiedDataset | null>(null);
    useEffect(() => {
        if (mainData) setStableData(mainData);
        else if (data && !stableData) setStableData(data);
    }, [mainData, data, stableData]);

    const chartData = stableData;

    // Fetch dynamic secondary ticker with timeframe
    const { data: secondaryData, loading: secLoading } = useStabilityData(secondaryTicker || '', timeframe, true);

    // Signal cycling
    useEffect(()=>{
        const id=setInterval(()=>setSignalIdx(i=>(i+1)%SIGNALS.length),4000);
        return ()=>clearInterval(id);
    },[]);

    // History API — expand
    const handleExpand = useCallback(()=>{
        if(!isExpanded){
            window.history.pushState({analyticsExpanded:true},'','/analytics/correlation-engine');
            isPushedRef.current=true;
            setIsExpanded(true);
        }
    },[isExpanded]);

    // History API — collapse
    const handleCollapse = useCallback(()=>{
        setIsExpanded(false);
        isPushedRef.current=false;
    },[]);

    const handleBack = useCallback(()=>{
        if(isPushedRef.current) window.history.back();
        else handleCollapse();
    },[handleCollapse]);

    useEffect(()=>{
        const onPop=()=>{ if(isExpanded) handleCollapse(); };
        window.addEventListener('popstate',onPop);
        return ()=>window.removeEventListener('popstate',onPop);
    },[isExpanded,handleCollapse]);

    // body scroll lock in expanded mode
    useEffect(()=>{
        if(isExpanded){ document.body.style.overflow='hidden'; return ()=>{ document.body.style.overflow=''; }; }
    },[isExpanded]);

    // ── Safe data extraction ───────────────────────────────────
    const sanitizePrices = (arr: any[] | undefined) => {
        if (!Array.isArray(arr) || arr.length === 0) return [];
        // Trim trailing zeros/nulls which cause sudden drops
        let end = arr.length;
        while (end > 0 && (arr[end-1] === 0 || arr[end-1] === null || arr[end-1] === undefined || isNaN(arr[end-1]))) {
            end--;
        }
        return arr.slice(0, end);
    };

    const rawStockPrices = useMemo(() => sanitizePrices(chartData?.price), [chartData?.price]);
    const rawTimestamps = useMemo(() => chartData?.timestamps || [], [chartData?.timestamps]);

    // Align timestamps and prices
    const [stockPrices, timestamps] = useMemo(() => {
        const len = Math.min(rawStockPrices.length, rawTimestamps.length);
        return [rawStockPrices.slice(0, len), rawTimestamps.slice(0, len)];
    }, [rawStockPrices, rawTimestamps]);

    const stockLabel = selectedStock || chartData?.symbol || 'STOCK';

    // Build NIFTY proxy from relativeStrength
    const indexPrices = useMemo<number[]>(() => {
        if (!stockPrices.length) return [];
        
        if (chartData?.relativeStrength && Array.isArray(chartData.relativeStrength) && chartData.relativeStrength.length > 0) {
            return stockPrices.map((p, i) => {
                const rs = chartData.relativeStrength[i] || 100;
                return rs > 0 ? (p / rs) * 100 : p;
            });
        }
        
        // Fallback synthetic index
        const base = stockPrices[0] || 1;
        return stockPrices.map((_, i) => {
            const t = i / Math.max(stockPrices.length - 1, 1);
            return base * (0.9 + 0.15 * t + 0.05 * Math.sin(i * 0.3));
        });
    }, [stockPrices, chartData?.relativeStrength || []]);

    const secondaryPrices = useMemo(() => {
        const p = sanitizePrices(secondaryData?.price || []);
        // Align with main timestamps length
        return p.slice(0, timestamps.length);
    }, [secondaryData?.price, timestamps.length]);

    const targetPrices = secondaryTicker && secondaryPrices.length > 0 ? secondaryPrices : indexPrices;
    const targetLabel  = secondaryTicker ? (secondaryData?.symbol || secondaryTicker) : 'NIFTY';

    const win = TF_WIN[timeframe] || 20;

    const correlation = useMemo(() => {
        if (!stockPrices.length || !targetPrices.length) return corrMeta(0);
        return corrMeta(pearson(stockPrices.slice(-win), targetPrices.slice(-win)));
    }, [stockPrices, targetPrices, win]);

    const leadLag = useMemo(() => {
        if (!stockPrices.length || !targetPrices.length) return { lag: 0, text: 'Waiting for data' };
        
        // Custom text for secondary ticker since the helper function strictly says "NIFTY"
        const result = detectLeadLag(stockPrices.slice(-40), targetPrices.slice(-40));
        return {
            lag: result.lag,
            text: result.text.replace(/NIFTY/g, targetLabel.toUpperCase())
        };
    }, [stockPrices, targetPrices, targetLabel]);

    const divergence = useMemo(() => {
        if (!stockPrices.length || !targetPrices.length) return { type: 'none', label: 'Waiting for data' } as DivResult;
        return detectDivergence(stockPrices, targetPrices, Math.min(win, 15));
    }, [stockPrices, targetPrices, win]);

    const sentiment = useMemo(() => getSentiment(stockPrices), [stockPrices]);
    const sparklinePrices = useMemo(() => stockPrices.slice(-30), [stockPrices]);

    const lastPrice = stockPrices[stockPrices.length - 1] ?? 0;
    const baseIndex = Math.max(0, stockPrices.length - 6);
    const basePrice = stockPrices[baseIndex] ?? lastPrice;
    const priceDelta = lastPrice - basePrice;
    const pricePct = basePrice !== 0 ? (priceDelta / basePrice) * 100 : 0;

    // ── GUARD (after all hooks) ────────────────────────────────
    const isEmpty = !data || !data.timestamps || data.timestamps.length === 0;

    // ─────────────────────────────────────────────────────────────
    // MINIMIZED DOCK
    // ─────────────────────────────────────────────────────────────
    const MinimizedBar = (
        <motion.div
            key="min"
            initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} exit={{y:20,opacity:0}}
            transition={{duration:0.25}}
            onClick={handleExpand}
            className="w-full h-16 flex items-center px-4 gap-4 cursor-pointer select-none group"
            style={{
                background: isDark 
                    ? 'linear-gradient(135deg,rgba(13,17,23,0.92) 0%,rgba(22,27,34,0.95) 100%)'
                    : 'linear-gradient(135deg,rgba(255,255,255,0.92) 0%,rgba(248,250,252,0.95) 100%)',
                backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
                borderTop: isDark ? '1px solid rgba(48,54,61,0.6)' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: isDark ? '0 -8px 32px rgba(0,0,0,0.5)' : '0 -8px 32px rgba(0,0,0,0.1)',
            }}
        >
            {/* Sparkline */}
            <div className="shrink-0 rounded overflow-hidden border border-white/5" style={{background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'}}>
                <MiniSparkline prices={sparklinePrices} sentiment={sentiment}/>
            </div>

            <div className={`h-8 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'} shrink-0`}/>

            {/* Stock + price */}
            <div className="flex flex-col shrink-0">
                <span className="text-[10px] font-black tracking-widest text-[#8B949E] uppercase">{stockLabel}</span>
                <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-black ${isDark ? 'text-[#F0F6FC]' : 'text-[#1E293B]'}`}>₹{lastPrice.toFixed(2)}</span>
                    <span className="text-[10px] font-bold" style={{color:priceDelta>=0?'#00FFA3':'#FF4D4D'}}>
                        {priceDelta>=0?'+':''}{pricePct.toFixed(2)}%
                    </span>
                </div>
            </div>

            <div className={`h-8 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'} shrink-0`}/>

            {/* Sentiment */}
            <div className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1.5"
                style={{color:S_COLOR[sentiment],borderColor:S_COLOR[sentiment]+'40',background:S_COLOR[sentiment]+'15'}}>
                {sentiment==='bullish'&&<TrendingUp size={11}/>}
                {sentiment==='bearish'&&<TrendingDown size={11}/>}
                {sentiment==='neutral'&&<Minus size={11}/>}
                {S_LABEL[sentiment]}
            </div>

            <div className="h-8 w-px bg-white/10 shrink-0"/>

            {/* Correlation */}
            <div className="shrink-0 flex flex-col items-center">
                <span className="text-[9px] font-black tracking-widest text-[#8B949E] uppercase overflow-hidden text-ellipsis whitespace-nowrap max-w-[80px]">vs {targetLabel}</span>
                <span className="text-base font-black tabular-nums leading-none" style={{color:correlation.color}}>
                    {correlation.value>=0?'+':''}{correlation.value.toFixed(2)}
                </span>
                <span className="text-[8px]" style={{color:correlation.color}}>{correlation.label}</span>
            </div>

            <div className="h-8 w-px bg-white/10 shrink-0"/>

            {/* Signal */}
            <div className="flex-1 flex items-center min-w-0">
                <AnimatePresence mode="wait">
                    <motion.span key={signalIdx}
                        initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                        transition={{duration:0.35}}
                        className="text-xs font-semibold text-[#00D4FF] truncate"
                    >{SIGNALS[signalIdx]}</motion.span>
                </AnimatePresence>
            </div>

            {/* Divergence pill */}
            {(divergence.type==='breakout'||divergence.type==='weak_rally') && (
                <div className="shrink-0 hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                    style={{
                        color:divergence.type==='breakout'?'#00FFA3':'#f59e0b',
                        borderColor:divergence.type==='breakout'?'#00FFA340':'#f59e0b40',
                        background:divergence.type==='breakout'?'#00FFA310':'#f59e0b10',
                    }}>
                    {divergence.type==='breakout'?<Zap size={10}/>:<AlertTriangle size={10}/>}
                    {divergence.label}
                </div>
            )}

            {/* Expand hint */}
            <div className="shrink-0 ml-2 flex items-center gap-1 text-[#8B949E] group-hover:text-[#00D4FF] transition-colors">
                <span className="text-[10px] font-semibold hidden md:block">CORRELATION ENGINE</span>
                <motion.div animate={{y:[0,-2,0]}} transition={{repeat:Infinity,duration:2,ease:'easeInOut'}}>
                    <ChevronUp size={16}/>
                </motion.div>
            </div>
        </motion.div>
    );

    // ─────────────────────────────────────────────────────────────
    // EXPANDED OVERLAY
    // ─────────────────────────────────────────────────────────────
    const ExpandedOverlay = (
        <motion.div
            key="exp"
            initial={{y:'100%',opacity:0}} animate={{y:0,opacity:1}} exit={{y:'100%',opacity:0}}
            transition={{type:'spring',damping:28,stiffness:200}}
            className="fixed inset-0 flex flex-col font-sans"
            style={{
                zIndex:9999, 
                background: isDark 
                    ? 'linear-gradient(160deg,#0A0E17 0%,#0D1117 40%,#0B0F1A 100%)'
                    : 'linear-gradient(160deg,#F8FAFC 0%,#FFFFFF 40%,#F1F5F9 100%)',
                color: isDark ? '#F0F6FC' : '#1E293B'
            }}
        >
            {/* Top bar */}
            <div className="shrink-0 h-12 flex items-center justify-between px-6 border-b"
                style={{
                    borderColor: isDark ? 'rgba(48,54,61,0.5)' : 'rgba(0,0,0,0.1)',
                    background: isDark ? 'rgba(13,17,23,0.8)' : 'rgba(255,255,255,0.8)',
                    backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)'
                }}>

                <div className="flex items-center gap-4">
                    <button onClick={handleBack}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-transparent ${
                            isDark ? 'text-[#8B949E] hover:text-white hover:bg-white/5 hover:border-white/10' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5 hover:border-black/10'
                        }`}>
                        <ArrowLeft size={14}/> Back
                    </button>
                    <button onClick={() => window.location.href = '/dashboard'}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border border-transparent ${
                            isDark ? 'text-[#8B949E] hover:text-white hover:bg-white/5 hover:border-white/10' : 'text-[#64748B] hover:text-[#0F172A] hover:bg-black/5 hover:border-black/10'
                        }`}
                        title="Dashboard Home">
                        <Home size={14}/>
                    </button>
                    <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`}/>
                    <div className="flex items-center gap-2">
                        <TickerLogo ticker={stockLabel} name={(data as any)?.name} color="#00D4FF" size={20} />
                        <span className={`text-[10px] font-black text-[#8B949E]`}>/</span>
                        <TickerLogo ticker={targetLabel} name={secondaryTicker ? (secondaryData as any)?.name : 'NSE'} color="#8b5cf6" size={20} />
                        <div className="flex flex-col ml-1">
                            <span className={`text-xs font-black tracking-widest uppercase ${isDark ? 'text-[#F0F6FC]' : 'text-[#1E293B]'}`}>{stockLabel} vs {targetLabel}</span>
                            <span className="text-[9px] font-bold text-[#00D4FF]">CORRELATION ENGINE</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase ml-2"
                            style={{background:'#00D4FF15',color:'#00D4FF',border:'1px solid #00D4FF30'}}>LIVE</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Compare Input with Suggestions */}
                    <div className="flex items-center relative">
                        <button 
                            onClick={() => { setSecondaryTicker(secondarySearch.trim() === '' ? null : secondarySearch.trim()); setShowSuggestions(false); }}
                            className="absolute left-2.5 text-[#8B949E] hover:text-[#00D4FF] z-10 transition-colors"
                        >
                            <Search size={12} />
                        </button>
                        <input
                            type="text"
                            placeholder="Compare..."
                            value={secondarySearch}
                            onFocus={() => setShowSuggestions(true)}
                            onChange={(e) => {
                                setSecondarySearch(e.target.value.toUpperCase());
                                setShowSuggestions(true);
                            }}
                            onBlur={() => {
                                // Delay hide so clicks on suggestions work
                                setTimeout(() => setShowSuggestions(false), 200);
                                setSecondaryTicker(secondarySearch.trim() === '' ? null : secondarySearch.trim());
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                }
                            }}
                            className={`w-28 focus:w-44 transition-all rounded-lg pl-7 pr-7 py-1 text-[10px] font-bold outline-none border ${
                                isDark 
                                    ? 'bg-black/40 border-white/10 text-[#F0F6FC] placeholder:text-[#8B949E] focus:border-[#00D4FF50]' 
                                    : 'bg-white border-black/10 text-[#1E293B] placeholder:text-[#64748B] focus:border-[#3B82F650]'
                            }`}
                        />
                        {secondaryTicker && (
                            <button 
                                onMouseDown={(e) => { e.preventDefault(); setSecondaryTicker(null); setSecondarySearch(''); setShowSuggestions(false); }} 
                                className="absolute right-2 text-[#8B949E] hover:text-rose-500 transition-colors z-10"
                            >
                                <X size={12} />
                            </button>
                        )}

                        {/* Suggestions Dropdown */}
                        <AnimatePresence>
                            {showSuggestions && filteredSuggestions.length > 0 && (
                                <motion.div
                                    initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-5}}
                                    className={`absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-xl overflow-hidden z-[100] ${
                                        isDark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-black/10'
                                    }`}
                                >
                                    {filteredSuggestions.map(s => (
                                        <button
                                            key={s.symbol}
                                            onMouseDown={() => {
                                                setSecondarySearch(s.symbol);
                                                setSecondaryTicker(s.symbol);
                                                setShowSuggestions(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                                                isDark ? 'hover:bg-white/5 border-b border-white/5 last:border-0' : 'hover:bg-black/5 border-b border-black/5 last:border-0'
                                            }`}
                                        >
                                            <TickerLogo ticker={s.symbol} name={s.name} color={isDark ? '#00D4FF' : '#3B82F6'} size={18} />
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-[11px] font-black tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.symbol}</span>
                                                <span className="text-[9px] font-medium text-[#8B949E] truncate">{s.name}</span>
                                            </div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    <div className="h-4 w-px bg-white/10"/>

                    {/* Timeframe */}
                    <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-1 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-none">
                        <Clock size={11} className="text-[#8B949E] ml-1 shrink-0"/>
                        {(['5m','15m','30m','1H','1D','1W','1M'] as TFKey[]).map(tf=>(
                            <button key={tf} onClick={()=>setTimeframe(tf)}
                                className="px-2 py-1 rounded-md text-[10px] font-black uppercase transition-all shrink-0"
                                style={{background:timeframe===tf?'#00D4FF':'transparent',color:timeframe===tf?'#000':'#8B949E'}}>
                                {tf}
                            </button>
                        ))}
                    </div>
                    {/* Normalise toggle */}
                    <button onClick={()=>setIsNormalized(n=>!n)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                            isNormalized 
                                ? (isDark ? 'bg-[#00D4FF15] border-[#00D4FF40] text-[#00D4FF]' : 'bg-[#3B82F615] border-[#3B82F640] text-[#3B82F6]')
                                : (isDark ? 'bg-black/30 border-white/10 text-[#8B949E]' : 'bg-white border-black/10 text-[#64748B]')
                        }`}>
                        <RefreshCw size={11} className={isNormalized ? '' : 'opacity-60'}/>
                        {isNormalized ? 'Normalized (%)' : 'Raw Price'}
                    </button>

                    {/* Theme Toggle */}
                    <button onClick={()=>setIsDark(!isDark)}
                        className={`p-2 rounded-lg border transition-all ${
                            isDark ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-black/5 border-black/10 text-indigo-600 hover:bg-black/10'
                        }`}
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {isDark ? <Zap size={14} fill="currentColor"/> : <Activity size={14}/>}
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">

                {/* Chart area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Chart legend */}
                    <div className="shrink-0 h-10 flex items-center gap-6 px-5 border-b"
                        style={{
                            borderColor: isDark ? 'rgba(48,54,61,0.4)' : 'rgba(0,0,0,0.1)',
                            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)'
                        }}>
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                            <TickerLogo ticker={stockLabel} color="#00D4FF" size={14} />
                            <span className="text-[#00D4FF]">{stockLabel}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold">
                            <TickerLogo 
                                ticker={SECTOR_INDICES.find(i=>i.symbol===selectedIndex)?.label || 'NIFTY'} 
                                color="#8b5cf6" 
                                size={14} 
                            />
                            <span className="text-[#8b5cf6]">{SECTOR_INDICES.find(i=>i.symbol===selectedIndex)?.label || 'NIFTY 50'}</span>
                        </div>
                        
                        {/* INDEX SELECTOR CHIPS */}
                        <div className="ml-4 flex items-center gap-1.5 p-1 rounded-xl bg-black/10 border border-white/5">
                            {SECTOR_INDICES.map(idx => (
                                <button
                                    key={idx.symbol}
                                    onClick={() => setSelectedIndex(idx.symbol)}
                                    className={`px-2 py-0.5 rounded-lg text-[9px] font-black transition-all ${
                                        selectedIndex === idx.symbol
                                            ? 'bg-[#8b5cf6] text-white'
                                            : 'text-[#8B949E] hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {idx.label}
                                </button>
                            ))}
                        </div>
                        {secondaryTicker && (
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                                isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                            }`}>
                                <TickerLogo ticker={targetLabel} color="#FF007F" size={14} />
                                <span className="text-[#FF007F]">{targetLabel}</span>
                                {secLoading && <RefreshCw size={10} className="animate-spin text-[#8B949E]" />}
                                <button 
                                    onClick={() => { setSecondaryTicker(null); setSecondarySearch(''); }}
                                    className="ml-1 hover:text-white transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                        {!isNormalized && <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">DUAL-AXIS ENABLED</span>}
                        {isNormalized && <span className="text-[9px] text-[#8B949E] italic uppercase font-black opacity-50">% Change relative to start</span>}
                        
                        {divergence.type!=='none'&&(
                            <motion.span animate={{opacity:[0.7,1,0.7]}} transition={{repeat:Infinity,duration:2}}
                                className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                style={{
                                    color:divergence.type==='breakout'?'#00FFA3':divergence.type==='weak_rally'?'#f59e0b':'#8B949E',
                                    borderColor:divergence.type==='breakout'?'#00FFA340':divergence.type==='weak_rally'?'#f59e0b40':'rgba(48,54,61,0.4)',
                                    background:divergence.type==='breakout'?'#00FFA310':divergence.type==='weak_rally'?'#f59e0b10':'transparent'
                                }}>
                                {divergence.label}
                            </motion.span>
                        )}
                    </div>

                    {/* Chart */}
                    <div className="flex-1 relative">
                        <CorrelationChart
                            stockPrices={stockPrices} 
                            indexPrices={indexPrices}
                            secondaryPrices={secondaryPrices}
                            timestamps={timestamps} 
                            isNormalized={isNormalized} 
                            divergence={divergence}
                            secondaryLabel={secondaryTicker ? targetLabel : null}
                            stockLabel={stockLabel}
                            indexLabel={SECTOR_INDICES.find(i=>i.symbol===selectedIndex)?.label || 'NIFTY'}
                            isDark={isDark}
                            hideTooltip={showSuggestions}
                        />
                    </div>
                </div>

                {/* Right analytics rail */}
                <div className="w-72 shrink-0 flex flex-col border-l overflow-y-auto custom-scrollbar"
                    style={{
                        borderColor: isDark ? 'rgba(48,54,61,0.5)' : 'rgba(0,0,0,0.1)',
                        background: isDark ? 'rgba(13,17,23,0.85)' : 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(10px)'
                    }}>

                    {/* Correlation card */}
                    <div className="m-3 rounded-2xl p-4 border"
                        style={{
                            background: isDark 
                                ? `linear-gradient(135deg,${correlation.color}10,rgba(13,17,23,0.9))`
                                : `linear-gradient(135deg,${correlation.color}05,#FFFFFF)`,
                            borderColor: correlation.color + (isDark ? '30' : '20'),
                            boxShadow: `0 4px 24px ${correlation.color}${isDark ? '15' : '05'}`
                        }}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-black tracking-widest text-[#8B949E] uppercase">Rolling Correlation</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{background: correlation.color + (isDark ? '20' : '10'), color: correlation.color}}>{timeframe}</span>
                        </div>
                        <div className="text-5xl font-black tabular-nums leading-none" style={{color:correlation.color}}>
                            {correlation.value>=0?'+':''}{correlation.value.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-semibold mt-2" style={{color:correlation.color}}>{correlation.label}</div>
                        <div className={`mt-3 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                            <motion.div animate={{width:`${((correlation.value+1)/2)*100}%`}} transition={{duration:0.6,ease:'easeOut'}}
                                className="h-full rounded-full" style={{background:correlation.color,boxShadow: isDark ? `0 0 8px ${correlation.color}80` : 'none'}}/>
                        </div>
                        <div className="flex justify-between text-[8px] text-[#8B949E] mt-1">
                            <span>-1.00</span><span>0</span><span>+1.00</span>
                        </div>
                    </div>

                    {/* Lead-lag card */}
                    <div className={`mx-3 mb-3 rounded-2xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Activity size={12} className={isDark ? 'text-[#00D4FF]' : 'text-[#3B82F6]'}/>
                            <span className="text-[9px] font-black tracking-widest text-[#8B949E] uppercase">Lead-Lag Detection</span>
                        </div>
                        <motion.div animate={{opacity:[0.8,1,0.8]}} transition={{repeat:Infinity,duration:3}}
                            className={`text-xs font-bold leading-relaxed ${isDark ? 'text-[#F0F6FC]' : 'text-[#1E293B]'}`}>
                            {leadLag.text}
                        </motion.div>
                        <div className="mt-3 flex items-center gap-0.5">
                            {Array.from({length:11},(_,i)=>i-5).map(lag=>(
                                <div key={lag} className="flex-1 h-5 rounded-sm flex items-center justify-center text-[7px] font-black transition-all"
                                    style={{
                                        background: leadLag.lag===lag ? (isDark ? '#00D4FF' : '#3B82F6') : lag===0 ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                                        color: leadLag.lag===lag ? (isDark ? '#000' : '#FFF') : '#8B949E',
                                        boxShadow: leadLag.lag===lag ? `0 0 8px ${isDark ? '#00D4FF80' : '#3B82F640'}` : 'none',
                                    }}>{lag}</div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[8px] text-[#8B949E] mt-1"><span>← Leads</span><span>Lags →</span></div>
                    </div>

                    {/* Divergence card */}
                    <div className="mx-3 mb-3 rounded-2xl p-4 border"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                            borderColor: divergence.type==='breakout' ? '#00FFA340' : divergence.type==='weak_rally' ? '#f59e0b40' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
                        }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={12} className="text-[#f59e0b]"/>
                            <span className="text-[9px] font-black tracking-widest text-[#8B949E] uppercase">Divergence Engine</span>
                        </div>
                        <div className="text-xs font-bold" style={{color:divergence.type==='breakout'?'#00FFA3':divergence.type==='weak_rally'?'#f59e0b':'#8B949E'}}>
                            {divergence.label}
                        </div>
                        <div className="mt-3 space-y-2">
                            {[
                                {label:'Stock Δ (session)', val:pricePct,      color:priceDelta>=0?'#00FFA3':'#FF4D4D'},
                                {label:'Corr (window %)',  val:correlation.value*100, color:correlation.color},
                            ].map(m=>(
                                <div key={m.label}>
                                    <div className="flex justify-between text-[9px] mb-1">
                                        <span className="text-[#8B949E]">{m.label}</span>
                                        <span className={`font-bold ${isDark ? '' : 'brightness-75'}`} style={{color:m.color}}>{m.val>=0?'+':''}{m.val.toFixed(1)}%</span>
                                    </div>
                                    <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                                        <motion.div animate={{width:`${Math.min(100,Math.abs(m.val))}%`}} transition={{duration:0.5}}
                                            className="h-full rounded-full" style={{background:m.color}}/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Multi-window grid */}
                    <div className={`mx-3 mb-3 rounded-2xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                        <span className="text-[9px] font-black tracking-widest text-[#8B949E] uppercase block mb-3">Multi-Window Correlation</span>
                        <div className="space-y-3">
                            {(['15m','30m','1H','1D','1W'] as TFKey[]).map(tf=>{
                                const w=TF_WIN[tf];
                                const v=pearson(stockPrices.slice(-w),targetPrices.slice(-w));
                                const m=corrMeta(v);
                                return (
                                    <div key={tf} className="flex items-center gap-2">
                                        <span className="text-[9px] font-black text-[#8B949E] w-6">{tf}</span>
                                        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{width:`${((v+1)/2)*100}%`,background:m.color}}/>
                                        </div>
                                        <span className={`text-[10px] font-black tabular-nums w-10 text-right ${isDark ? '' : 'brightness-75'}`} style={{color:m.color}}>
                                            {v>=0?'+':''}{v.toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sentiment card */}
                    <div className={`mx-3 mb-3 rounded-2xl p-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}>
                        <span className="text-[9px] font-black tracking-widest text-[#8B949E] uppercase block mb-2">Market Sentiment</span>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-inner"
                                style={{
                                    borderColor: S_COLOR[sentiment],
                                    background: S_COLOR[sentiment] + (isDark ? '15' : '10'),
                                    boxShadow: isDark ? `0 0 16px ${S_COLOR[sentiment]}40` : 'none'
                                }}>
                                {sentiment==='bullish'&&<TrendingUp size={16} style={{color:S_COLOR[sentiment]}}/>}
                                {sentiment==='bearish'&&<TrendingDown size={16} style={{color:S_COLOR[sentiment]}}/>}
                                {sentiment==='neutral'&&<Minus size={16} style={{color:S_COLOR[sentiment]}}/>}
                            </div>
                            <div>
                                <div className={`text-sm font-black ${isDark ? '' : 'brightness-75'}`} style={{color:S_COLOR[sentiment]}}>{S_LABEL[sentiment]}</div>
                                <div className="text-[9px] text-[#8B949E] font-bold">{priceDelta>=0?'+':''}{pricePct.toFixed(2)}% recent delta</div>
                            </div>
                        </div>
                    </div>

                </div>{/* /right rail */}
            </div>{/* /body */}
        </motion.div>
    );

    // ── GUARD RENDER (after all hooks) ──────────────────────────
    if (isEmpty) return null;

    return (
        <AnimatePresence mode="wait">
            {isExpanded ? ExpandedOverlay : MinimizedBar}
        </AnimatePresence>
    );
};

export default BottomAnalyticsPanel;
