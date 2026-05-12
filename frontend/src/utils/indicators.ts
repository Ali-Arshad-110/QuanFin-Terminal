/**
 * Technical Indicator Calculations
 */

// Decoupled from lightweight-charts to prevent import issues
export type Time = number | string;

export interface OHLCData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface LineData {
    time: Time;
    value: number;
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export const calculateSMA = (data: OHLCData[], period: number): LineData[] => {
    const smaData: LineData[] = [];
    if (data.length < period) return smaData;

    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        smaData.push({
            time: data[i].time,
            value: sum / period
        });
    }
    return smaData;
};

/**
 * Calculate Exponential Moving Average (EMA)
 */
export const calculateEMA = (data: OHLCData[], period: number): LineData[] => {
    const emaData: LineData[] = [];
    if (data.length < period) return emaData;

    const multiplier = 2 / (period + 1);

    // Initial EMA is SMA of first 'period' elements
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[i].close;
    }
    let prevEma = sum / period;

    // Push the first point (at index period - 1)
    emaData.push({ time: data[period - 1].time, value: prevEma });

    // Calculate rest
    for (let i = period; i < data.length; i++) {
        const close = data[i].close;
        const ema = (close - prevEma) * multiplier + prevEma;
        emaData.push({ time: data[i].time, value: ema });
        prevEma = ema;
    }

    return emaData;
};

/**
 * Calculate Relative Strength Index (RSI)
 */
export const calculateRSI = (data: OHLCData[], period: number = 14): LineData[] => {
    const rsiData: LineData[] = [];
    if (data.length <= period) return rsiData;

    let gains = 0;
    let losses = 0;

    // First RSI calculation using SMA method for gains/losses
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));

    rsiData.push({ time: data[period].time, value: rsi });

    // Subsequent calculations using Wilder's Smoothing
    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        const currentGain = change > 0 ? change : 0;
        const currentLoss = change < 0 ? Math.abs(change) : 0;

        avgGain = ((avgGain * (period - 1)) + currentGain) / period;
        avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;

        rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));

        rsiData.push({ time: data[i].time, value: rsi });
    }

    return rsiData;
};

/**
 * Calculate Bollinger Bands
 */
export const calculateBollingerBands = (data: OHLCData[], period: number = 20, multiplier: number = 2) => {
    const upper: LineData[] = [];
    const lower: LineData[] = [];
    const middle: LineData[] = []; // Similar to SMA

    if (data.length < period) return { upper, lower, middle };

    for (let i = period - 1; i < data.length; i++) {
        // Calculate SMA
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        const sma = sum / period;

        // Calculate StdDev
        let sumSqDiff = 0;
        for (let j = 0; j < period; j++) {
            const diff = data[i - j].close - sma;
            sumSqDiff += diff * diff;
        }
        const stdDev = Math.sqrt(sumSqDiff / period);

        const upperVal = sma + (multiplier * stdDev);
        const lowerVal = sma - (multiplier * stdDev);

        const time = data[i].time;
        upper.push({ time, value: upperVal });
        lower.push({ time, value: lowerVal });
        middle.push({ time, value: sma });
    }

    return { upper, lower, middle };
};

