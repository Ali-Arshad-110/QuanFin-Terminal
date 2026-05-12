# Broker Abstraction Layer

## Overview

The Broker Abstraction Layer provides a unified interface for integrating multiple brokers (Kotak Securities, Zerodha, Upstox, etc.) without coupling business logic to any specific broker implementation.

## Architecture

```
BaseBroker (Abstract Base)
    ├── PaperBroker (Mock trading - development/testing)
    ├── KotakBroker (Kotak Securities)
    ├── ZerodhaBroker (Zerodha - planned)
    └── UpstoxBroker (Upstox - planned)

BrokerFactory (Broker Creation & Lifecycle)
    └── Uses BROKER env var to select implementation

BrokerAuthStrategy (Authentication)
    └── Replaces direct KotakService usage
    └── Works with any broker implementation
```

## Usage

### 1. Enable the Abstraction Layer

In `.env`:
```env
BROKER=paper              # Which broker to use: paper, kotak, zerodha, upstox
USE_BROKER_ABSTRACTION=true  # Enable new abstraction (false = legacy OTP strategy)
```

### 2. Configure Broker Credentials

#### Paper Broker (Development)
No credentials needed - perfect for testing without real broker accounts.

#### Kotak Securities
```env
BROKER=kotak
KOTAK_CONSUMER_KEY=your_key
KOTAK_CONSUMER_SECRET=your_secret
KOTAK_MOBILE=your_mobile
KOTAK_PASSWORD=your_password
KOTAK_MPIN=your_mpin
KOTAK_UCC=your_ucc
KOTAK_TOTP_SECRET=your_totp_secret  # For automated login
```

#### Zerodha (planned)
```env
BROKER=zerodha
ZERODHA_API_KEY=your_key
ZERODHA_API_SECRET=your_secret
ZERODHA_USER_ID=your_user_id
ZERODHA_PASSWORD=your_password
```

#### Upstox (planned)
```env
BROKER=upstox
UPSTOX_API_KEY=your_key
UPSTOX_API_SECRET=your_secret
UPSTOX_REDIRECT_URI=your_redirect_uri
```

### 3. Use in Your Code

#### Get a Broker Instance
```python
from app.brokers import BrokerFactory

broker = BrokerFactory.get_broker()
# or explicitly:
broker = BrokerFactory.create_broker("kotak")
```

#### Perform Operations
```python
# Login
credentials = {...}
success = await broker.login(credentials)

# Get quote
quote = await broker.get_quote("RELIANCE")

# Place order
order_result = await broker.place_order({
    "symbol": "RELIANCE",
    "quantity": 1,
    "price": 2500.0,
    "order_type": "BUY"
})

# Get positions
positions = await broker.get_positions()

# Check status
status = broker.get_status()
```

## Base Broker Interface

All brokers implement these methods:

| Method | Purpose | Returns |
|--------|---------|---------|
| `login(credentials)` | Authenticate with broker | bool |
| `logout()` | Disconnect from broker | bool |
| `get_quote(symbol)` | Get current price | Dict with ltp, change, etc. |
| `get_quotes(symbols)` | Get multiple quotes | Dict[symbol -> quote] |
| `place_order(order_data)` | Place an order | {order_id, status, message} |
| `cancel_order(order_id)` | Cancel an order | bool |
| `get_positions()` | Get open positions | List[Dict] |
| `get_holdings()` | Get holdings | List[Dict] |
| `get_order_history(limit)` | Get past orders | List[Dict] |
| `get_trade_history(limit)` | Get past trades | List[Dict] |
| `subscribe_live_data(symbols)` | Subscribe to live prices | bool |
| `unsubscribe_live_data(symbols)` | Unsubscribe | bool |
| `get_status()` | Get broker status | Dict with connection info |

## Migration Path

### Phase 1: Current (Paper Broker Ready ✓)
- Paper broker for development ✓
- Kotak broker adapter created ✓
- New auth strategy created ✓
- Use `BROKER=paper` + `USE_BROKER_ABSTRACTION=true`

