import logging

logger = logging.getLogger(__name__)

class OrderManager:
    def __init__(self, api_key: str = "DEMO_KEY"):
        self.api_key = api_key
        # Initialize connection to broker here in future

    def place_order(self, symbol: str, qty: int, order_type: str):
        """
        Placeholder for order execution.
        """
        log_msg = f"Order Placed: Symbol={symbol}, Qty={qty}, Type={order_type}. (Simulated)"
        logger.info(log_msg)
        print(log_msg) # Ensure it prints to console as requested
        
        return {
            "status": "success",
            "message": "Order placed successfully (Simulated)",
            "order_details": {
                "symbol": symbol,
                "qty": qty,
                "type": order_type,
                "broker_order_id": "SIM-12345"
            }
        }