export interface MACDData {
    time: Time;
    macd: number;
    signal: number;
    histogram: number;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export const calculateMACD = (data: OHLCData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACDData[] => {
    const macdData: MACDData[] = [];
    if (data.length < slowPeriod) return macdData;

    // 1. Calculate Fast and Slow EMAs
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);

    // Map by time for easy lookup (assuming sorted time)
    // Actually, since both start at different indices, we need to align them.
    // slowEMA will be shorter. We match based on time.

    // Create a map for fastEMA
    const fastMap = new Map<Time, number>();
    fastEMA.forEach(d => fastMap.set(d.time, d.value));

    // Calculate MACD Line
    const macdLine: LineData[] = [];
    slowEMA.forEach(s => {
        const fVal = fastMap.get(s.time);
        if (fVal !== undefined) {
            macdLine.push({ time: s.time, value: fVal - s.value });
        }
    });

    // 2. Calculate Signal Line (EMA of MACD Line)
    // We need to adapt calculateEMA to accept LineData[], but our calculateEMA takes OHLCData[].
    // Let's refactor calculateEMA lightly or just duplicate the logic for simple array.
    // Easier to just duplicate logic inline to avoid breaking changes or complex refactors.

    const signalLine: LineData[] = [];
    if (macdLine.length >= signalPeriod) {
        const k = 2 / (signalPeriod + 1);
        let sum = 0;
        for (let i = 0; i < signalPeriod; i++) sum += macdLine[i].value;
        let ema = sum / signalPeriod;

        signalLine.push({ time: macdLine[signalPeriod - 1].time, value: ema });

        for (let i = signalPeriod; i < macdLine.length; i++) {
            ema = (macdLine[i].value - ema) * k + ema;
            signalLine.push({ time: macdLine[i].time, value: ema });
        }
    }

    // 3. Combine for Histogram
    // Align Signal and MACD
    const signalMap = new Map<Time, number>();
    signalLine.forEach(s => signalMap.set(s.time, s.value));

    macdLine.forEach(m => {
        const sVal = signalMap.get(m.time);
        if (sVal !== undefined) {
            macdData.push({
                time: m.time,
                macd: m.value,
                signal: sVal,
                histogram: m.value - sVal
            });
        }
    });

    return macdData;
};

/**
 * Calculate VWAP (Volume-Weighted Average Price)
 * Note: Uses a proxy volume if volume is missing (uses (H+L+C)/3 as typical price, no volume division).
 * If data has a `volume` field it will be used.
 */
export const calculateVWAP = (data: (OHLCData & { volume?: number })[]): LineData[] => {
    const result: LineData[] = [];
    let cumulativeTPV = 0;  // typical price × volume
    let cumulativeVol = 0;
    for (const d of data) {
        const tp = (d.high + d.low + d.close) / 3;
        const vol = d.volume ?? 1; // fallback vol = 1 (makes VWAP = mean typical price)
        cumulativeTPV += tp * vol;
        cumulativeVol += vol;
        result.push({ time: d.time, value: cumulativeTPV / cumulativeVol });
    }
    return result;
};

/**
 * Calculate ATR (Average True Range) - Wilder's smoothed
 */
export const calculateATR = (data: OHLCData[], period: number = 14): LineData[] => {
    const result: LineData[] = [];
    if (data.length < period + 1) return result;

    // First true range values
    const trs: number[] = [];
    for (let i = 1; i < data.length; i++) {
        const tr = Math.max(
            data[i].high - data[i].low,
            Math.abs(data[i].high - data[i - 1].close),
            Math.abs(data[i].low - data[i - 1].close)
        );
        trs.push(tr);
    }

    // Initial ATR = simple average of first period TRs
    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push({ time: data[period].time, value: atr });

    for (let i = period; i < trs.length; i++) {
        atr = (atr * (period - 1) + trs[i]) / period;
        result.push({ time: data[i + 1].time, value: atr });
    }
    return result;
};

/**
 * Calculate CCI (Commodity Channel Index)
 */
export const calculateCCI = (data: OHLCData[], period: number = 20): LineData[] => {
    const result: LineData[] = [];
    if (data.length < period) return result;

    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const tp = slice.map(d => (d.high + d.low + d.close) / 3);
        const smaTP = tp.reduce((a, b) => a + b, 0) / period;
        const meanDev = tp.reduce((sum, v) => sum + Math.abs(v - smaTP), 0) / period;
        const cci = meanDev === 0 ? 0 : (tp[tp.length - 1] - smaTP) / (0.015 * meanDev);
        result.push({ time: data[i].time, value: cci });
    }
    return result;
};

/**
 * Calculate Stochastic Oscillator (%K only for simplicity)
 */
export const calculateStochastic = (data: OHLCData[], kPeriod: number = 14, dPeriod: number = 3): LineData[] => {
    const kValues: LineData[] = [];
    if (data.length < kPeriod) return kValues;

    for (let i = kPeriod - 1; i < data.length; i++) {
        const slice = data.slice(i - kPeriod + 1, i + 1);
        const highestHigh = Math.max(...slice.map(d => d.high));
        const lowestLow = Math.min(...slice.map(d => d.low));
        const range = highestHigh - lowestLow;
        const k = range === 0 ? 50 : ((data[i].close - lowestLow) / range) * 100;
        kValues.push({ time: data[i].time, value: k });
    }

    // Smooth %K to get %D (SMA of %K)
    const dValues: LineData[] = [];
    for (let i = dPeriod - 1; i < kValues.length; i++) {
        const avg = kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b.value, 0) / dPeriod;
        dValues.push({ time: kValues[i].time, value: avg });
    }

    // Return %D (smoother signal line)
    return dValues;
};

/**
 * Calculate ADX (Average Directional Index)
 */
