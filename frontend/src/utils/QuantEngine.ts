export interface QuantScores {
    momentumScore: number;
    valuationScore: number;
    riskScore: number;
    flowScore: number;
    overallScore: number;
    bias: 'Bullish' | 'Bearish' | 'Neutral';
    confidence: 'High' | 'Medium' | 'Low';
    aiSummary: string;
}

export function calculateQuantScores(details: any): QuantScores {
    // 1. Momentum Score (0-100)
    // Uses price change %, distance from 52w high/low as proxies
    let momentumScore = 50;
    if (details?.price) {
        const { current, fiftyTwoWeekHigh, fiftyTwoWeekLow, changePercent } = details.price;
        if (fiftyTwoWeekHigh > fiftyTwoWeekLow) {
            const rangePos = (current - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow);
            momentumScore = 30 + (rangePos * 40) + (Math.max(-10, Math.min(10, changePercent || 0)) * 3);
        }
    }
    momentumScore = Math.max(0, Math.min(100, Math.round(momentumScore)));

    // 2. Valuation Score (0-100)
    // Higher score = better / cheaper valuation relative to typical growth
    let valuationScore = 50;
    if (details?.valuation) {
        const { trailingPE, priceToBook, dividendYield } = details.valuation;
        if (trailingPE && trailingPE > 0) {
            // Assume 25 as a neutral PE. Lower PE -> higher score
            const peScore = Math.max(0, 100 - (trailingPE * 1.5));
            // PB Ratio: Assume 3.0 is neutral
            const pbScore = Math.max(0, 100 - (priceToBook * 10));
            // Div yield bonus
            const divBonus = Math.min(20, (dividendYield || 0) * 5);
            valuationScore = (peScore * 0.5) + (pbScore * 0.3) + divBonus;
        }
    }
    valuationScore = Math.max(0, Math.min(100, Math.round(valuationScore)));

    // 3. Risk Score (0-100)
    // Lower risk is a HIGHER score. Based loosely on beta.
    let riskScore = 50;
    if (details?.valuation?.beta) {
        const beta = details.valuation.beta;
        // Beta of 1.0 = score roughly 60. > 1.5 = high risk (low score). < 0.8 = low risk (high score)
        riskScore = 100 - Math.min(100, Math.max(0, (beta - 0.5) * 40));
    }
    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

    // 4. Flow Score (0-100)
    // Institutional backing + Volume proxies
    let flowScore = 50;
    if (details?.shareholding) {
        const inst = details.shareholding.institutions || 0;
        const ins = details.shareholding.insiders || 0;
        // Strong backing -> higher score
        flowScore = (inst * 1.2) + (ins * 0.5);
    }
    flowScore = Math.max(0, Math.min(100, Math.round(flowScore)));

    // 5. Aggregate
    const overallScore = Math.round((momentumScore * 0.4) + (valuationScore * 0.3) + (riskScore * 0.1) + (flowScore * 0.2));

    let bias: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
    if (overallScore > 65) bias = 'Bullish';
    else if (overallScore < 40) bias = 'Bearish';

    let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
    const hasEnoughData = details?.valuation?.trailingPE && details?.price?.fiftyTwoWeekHigh;
    if (!hasEnoughData) confidence = 'Low';
    else if (overallScore > 75 || overallScore < 25) confidence = 'High';

    // 6. Dynamic AI Summary
    let summaryParts = [];
    if (momentumScore > 70) summaryParts.push('Displays robust upward momentum approaching recent highs.');
    else if (momentumScore < 30) summaryParts.push('Shows significant technical weakness, lingering near systemic lows.');

    if (valuationScore > 70) summaryParts.push('Fundamentally, the asset appears undervalued presenting a margin of safety.');
    else if (valuationScore < 30) summaryParts.push('Current multiples suggest a steep premium relative to standard sector averages.');

    if (riskScore < 40) summaryParts.push('High systemic variance (Beta) implies greater volatility ahead.');

    if (flowScore > 75) summaryParts.push('Institutional accumulation provides strong structural support.');
    else if (flowScore < 30) summaryParts.push('Lacks meaningful institutional backing.');

    const aiSummary = summaryParts.length > 0
        ? summaryParts.join(' ')
        : 'Quantitative indicators present a balanced, mean-reverting profile with no extreme deviations across value or momentum factors.';

    return {
        momentumScore,
        valuationScore,
        riskScore,
        flowScore,
        overallScore,
        bias,
        confidence,
        aiSummary
    };
}
