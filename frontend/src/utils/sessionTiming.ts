/**
 * Indian Market Session Timing Configuration
 * NSE & BSE Trading Hours: 9:15 AM - 3:30 PM IST
 * With mandatory breaks and pre-open sessions
 */

export interface SessionTime {
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  label: string;
}

export interface SessionBreakLine {
  time: number;
  label: string;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

export const IST_SESSION_TIMINGS = {
  PRE_OPEN: {
    startHour: 9,
    startMin: 0,
    endHour: 9,
    endMin: 15,
    label: 'Pre-Open',
  },
  MAIN_SESSION: {
    startHour: 9,
    startMin: 15,
    endHour: 15,
    endMin: 30,
    label: 'Main Session',
  },
  // Session break from 1:00 PM to 1:30 PM (common lunch break)
  LUNCH_BREAK: {
    startHour: 13,
    startMin: 0,
    endHour: 13,
    endMin: 30,
    label: 'Lunch Break',
  },
};

/**
 * Convert time components to seconds since midnight
 */
export const timeToSeconds = (hour: number, min: number): number => {
  return hour * 3600 + min * 60;
};

/**
 * Convert seconds since midnight to Date (for a given date)
 */
export const secondsToDate = (seconds: number, date?: Date): Date => {
  const d = date ? new Date(date) : new Date();
  d.setHours(Math.floor(seconds / 3600), (seconds % 3600) / 60, 0, 0);
  return d;
};

/**
 * Get session break lines to draw on chart (Unix timestamps)
 * These mark the START and END of lunch break with vertical lines
 */
export const getSessionBreakLines = (): SessionBreakLine[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [
    // Lunch break starts (1:00 PM) - dashed red line
    {
      time: Math.floor(
        today.getTime() / 1000 +
        timeToSeconds(
          IST_SESSION_TIMINGS.LUNCH_BREAK.startHour,
          IST_SESSION_TIMINGS.LUNCH_BREAK.startMin
        )
      ),
      label: 'Lunch Break Start',
      color: '#f59e0b',
      lineStyle: 'dashed',
    },
    // Lunch break ends (1:30 PM) - dashed green line
    {
      time: Math.floor(
        today.getTime() / 1000 +
        timeToSeconds(
          IST_SESSION_TIMINGS.LUNCH_BREAK.endHour,
          IST_SESSION_TIMINGS.LUNCH_BREAK.endMin
        )
      ),
      label: 'Session Resumes',
      color: '#10b981',
      lineStyle: 'dashed',
    },
  ];
};

/**
 * Get ALL session reference lines (open, break, close) for all days in data
 */
export const getSessionLines = (dataTimestamps?: number[]): SessionBreakLine[] => {
  if (!dataTimestamps || dataTimestamps.length === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [{
      time: Math.floor(today.getTime() / 1000 + timeToSeconds(9, 15)),
      label: 'Market Open',
      color: '#3b82f680',
      lineStyle: 'dashed',
    }];
  }

  const lines: SessionBreakLine[] = [];
  const processedDays = new Set<string>();

  dataTimestamps.forEach(ts => {
    const date = new Date(ts * 1000);
    const dayKey = date.toISOString().split('T')[0];

    if (!processedDays.has(dayKey)) {
      processedDays.add(dayKey);

      // Calculate 9:15 AM IST for this day
      // Note: We need to be careful with UTC/IST here.
      // If ts is a Unix timestamp for IST 9:15 AM, it matches.
      const dayOpen = new Date(date);
      dayOpen.setUTCHours(3, 45, 0, 0); // 9:15 AM IST is 3:45 AM UTC

      lines.push({
        time: Math.floor(dayOpen.getTime() / 1000),
        label: '', // Keep labels minimal as per reference
        color: '#60a5fa', // Brighter blue for better visibility
        lineStyle: 'dashed',
      });
    }
  });

  return lines;
};

/**
 * Check if current time is within IST market hours
 */
export const isMarketOpen = (): boolean => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Check if day is weekday (Mon-Fri)
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Weekend

  const currentSeconds = timeToSeconds(hours, minutes);
  const openSeconds = timeToSeconds(
    IST_SESSION_TIMINGS.MAIN_SESSION.startHour,
    IST_SESSION_TIMINGS.MAIN_SESSION.startMin
  );
  const closeSeconds = timeToSeconds(
    IST_SESSION_TIMINGS.MAIN_SESSION.endHour,
    IST_SESSION_TIMINGS.MAIN_SESSION.endMin
  );
  const breakStartSeconds = timeToSeconds(
    IST_SESSION_TIMINGS.LUNCH_BREAK.startHour,
    IST_SESSION_TIMINGS.LUNCH_BREAK.startMin
  );
  const breakEndSeconds = timeToSeconds(
    IST_SESSION_TIMINGS.LUNCH_BREAK.endHour,
    IST_SESSION_TIMINGS.LUNCH_BREAK.endMin
  );

  return (
    currentSeconds >= openSeconds &&
    currentSeconds <= closeSeconds &&
    !(currentSeconds >= breakStartSeconds && currentSeconds < breakEndSeconds)
  );
};

/**
 * Get formatted session time string
 */
export const getSessionStatus = (): string => {
  if (!isMarketOpen()) return 'Market Closed';

  const now = new Date();
  const currentSeconds = timeToSeconds(now.getHours(), now.getMinutes());
  const breakStartSeconds = timeToSeconds(
    IST_SESSION_TIMINGS.LUNCH_BREAK.startHour,
    IST_SESSION_TIMINGS.LUNCH_BREAK.startMin
  );
  const breakEndSeconds = timeToSeconds(
    IST_SESSION_TIMINGS.LUNCH_BREAK.endHour,
    IST_SESSION_TIMINGS.LUNCH_BREAK.endMin
  );

  if (currentSeconds >= breakStartSeconds && currentSeconds < breakEndSeconds) {
    return 'Lunch Break';
  }
  return 'Market Open';
};
