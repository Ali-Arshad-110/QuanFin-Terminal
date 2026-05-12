export const DrawingType = {
    // Structure
    TREND_LINE: 'trend_line',
    RAY: 'ray',
    EXTENDED_LINE: 'extended_line',
    HORIZONTAL_LINE: 'horizontal_line',
    VERTICAL_LINE: 'vertical_line',
    PARALLEL_CHANNEL: 'parallel_channel',
    REGRESSION_CHANNEL: 'regression_channel',
    PITCHFORK: 'pitchfork',

    // Fib & Measure
    FIB_RETRACEMENT: 'fib_retracement',
    FIB_EXTENSION: 'fib_extension',
    AUTO_FIB: 'auto_fib',
    RISK_REWARD: 'risk_reward',
    RANGE_MEASURE: 'range_measure',

    // Price Action
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
    ELLIPSE: 'ellipse',
    PATH: 'path',
    VOL_PROFILE_FIXED: 'vol_profile_fixed',
    ANCHORED_VWAP: 'anchored_vwap',

    // Quant
    AUTO_TREND: 'auto_trend',
    VOLATILITY_BANDS: 'volatility_bands',
    TIME_CYCLE: 'time_cycle',
    STAT_DEV_CHANNEL: 'stat_dev_channel',
    BREAKOUT_BOX: 'breakout_box',

    // Annotation
    SMART_LABEL: 'smart_label',
    ARROW_UP: 'arrow_up',
    ARROW_DOWN: 'arrow_down',
    EMOJI_MARKER: 'emoji_marker',
    TEXT: 'text'
} as const;

export type DrawingType = typeof DrawingType[keyof typeof DrawingType];

export interface Point {
    time: number; // Unix timestamp
    price: number;
}

export interface DrawingObject {
    id: string;
    type: DrawingType;
    points: Point[];
    style: {
        color: string;
        width: number;
        opacity: number;
        dashed?: boolean;
        fillColor?: string;
        fillOpacity?: number;
    };
    layer: 'bg' | 'mid' | 'fg';
    locked: boolean;
    visible: boolean;
    symbol: string;
    timeframe: string;
    createdAt: number;
    updatedAt: number;
    meta?: {
        angle?: number;
        slopePct?: number;
        priceDistance?: number;
        barCount?: number;
        riskReward?: number;
        rSquared?: number;
    };
}

export const MagnetMode = {
    NONE: 'none',
    WEAK: 'weak',
    MEDIUM: 'medium',
    STRONG: 'strong',
    STRUCTURE: 'structure'
} as const;

export type MagnetMode = typeof MagnetMode[keyof typeof MagnetMode];

export const ToolCategory = {
    STRUCTURE: 'Structure',
    FIB_MEASURE: 'Fib / Measure',
    PRICE_ACTION: 'Price Action',
    QUANT: 'Quant',
    ANNOTATION: 'Annotation'
} as const;

export type ToolCategory = typeof ToolCategory[keyof typeof ToolCategory];
