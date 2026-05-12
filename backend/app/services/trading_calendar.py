from datetime import date, datetime

class TradingCalendarService:
    HOLIDAYS_2026 = [
        "2026-01-26", "2026-03-20", "2026-08-15", "2026-10-02", "2026-12-25" 
        # Add actual NSE holidays here
    ]

    @staticmethod
    def is_trading_day(check_date: date = None) -> bool:
        if not check_date:
            check_date = date.today()
        
        # 1. Check Weekend
        if check_date.weekday() >= 5: # Sat=5, Sun=6
            return False
            
        # 2. Check Holidays
        str_date = check_date.strftime("%Y-%m-%d")
        if str_date in TradingCalendarService.HOLIDAYS_2026:
            return False
            
        return True

    @staticmethod
    def get_next_trading_day(start_date: date) -> date:
        # Simple iteration
        from datetime import timedelta
        d = start_date + timedelta(days=1)
        while not TradingCalendarService.is_trading_day(d):
            d += timedelta(days=1)
        return d
