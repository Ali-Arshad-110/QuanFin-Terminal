/**
 * StabilityEngine.ts
 * Advanced quantitative logic for financial stability analysis.
 */

export interface StabilityFactors {
    volatility: number;
    atr: number;
    drawdown: number;
    beta: number;
    rsi: number;
    macd: number;
    relativeStrength: number;
    trendStability: number; // R-squared of price trend
    volumeFlow: number;      // Volume Z-score
    deliveryPct: number;
    roe: number;
    deRatio: number;
    earningsGrowth: number;
}

export interface StabilityScoreResult {
    score: number;
    contributions: Record<string, number>;
    regime: 'Stable' | 'Volatile' | 'Trendless' | 'Distressed';
}

/**
 * Sigmoid normalization function for continuous scoring (0 to 1)
 */
function normalize(value: number, midpoint: number, k: number, inverse: boolean = false): number {
    const result = 1 / (1 + Math.exp(-k * (value - midpoint)));
    return inverse ? 1 - result : result;
}

/**
 * Calculates R-squared (Trend Stability)
 */
export function calculateTrendStability(data: number[]): number {
    if (data.length < 5) return 0;
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const num = (n * sumXY - sumX * sumY);
    const den = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    if (den === 0) return 0;
    const r = num / den;
    return Math.pow(r, 2) * 100; // Return as percentage
}

/**
 * Professional Stability Score (Weighted Continuous Model)
 */
export function calculateStabilityScore(factors: StabilityFactors, activeFactors: Set<string>): StabilityScoreResult {
    let weightedSum = 0;
    let totalWeight = 0;
    const contributions: Record<string, number> = {};

    const model: Record<string, { weight: number, mid: number, k: number, inv: boolean }> = {
        volatility: { weight: 25, mid: 20, k: -0.2, inv: true },    // Lower is better
        beta: { weight: 20, mid: 1.0, k: -4.0, inv: true },        // Near/Below 1.0 is better
        drawdown: { weight: 20, mid: 8.0, k: -0.5, inv: true },    // Shallow is better
        trendStability: { weight: 15, mid: 60, k: 0.1, inv: false }, // Higher is better
        relativeStrength: { weight: 10, mid: 0, k: 0.05, inv: false }, // Positive is better
        rsi: { weight: 10, mid: 50, k: 0.1, inv: false }, // Neutral is better (this is simplified)
    };

    activeFactors.forEach(f => {
        if (model[f]) {
            const { weight, mid, k, inv } = model[f];
            const normValue = normalize((factors as any)[f], mid, k, inv);
            weightedSum += normValue * weight;
            totalWeight += weight;
            contributions[f] = Math.round(normValue * 100);
        }
    });

    const finalScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

    let regime: StabilityScoreResult['regime'] = 'Stable';
    if (factors.volatility > 35) regime = 'Volatile';
    if (factors.beta > 1.5 && factors.drawdown > 15) regime = 'Distressed';
    if (factors.trendStability < 30) regime = 'Trendless';

    return {
        score: Math.round(finalScore),
        contributions,
        regime
    };
}

// Re-export basic helpers
export { calculateATR, calculateVolatility, calculateDrawdown } from './StabilityEngine_Legacy';
