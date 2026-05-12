// Live Data Configuration for QuanFin Terminal
// Adjust these values to control real-time data refresh rates

export const LIVE_DATA_CONFIG = {
    // Chart data refresh interval (in milliseconds)
    // Default: 15 seconds (15000ms)
    // Recommended: 10-30 seconds for intraday data
    // Note: Too frequent updates may hit API rate limits
    CHART_REFRESH_INTERVAL: 15000,

    // Indices data refresh interval (in milliseconds)
    // Default: 10 seconds (10000ms)
    // Recommended: 5-15 seconds for market indices
    INDICES_REFRESH_INTERVAL: 10000,

    // Stock info modal refresh (if needed in future)
    // Default: 30 seconds (30000ms)
    QUOTE_REFRESH_INTERVAL: 30000,

    // Enable/disable auto-refresh globally
    // Set to false to disable all live updates
    ENABLE_LIVE_DATA: true,

    // Show live indicators (pulsing green dot)
    SHOW_LIVE_INDICATOR: true,
};

// Market hours for IST (Indian Standard Time)
export const MARKET_HOURS = {
    // Pre-market: 9:00 AM - 9:15 AM IST
    PRE_MARKET_START: { hour: 9, minute: 0 },
    PRE_MARKET_END: { hour: 9, minute: 15 },

    // Regular market: 9:15 AM - 3:30 PM IST
    MARKET_START: { hour: 9, minute: 15 },
    MARKET_END: { hour: 15, minute: 30 },

    // Post-market: 3:30 PM - 4:00 PM IST
    POST_MARKET_START: { hour: 15, minute: 30 },
    POST_MARKET_END: { hour: 16, minute: 0 },
};

// Helper function to check if market is open
export const isMarketOpen = (): boolean => {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentHour = istTime.getHours();
    const currentMinute = istTime.getMinutes();
    const currentDay = istTime.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if it's a weekend
    if (currentDay === 0 || currentDay === 6) {
        return false;
    }

    // Check if within market hours (9:15 AM - 3:30 PM)
    const marketStartMinutes = MARKET_HOURS.MARKET_START.hour * 60 + MARKET_HOURS.MARKET_START.minute;
    const marketEndMinutes = MARKET_HOURS.MARKET_END.hour * 60 + MARKET_HOURS.MARKET_END.minute;
    const currentMinutes = currentHour * 60 + currentMinute;

    return currentMinutes >= marketStartMinutes && currentMinutes <= marketEndMinutes;
};

// Adaptive refresh intervals based on market status
export const getAdaptiveRefreshInterval = (baseInterval: number): number => {
    if (!LIVE_DATA_CONFIG.ENABLE_LIVE_DATA) {
        return 0; // Disable refresh
    }

    // During market hours, use base interval
    if (isMarketOpen()) {
        return baseInterval;
    }

    // Outside market hours, refresh less frequently (5x slower)
    return baseInterval * 5;
};