### Phase 2: Implementation
- Complete Kotak broker endpoint implementations
- Implement Zerodha broker
- Implement Upstox broker
- Comprehensive testing across brokers

### Phase 3: Production
- Switch from paper to real broker in .env
- All business logic remains unchanged
- Easy broker switching without code changes

## Benefits

1. **Broker Independence**: Change brokers by updating one `.env` variable
2. **Easy Testing**: Use paper broker for development without credentials
3. **Future-Proof**: Adding new brokers requires only implementing the interface
4. **Clean Code**: Business logic separated from broker implementation details
5. **Flexible Authentication**: Each broker can use different auth mechanisms

## Example: Switching Brokers

### Development (Paper Trading)
```env
BROKER=paper
USE_BROKER_ABSTRACTION=true
```
✅ No credentials needed  
✅ Fast iteration  
✅ No real money at risk  

### Testing (Kotak)
```env
BROKER=kotak
USE_BROKER_ABSTRACTION=true
KOTAK_CONSUMER_KEY=test_key
# ... other Kotak credentials
```

### Production
```env
BROKER=zerodha  # or kotak, upstox
USE_BROKER_ABSTRACTION=true
ZERODHA_API_KEY=prod_key
# ... other credentials
```

**Code remains the same** - only `.env` changes!

## Adding a New Broker

1. Create `backend/app/brokers/new_broker_broker.py`:
```python
from .base_broker import BaseBroker

class NewBrokerBroker(BaseBroker):
    def __init__(self):
        super().__init__("NewBroker")
    
    async def login(self, credentials):
        # Implement login logic
        pass
    
    async def get_quote(self, symbol):
        # Implement quote fetching
        pass
    
    # ... implement other methods
```

2. Update `backend/app/brokers/__init__.py`:
```python
from .new_broker_broker import NewBrokerBroker

@classmethod
def create_broker(cls, broker_name):
    elif broker_name == "newbroker":
        return NewBrokerBroker()
```

3. Update `.env` documentation

4. Test with `BROKER=newbroker`

## File Structure

```
backend/app/brokers/
├── __init__.py              # BrokerFactory
├── base_broker.py           # Abstract base class
├── paper_broker.py          # Mock broker
├── kotak_broker.py          # Kotak Securities
├── zerodha_broker.py        # Zerodha (TODO)
└── upstox_broker.py         # Upstox (TODO)

backend/app/auth/strategies/
├── broker_auth.py           # BrokerAuthStrategy (uses brokers)
└── otp_login.py             # Legacy OTP strategy
```

## Configuration Priority

1. If `USE_BROKER_ABSTRACTION=true` → Use `BrokerAuthStrategy` with broker specified by `BROKER=`
2. If `USE_BROKER_ABSTRACTION=false` → Use legacy `OTPAuthStrategy` (default for backward compatibility)
3. If `BROKER` not specified → Defaults to `paper`

## Known Limitations (v1)

- Zerodha and Upstox brokers: Skeleton implemented, endpoints not yet developed
- Live data subscription: Interface defined, implementation per-broker
- Redis caching: Prepared but not yet integrated

## Next Steps

1. ✅ Base abstraction created
2. ✅ Paper broker (mock trading)
3. ✅ Kotak broker wrapper
4. ⏳ Complete endpoint implementations for Kotak
5. ⏳ Implement Zerodha broker
6. ⏳ Implement Upstox broker
7. ⏳ Add Redis caching layer
8. ⏳ Add broker-specific optimizations

## Testing

### Test with Paper Broker
```bash
export BROKER=paper
export USE_BROKER_ABSTRACTION=true
# Run backend
# API works without any broker credentials!
```

### Test with Kotak
```bash
export BROKER=kotak
export USE_BROKER_ABSTRACTION=true
# Set Kotak credentials
# Run backend
```

## Questions?

Refer to the Priority 2 Implementation notes in the project architecture documentation.
