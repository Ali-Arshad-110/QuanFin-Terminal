
/**
 * Legacy helper functions preserved for cleaner StabilityEngine code.
 */

export function calculateATR(data: any[], period: number = 14): number {
    if (data.length < period + 1) return 0;
    let trs: number[] = [];
    for (let i = 1; i < data.length; i++) {
        const h = data[i].high;
        const l = data[i].low;
        const pc = data[i - 1].close;
        const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
        trs.push(tr);
    }
    const sum = trs.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
}

export function calculateVolatility(data: any[], period: number = 20): number {
    if (data.length < period + 1) return 0;
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
        returns.push(Math.log(data[i].close / data[i - 1].close));
    }
    const slice = returns.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (period - 1);
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export function calculateDrawdown(data: any[]): number {
    if (data.length === 0) return 0;
    let peak = -Infinity;
    let maxDD = 0;
    data.forEach(d => {
        if (d.close > peak) peak = d.close;
        const dd = (peak - d.close) / peak;
        if (dd > maxDD) maxDD = dd;
    });
    return maxDD * 100;
}
