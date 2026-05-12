
import pandas as pd
import logging
from typing import List, Dict, Any, Optional
import math

logger = logging.getLogger(__name__)

class StrategyService:
    def __init__(self):
        pass

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates standard indicators on the DataFrame.
        """
        # Ensure numeric
        cols = ['open', 'high', 'low', 'close', 'volume']
        for c in cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors='coerce')

        # Drop NaNs created by coercion
        df.dropna(subset=['close'], inplace=True)
        
        if len(df) < 50:
            return df

        # --- SMA ---
        for period in [20, 50, 200]:
            df[f'SMA_{period}'] = df['close'].rolling(window=period).mean()

        # --- EMA ---
        for period in [9, 21]:
            df[f'EMA_{period}'] = df['close'].ewm(span=period, adjust=False).mean()

        # --- RSI (14) ---
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        
        # Avoid division by zero
        rs = gain / loss.replace(0, 0.001) 
        df['RSI_14'] = 100 - (100 / (1 + rs))

        # --- MACD (12, 26, 9) ---
        exp12 = df['close'].ewm(span=12, adjust=False).mean()
        exp26 = df['close'].ewm(span=26, adjust=False).mean()
        df['MACD'] = exp12 - exp26
        df['MACD_Signal'] = df['MACD'].ewm(span=9, adjust=False).mean()
        
        return df

    def execute_strategy(self, data: List[Dict], rules: Dict[str, List[Dict]], initial_capital: float = 100000.0) -> Dict:
        """
        Runs the backtest.
        rules: { 
            "entry": [ { "indicator": "RSI_14", "op": "<", "value": 30 } ],
            "exit": [ { "indicator": "RSI_14", "op": ">", "value": 70 } ] 
        }
        """
        if not data:
            return {"error": "No data provided"}

        # Convert list of dicts to DataFrame
        df = pd.DataFrame(data)
        
        # Basic normalization for keys (lowercase)
        df.columns = [c.lower() for c in df.columns]
        
        # Calculate Indicators
        try:
            df = self.calculate_indicators(df)
        except Exception as e:
            logger.error(f"Indicator calc failed: {e}")
            return {"error": f"Indicator calculation failed: {str(e)}"}
            
        # Initialize Backtest Variables
        position = 0 # 0: Flat, 1: Long
        entry_price = 0.0
        shares = 0
        cash = initial_capital
        equity_curve = []
        trades = []
        signals = []

        entry_rules = rules.get("entry", [])
        exit_rules = rules.get("exit", [])

        # Iterate through candles
        for i, row in df.iterrows():
            # Skip first 200 candles to allow indicators to warm up
            if i < 200:
                equity_curve.append(cash)
                continue
                
            current_price = row['close']
            date_val = row.get('date') or row.get('time')
            timestamp = row.get('timestamp', 0)
            
            # --- EVALUATE SIGNALS ---
            
            # ENTRY LOGIC (If Flat)
            if position == 0:
                is_buy = True
                if not entry_rules: 
                    is_buy = False # No rules, no trade
                
                for rule in entry_rules:
                    if not self._check_condition(row, rule):
                        is_buy = False
                        break
                
                if is_buy:
                    # Execute BUY
                    position = 1
                    entry_price = current_price
                    shares = math.floor(cash / current_price)
                    cost = shares * current_price
                    cash -= cost
                    
                    signals.append({
                        "type": "BUY",
                        "price": current_price,
                        "time": timestamp,
                        "date": date_val
                    })
                    
            # EXIT LOGIC (If Long)
            elif position == 1:
                is_sell = False
                
                # Check explicit exit rules
                for rule in exit_rules:
                    if self._check_condition(row, rule):
                        is_sell = True
                        break
                
                # Stop Loss / Take Profit (Optional Hardcoded for now, can be parameterized)
                # pnl_pct = (current_price - entry_price) / entry_price
                # if pnl_pct < -0.05: is_sell = True # 5% SL
                
                if is_sell:
                    # Execute SELL
                    proceeds = shares * current_price
                    cash += proceeds
                    
                    pnl = proceeds - (shares * entry_price)
                    pnl_pct = (pnl / (shares * entry_price)) * 100
                    
                    trades.append({
                        "entry_price": entry_price,
                        "exit_price": current_price,
                        "shares": shares,
                        "pnl": pnl,
                        "pnl_pct": pnl_pct,
                        "exit_date": date_val
                    })
                    
                    signals.append({
                        "type": "SELL",
                        "price": current_price,
                        "time": timestamp,
                        "date": date_val
                    })
                    
                    position = 0
                    shares = 0
            
            # Update Equity
            current_equity = cash + (shares * current_price)
            equity_curve.append(current_equity)

        # Final Stats
        final_equity = equity_curve[-1] if equity_curve else initial_capital
        total_return = final_equity - initial_capital
        total_return_pct = (total_return / initial_capital) * 100
        
        winning_trades = [t for t in trades if t['pnl'] > 0]
        win_rate = (len(winning_trades) / len(trades) * 100) if trades else 0
        
        return {
            "stats": {
                "initial_capital": initial_capital,
                "final_equity": float(f"{float(final_equity):.2f}"),
                "total_return_pct": float(f"{float(total_return_pct):.2f}"),
                "total_trades": len(trades),
                "win_rate": float(f"{float(win_rate):.2f}"),
                "profit_factor": 0 # TODO
            },
            "signals": signals,
            "trades": trades,
            # Return subset of equity curve to save bandwidth? Or full.
            # "equity_curve": equity_curve 
        }

    def _check_condition(self, row: pd.Series, rule: Dict) -> bool:
        """
        Rule format: { "indicator": "RSI_14", "op": "<", "value": 30 }
        """
        indicator = rule.get("indicator")
        op = rule.get("op")
        threshold = rule.get("value")
        
        if indicator not in row:
            return False
            
        val = row[indicator]
        
        # Comparison
        try:
            threshold = float(threshold)
            val = float(val)
        except:
            return False

        if op == "<": return val < threshold
        if op == ">": return val > threshold
        if op == "=": return val == threshold
        if op == "<=": return val <= threshold
        if op == ">=": return val >= threshold
        
        return False