export const calculateADX = (data: OHLCData[], period: number = 14): LineData[] => {
    const result: LineData[] = [];
    if (data.length < period * 2) return result;

    const trs: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    for (let i = 1; i < data.length; i++) {
        const upMove = data[i].high - data[i - 1].high;
        const downMove = data[i - 1].low - data[i].low;
        trs.push(Math.max(
            data[i].high - data[i].low,
            Math.abs(data[i].high - data[i - 1].close),
            Math.abs(data[i].low - data[i - 1].close)
        ));
        plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // Wilder smooth
    const smooth = (arr: number[]) => {
        let s = arr.slice(0, period).reduce((a, b) => a + b, 0);
        const out = [s];
        for (let i = period; i < arr.length; i++) {
            s = s - s / period + arr[i];
            out.push(s);
        }
        return out;
    };

    const smTR = smooth(trs);
    const smPDM = smooth(plusDMs);
    const smMDM = smooth(minusDMs);

    const dxValues: number[] = [];
    for (let i = 0; i < smTR.length; i++) {
        const plusDI = smTR[i] === 0 ? 0 : (smPDM[i] / smTR[i]) * 100;
        const minusDI = smTR[i] === 0 ? 0 : (smMDM[i] / smTR[i]) * 100;
        const dx = (plusDI + minusDI) === 0 ? 0 : (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
        dxValues.push(dx);
    }

    // ADX = Wilder smooth of DX
    if (dxValues.length < period) return result;
    let adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const offset = period; // offset to align with original data index
    result.push({ time: data[offset + period - 1].time, value: adx });

    for (let i = period; i < dxValues.length; i++) {
        adx = (adx * (period - 1) + dxValues[i]) / period;
        result.push({ time: data[offset + i].time, value: adx });
    }

    return result;
};

/**
 * Calculate OBV (On-Balance Volume)
 */
export const calculateOBV = (data: (OHLCData & { volume?: number })[]): LineData[] => {
    const result: LineData[] = [];
    let obv = 0;
    for (let i = 0; i < data.length; i++) {
        if (i > 0) {
            const vol = data[i].volume ?? 1000000; // fallback synthetic volume
            if (data[i].close > data[i - 1].close) obv += vol;
            else if (data[i].close < data[i - 1].close) obv -= vol;
        }
        result.push({ time: data[i].time, value: obv });
    }
    return result;
};

/**
 * Calculate Parabolic SAR
 */
export const calculatePSAR = (data: OHLCData[], step: number = 0.02, max: number = 0.2): LineData[] => {
    const result: LineData[] = [];
    if (data.length < 2) return result;

    let isLong = data[1].close > data[0].close;
    let sar = isLong ? data[0].low : data[0].high;
    let ep = isLong ? data[0].high : data[0].low;
    let af = step;

    result.push({ time: data[0].time, value: sar });

    for (let i = 1; i < data.length; i++) {
        const prevSar = sar;
        sar = prevSar + af * (ep - prevSar);

        if (isLong) {
            sar = Math.min(sar, data[Math.max(0, i - 1)].low, data[Math.max(0, i - 2)].low);
            if (data[i].low < sar) {
                isLong = false;
                sar = ep;
                ep = data[i].low;
                af = step;
            } else {
                if (data[i].high > ep) { ep = data[i].high; af = Math.min(af + step, max); }
            }
        } else {
            sar = Math.max(sar, data[Math.max(0, i - 1)].high, data[Math.max(0, i - 2)].high);
            if (data[i].high > sar) {
                isLong = true;
                sar = ep;
                ep = data[i].high;
                af = step;
            } else {
                if (data[i].low < ep) { ep = data[i].low; af = Math.min(af + step, max); }
            }
        }
        result.push({ time: data[i].time, value: sar });
    }
    return result;
};

/**
 * Calculate simplified Ichimoku Cloud (Conversion + Base line as single line for overlay)
 * Returns the tenkan-sen (conversion line) as an overlay
 */
export const calculateIchimoku = (data: OHLCData[]): {
    tenkan: LineData[];
    kijun: LineData[];
} => {
    const tenkan: LineData[] = [];
    const kijun: LineData[] = [];
    const tenkanPeriod = 9;
    const kijunPeriod = 26;

    for (let i = 0; i < data.length; i++) {
        if (i >= tenkanPeriod - 1) {
            const slice = data.slice(i - tenkanPeriod + 1, i + 1);
            const hh = Math.max(...slice.map(d => d.high));
            const ll = Math.min(...slice.map(d => d.low));
            tenkan.push({ time: data[i].time, value: (hh + ll) / 2 });
        }
        if (i >= kijunPeriod - 1) {
            const slice = data.slice(i - kijunPeriod + 1, i + 1);
            const hh = Math.max(...slice.map(d => d.high));
            const ll = Math.min(...slice.map(d => d.low));
            kijun.push({ time: data[i].time, value: (hh + ll) / 2 });
        }
    }
    return { tenkan, kijun };
};
