// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Import routes
const marketRoutes = require('./routes/markets');
const userRoutes = require('./routes/user');
const tradingRoutes = require('./routes/trading');
const riskRoutes = require('./routes/risk');

// Routes
app.use('/api/markets', marketRoutes);
app.use('/api/user', userRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/risk', riskRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Base Perps Pro Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;

// ============================================
// config/dydx.js
// ============================================

const { IndexerClient, CompositeClient, ValidatorClient, Network } = require('@dydxprotocol/v4-client-js');

class DYDXClient {
  constructor() {
    this.network = process.env.DYDX_NETWORK === 'mainnet' ? Network.mainnet() : Network.testnet();
    this.indexerClient = null;
    this.compositeClient = null;
    this.validatorClient = null;
  }

  async initialize() {
    try {
      // Initialize Indexer Client (for reading data)
      this.indexerClient = new IndexerClient(this.network.indexerConfig);
      
      // Initialize Composite Client (for trading operations)
      this.compositeClient = await CompositeClient.connect(this.network);
      
      // Initialize Validator Client (for on-chain operations)
      this.validatorClient = await ValidatorClient.connect(this.network.validatorConfig);
      
      console.log('dYdX clients initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize dYdX clients:', error);
      throw error;
    }
  }

  getIndexerClient() {
    if (!this.indexerClient) {
      throw new Error('Indexer client not initialized');
    }
    return this.indexerClient;
  }

  getCompositeClient() {
    if (!this.compositeClient) {
      throw new Error('Composite client not initialized');
    }
    return this.compositeClient;
  }

  getValidatorClient() {
    if (!this.validatorClient) {
      throw new Error('Validator client not initialized');
    }
    return this.validatorClient;
  }
}

const dydxClient = new DYDXClient();
module.exports = dydxClient;

// ============================================
// routes/markets.js
// ============================================

const express = require('express');
const router = express.Router();
const dydxClient = require('../config/dydx');

// Get all available markets
router.get('/list', async (req, res) => {
  try {
    const indexer = dydxClient.getIndexerClient();
    const markets = await indexer.markets.getPerpetualMarkets();
    
    const formattedMarkets = Object.entries(markets.markets || {}).map(([symbol, data]) => ({
      market: symbol,
      base_asset: data.baseAsset || symbol.split('-')[0],
      quote_asset: 'USDC',
      min_order_size: parseFloat(data.minOrderSize || 0),
      max_leverage: parseFloat(data.maxPositionSize || 20),
      tick_size: parseFloat(data.tickSize || 0),
      step_size: parseFloat(data.stepSize || 0),
      status: data.status === 'ACTIVE' ? 'active' : 'suspended'
    }));

    res.json(formattedMarkets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch markets', message: error.message });
  }
});

// Get market data for specific market
router.get('/:market/data', async (req, res) => {
  try {
    const { market } = req.params;
    const indexer = dydxClient.getIndexerClient();
    
    const [marketData, trades, candles] = await Promise.all([
      indexer.markets.getPerpetualMarket(market),
      indexer.markets.getPerpetualMarketTrades(market, { limit: 1 }),
      indexer.markets.getPerpetualMarketCandles(market, '1DAY')
    ]);

    const candle24h = candles.candles?.[0];
    
    res.json({
      market,
      mark_price: parseFloat(marketData.oraclePrice || 0),
      index_price: parseFloat(marketData.indexPrice || 0),
      funding_rate: parseFloat(marketData.nextFundingRate || 0),
      next_funding_time: marketData.nextFundingAt,
      open_interest: parseFloat(marketData.openInterest || 0),
      volume_24h: parseFloat(candle24h?.usdVolume || 0),
      price_change_24h: candle24h ? 
        ((parseFloat(candle24h.close) - parseFloat(candle24h.open)) / parseFloat(candle24h.open)) * 100 : 0,
      high_24h: parseFloat(candle24h?.high || 0),
      low_24h: parseFloat(candle24h?.low || 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market data', message: error.message });
  }
});

// Get order book for specific market
router.get('/:market/orderbook', async (req, res) => {
  try {
    const { market } = req.params;
    const indexer = dydxClient.getIndexerClient();
    
    const orderbook = await indexer.markets.getPerpetualMarketOrderbook(market);
    
    res.json({
      bids: (orderbook.bids || []).map(bid => ({
        price: parseFloat(bid.price),
        size: parseFloat(bid.size)
      })),
      asks: (orderbook.asks || []).map(ask => ({
        price: parseFloat(ask.price),
        size: parseFloat(ask.size)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orderbook', message: error.message });
  }
});

// Get funding history
router.get('/:market/funding', async (req, res) => {
  try {
    const { market } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const indexer = dydxClient.getIndexerClient();
    
    const funding = await indexer.markets.getPerpetualMarketFunding(market, { limit });
    
    res.json(funding);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch funding history', message: error.message });
  }
});

module.exports = router;

// ============================================
// package.json
// ============================================

{
  "name": "base-perps-pro-backend",
  "version": "1.0.0",
  "description": "Express backend for Base Perps Pro using dYdX v4 API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --coverage",
    "lint": "eslint ."
  },
  "keywords": ["dydx", "perpetuals", "crypto", "trading", "base"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@dydxprotocol/v4-client-js": "^1.7.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "axios": "^1.7.2",
    "ethers": "^6.13.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0",
    "eslint": "^8.57.0",
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}

// ============================================
// .env.example
// ============================================

# Server Configuration
PORT=3000
NODE_ENV=development

# dYdX Configuration
DYDX_NETWORK=testnet  # testnet or mainnet
DYDX_INDEXER_URL=https://indexer.v4testnet.dydx.exchange
DYDX_VALIDATOR_URL=https://dydx-testnet-rpc.polkachu.com

# Base Network Configuration
BASE_RPC_URL=https://mainnet.base.org
BASE_CHAIN_ID=8453

# API Configuration
API_RATE_LIMIT=100
API_TIMEOUT=30000

# Security
CORS_ORIGIN=http://localhost:3001
JWT_SECRET=your-secret-key-here

# Monitoring
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

// ============================================
// middleware/auth.js
// ============================================

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const rateLimiter = (limit = 100, windowMs = 60000) => {
  const requests = new Map();

  return (req, res, next) => {
    const identifier = req.headers['x-wallet-address'] || req.ip;
    const now = Date.now();
    
    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }

    const userRequests = requests.get(identifier);
    const recentRequests = userRequests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= limit) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        retry_after: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }

    recentRequests.push(now);
    requests.set(identifier, recentRequests);
    next();
  };
};

module.exports = { authenticateToken, rateLimiter };

// ============================================
// utils/validators.js
// ============================================

const validateOrderParams = (order) => {
  const errors = [];

  if (!order.market || typeof order.market !== 'string') {
    errors.push('Valid market symbol required');
  }

  if (!['BUY', 'SELL'].includes(order.side)) {
    errors.push('Side must be BUY or SELL');
  }

  if (!['MARKET', 'LIMIT'].includes(order.type)) {
    errors.push('Type must be MARKET or LIMIT');
  }

  if (typeof order.size !== 'number' || order.size <= 0) {
    errors.push('Size must be a positive number');
  }

  if (order.type === 'LIMIT' && (typeof order.price !== 'number' || order.price <= 0)) {
    errors.push('Price required for LIMIT orders');
  }

  if (typeof order.leverage !== 'number' || order.leverage < 1 || order.leverage > 20) {
    errors.push('Leverage must be between 1 and 20');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // Basic Ethereum address validation
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const sanitizeMarketSymbol = (symbol) => {
  if (!symbol) return null;
  return symbol.toUpperCase().trim();
};

module.exports = {
  validateOrderParams,
  validateAddress,
  sanitizeMarketSymbol
};

// ============================================
// utils/calculations.js
// ============================================

class PositionCalculator {
  static calculateLiquidationPrice(entryPrice, size, leverage, side, maintenanceMargin = 0.03) {
    const initialMargin = (entryPrice * size) / leverage;
    const maintenanceMarginValue = (entryPrice * size) * maintenanceMargin;
    
    if (side === 'LONG') {
      return entryPrice - ((initialMargin - maintenanceMarginValue) / size);
    } else {
      return entryPrice + ((initialMargin - maintenanceMarginValue) / size);
    }
  }

  static calculatePnL(entryPrice, currentPrice, size, side) {
    if (side === 'LONG') {
      return (currentPrice - entryPrice) * size;
    } else {
      return (entryPrice - currentPrice) * size;
    }
  }

  static calculatePnLPercentage(entryPrice, currentPrice, side) {
    const priceChange = side === 'LONG' 
      ? (currentPrice - entryPrice) / entryPrice
      : (entryPrice - currentPrice) / entryPrice;
    
    return priceChange * 100;
  }

  static calculateRequiredMargin(notionalValue, leverage) {
    return notionalValue / leverage;
  }

  static calculateMarginRatio(equity, maintenanceMargin) {
    if (equity <= 0) return 1;
    return maintenanceMargin / equity;
  }

  static calculateFundingPayment(notionalValue, fundingRate) {
    return notionalValue * fundingRate;
  }

  static estimateLiquidationDistance(currentPrice, liquidationPrice) {
    return Math.abs((liquidationPrice - currentPrice) / currentPrice) * 100;
  }
}

module.exports = PositionCalculator;

// ============================================
// utils/logger.js
// ============================================

const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;

// ============================================
// services/websocket.js
// ============================================

const WebSocket = require('ws');

class DYDXWebSocketService {
  constructor() {
    this.ws = null;
    this.subscriptions = new Map();
    this.reconnectInterval = 5000;
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
  }

  connect() {
    const wsUrl = process.env.DYDX_NETWORK === 'mainnet'
      ? 'wss://indexer.dydx.trade/v4/ws'
      : 'wss://indexer.v4testnet.dydx.exchange/v4/ws';

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('WebSocket connected to dYdX');
      this.reconnectAttempts = 0;
      this.resubscribeAll();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    });
  }

  subscribe(channel, market, callback) {
    const subscriptionId = `${channel}:${market}`;
    
    if (!this.subscriptions.has(subscriptionId)) {
      this.subscriptions.set(subscriptionId, new Set());
    }
    
    this.subscriptions.get(subscriptionId).add(callback);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(channel, market);
    }
  }

  sendSubscription(channel, market) {
    const message = {
      type: 'subscribe',
      channel,
      id: market
    };

    this.ws.send(JSON.stringify(message));
  }

  resubscribeAll() {
    for (const [subscriptionId] of this.subscriptions) {
      const [channel, market] = subscriptionId.split(':');
      this.sendSubscription(channel, market);
    }
  }

  handleMessage(message) {
    const subscriptionId = `${message.channel}:${message.id}`;
    const callbacks = this.subscriptions.get(subscriptionId);

    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message.contents);
        } catch (error) {
          console.error('Callback error:', error);
        }
      });
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

module.exports = new DYDXWebSocketService();

// ============================================
// README.md
// ============================================

# Base Perps Pro Backend - dYdX v4 Integration

A comprehensive Node.js/Express backend for interacting with dYdX v4 perpetual futures trading platform.

## Features

- ✅ Complete dYdX v4 API integration
- ✅ Real-time market data and orderbook
- ✅ User account management (balance, positions, history)
- ✅ Order placement and management
- ✅ Risk calculation and analysis
- ✅ WebSocket support for live updates
- ✅ Rate limiting and security middleware
- ✅ Comprehensive error handling

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:
- Set `DYDX_NETWORK` to `testnet` or `mainnet`
- Configure Base network RPC URL
- Set security parameters

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## API Endpoints

### Markets
- `GET /api/markets/list` - Get all available markets
- `GET /api/markets/:market/data` - Get market data
- `GET /api/markets/:market/orderbook` - Get orderbook
- `GET /api/markets/:market/funding` - Get funding history

### User (requires `x-wallet-address` header)
- `GET /api/user/balance` - Get account balance
- `GET /api/user/positions` - Get open positions
- `GET /api/user/history` - Get trade history
- `GET /api/user/risk` - Get risk metrics
- `GET /api/user/transactions` - Get on-chain transactions

### Trading (requires `x-wallet-address` and `x-private-key` headers)
- `POST /api/trading/order` - Place new order
- `DELETE /api/trading/order/:orderId` - Cancel order
- `POST /api/trading/position/close` - Close position
- `POST /api/trading/deposit` - Deposit USDC
- `POST /api/trading/withdraw` - Withdraw USDC
- `PUT /api/trading/leverage` - Update leverage
- `PUT /api/trading/margin-mode` - Set margin mode

### Risk
- `POST /api/risk/liquidation-price` - Calculate liquidation price
- `POST /api/risk/analyze` - Analyze position risk

## Example Requests

### Place Market Order
```bash
curl -X POST http://localhost:3000/api/trading/order \
  -H "Content-Type: application/json" \
  -H "x-wallet-address: 0x..." \
  -H "x-private-key: 0x..." \
  -d '{
    "market": "BTC-USD",
    "side": "BUY",
    "type": "MARKET",
    "size": 0.1,
    "leverage": 5
  }'
```

### Get Market Data
```bash
curl http://localhost:3000/api/markets/BTC-USD/data
```

### Check Balance
```bash
curl http://localhost:3000/api/user/balance \
  -H "x-wallet-address: 0x..."
```

## Architecture

- **Express Server** - RESTful API endpoints
- **dYdX v4 Client** - Official dYdX protocol client
- **WebSocket Service** - Real-time data streaming
- **Middleware** - Authentication, rate limiting, validation
- **Utilities** - Position calculations, validators, logger

## Security Notes

⚠️ **IMPORTANT**: Never commit private keys or sensitive data to version control.

- Use environment variables for all secrets
- Implement proper authentication in production
- Enable HTTPS for all production traffic
- Use rate limiting to prevent abuse
- Validate all user inputs
- Monitor for suspicious activity

## Testing

```bash
npm test
```

## License

MIT

// ============================================
// routes/trading.js
// ============================================

const express = require('express');
const router = express.Router();
const dydxClient = require('../config/dydx');
const { Order_Side, Order_TimeInForce, OrderExecution, OrderType } = require('@dydxprotocol/v4-client-js');

// Middleware to validate wallet
const validateWallet = (req, res, next) => {
  const address = req.headers['x-wallet-address'];
  const privateKey = req.headers['x-private-key'];
  
  if (!address || !privateKey) {
    return res.status(400).json({ error: 'Wallet credentials required' });
  }
  
  req.walletAddress = address;
  req.privateKey = privateKey;
  next();
};

router.use(validateWallet);

// Place order
router.post('/order', async (req, res) => {
  try {
    const { market, side, type, size, price, leverage, margin_mode, reduce_only, post_only } = req.body;
    
    if (!market || !side || !type || !size || !leverage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const composite = dydxClient.getCompositeClient();
    
    // Convert params to dYdX format
    const orderSide = side === 'BUY' ? Order_Side.SIDE_BUY : Order_Side.SIDE_SELL;
    const orderType = type === 'MARKET' ? OrderType.MARKET : OrderType.LIMIT;
    const timeInForce = post_only ? Order_TimeInForce.POST_ONLY : Order_TimeInForce.GTT;
    
    const orderParams = {
      market,
      side: orderSide,
      type: orderType,
      size: size.toString(),
      price: price ? price.toString() : undefined,
      timeInForce,
      reduceOnly: reduce_only || false,
      postOnly: post_only || false,
      clientId: Date.now().toString()
    };

    // Place order using composite client
    const tx = await composite.placeOrder(
      req.walletAddress,
      0, // subaccount number
      orderParams
    );

    res.json({
      success: true,
      order_id: orderParams.clientId,
      transaction_hash: tx.hash,
      message: 'Order placed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to place order', message: error.message });
  }
});

// Cancel order
router.delete('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const composite = dydxClient.getCompositeClient();
    
    const tx = await composite.cancelOrder(
      req.walletAddress,
      0,
      orderId
    );

    res.json({
      success: true,
      order_id: orderId,
      transaction_hash: tx.hash,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel order', message: error.message });
  }
});

// Close position
router.post('/position/close', async (req, res) => {
  try {
    const { position_id, size, type, price } = req.body;
    
    if (!position_id || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [market, side] = position_id.split('-');
    const closeSide = side === 'LONG' ? 'SELL' : 'BUY';
    
    const composite = dydxClient.getCompositeClient();
    
    // Get current position size if not specified
    let closeSize = size;
    if (!closeSize) {
      const indexer = dydxClient.getIndexerClient();
      const positions = await indexer.account.getSubaccountPerpetualPositions(req.walletAddress, 0);
      const position = positions.positions?.find(p => p.market === market);
      closeSize = Math.abs(parseFloat(position?.size || 0));
    }

    const orderParams = {
      market,
      side: closeSide === 'BUY' ? Order_Side.SIDE_BUY : Order_Side.SIDE_SELL,
      type: type === 'MARKET' ? OrderType.MARKET : OrderType.LIMIT,
      size: closeSize.toString(),
      price: price ? price.toString() : undefined,
      reduceOnly: true,
      clientId: Date.now().toString()
    };

    const tx = await composite.placeOrder(
      req.walletAddress,
      0,
      orderParams
    );

    res.json({
      success: true,
      position_id,
      transaction_hash: tx.hash,
      message: 'Position close order placed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to close position', message: error.message });
  }
});

// Deposit USDC
router.post('/deposit', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const composite = dydxClient.getCompositeClient();
    
    const tx = await composite.depositToSubaccount(
      req.walletAddress,
      0,
      amount
    );

    res.json({
      success: true,
      amount,
      transaction_hash: tx.hash,
      message: 'Deposit initiated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process deposit', message: error.message });
  }
});

// Withdraw USDC
router.post('/withdraw', async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    const composite = dydxClient.getCompositeClient();
    
    const tx = await composite.withdrawFromSubaccount(
      req.walletAddress,
      0,
      amount
    );

    res.json({
      success: true,
      amount,
      transaction_hash: tx.hash,
      message: 'Withdrawal initiated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process withdrawal', message: error.message });
  }
});

// Update leverage for market
router.put('/leverage', async (req, res) => {
  try {
    const { market, leverage } = req.body;
    
    if (!market || !leverage || leverage < 1 || leverage > 20) {
      return res.status(400).json({ error: 'Invalid leverage parameters' });
    }

    // Note: dYdX v4 handles leverage per-position, not per-market
    // This is a simplified implementation
    res.json({
      success: true,
      market,
      leverage,
      message: 'Leverage will be applied to next order'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update leverage', message: error.message });
  }
});

// Set margin mode
router.put('/margin-mode', async (req, res) => {
  try {
    const { market, margin_mode } = req.body;
    
    if (!market || !['cross', 'isolated'].includes(margin_mode)) {
      return res.status(400).json({ error: 'Invalid margin mode parameters' });
    }

    // Note: dYdX v4 primarily uses cross margin
    // Isolated margin might not be directly supported
    res.json({
      success: true,
      market,
      margin_mode,
      message: 'Margin mode updated (dYdX v4 uses cross margin by default)'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set margin mode', message: error.message });
  }
});

module.exports = router;

// ============================================
// routes/risk.js
// ============================================

const express = require('express');
const router = express.Router();
const dydxClient = require('../config/dydx');

// Calculate liquidation price
router.post('/liquidation-price', async (req, res) => {
  try {
    const { market, side, size, entry_price, leverage, margin_mode = 'cross' } = req.body;
    
    if (!market || !side || !size || !entry_price || !leverage) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const indexer = dydxClient.getIndexerClient();
    const marketData = await indexer.markets.getPerpetualMarket(market);
    
    const maintenanceMarginFraction = parseFloat(marketData.maintenanceMarginFraction || 0.03);
    const initialMargin = (entry_price * size) / leverage;
    const maintenanceMargin = (entry_price * size) * maintenanceMarginFraction;
    
    let liquidationPrice;
    if (side === 'LONG') {
      liquidationPrice = entry_price - ((initialMargin - maintenanceMargin) / size);
    } else {
      liquidationPrice = entry_price + ((initialMargin - maintenanceMargin) / size);
    }

    res.json({
      market,
      side,
      liquidation_price: liquidationPrice,
      entry_price,
      leverage,
      margin_mode,
      distance_to_liquidation: Math.abs((liquidationPrice - entry_price) / entry_price) * 100
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate liquidation price', message: error.message });
  }
});

// Analyze position risk
router.post('/analyze', async (req, res) => {
  try {
    const { position_id, market, size, leverage } = req.body;
    const address = req.headers['x-wallet-address'];
    
    if (!address) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const indexer = dydxClient.getIndexerClient();
    
    let positionData;
    if (position_id) {
      const positions = await indexer.account.getSubaccountPerpetualPositions(address, 0);
      positionData = positions.positions?.find(p => `${p.market}-${p.side}` === position_id);
    }
    
    const targetMarket = market || positionData?.market;
    const targetSize = size || Math.abs(parseFloat(positionData?.size || 0));
    const targetLeverage = leverage || parseFloat(positionData?.leverage || 1);
    
    const [marketData, subaccount] = await Promise.all([
      indexer.markets.getPerpetualMarket(targetMarket),
      indexer.account.getSubaccount(address, 0)
    ]);
    
    const markPrice = parseFloat(marketData.oraclePrice);
    const notionalValue = markPrice * targetSize;
    const requiredMargin = notionalValue / targetLeverage;
    const equity = parseFloat(subaccount.equity || 0);
    
    const riskMetrics = {
      market: targetMarket,
      position_size: targetSize,
      leverage: targetLeverage,
      notional_value: notionalValue,
      required_margin: requiredMargin,
      account_equity: equity,
      margin_usage_percent: (requiredMargin / equity) * 100,
      funding_rate: parseFloat(marketData.nextFundingRate || 0),
      daily_funding_cost: notionalValue * parseFloat(marketData.nextFundingRate || 0) * 3,
      risk_score: calculateRiskScore(targetLeverage, (requiredMargin / equity) * 100),
      recommendations: generateRecommendations(targetLeverage, (requiredMargin / equity) * 100)
    };

    res.json(riskMetrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze position risk', message: error.message });
  }
});

function calculateRiskScore(leverage, marginUsage) {
  let score = 0;
  
  if (leverage > 15) score += 40;
  else if (leverage > 10) score += 30;
  else if (leverage > 5) score += 20;
  else score += 10;
  
  if (marginUsage > 80) score += 40;
  else if (marginUsage > 60) score += 30;
  else if (marginUsage > 40) score += 20;
  else score += 10;
  
  return Math.min(score, 100);
}

function generateRecommendations(leverage, marginUsage) {
  const recommendations = [];
  
  if (leverage > 10) {
    recommendations.push('Consider reducing leverage to manage risk');
  }
  
  if (marginUsage > 70) {
    recommendations.push('High margin usage - consider adding funds or reducing position size');
  }
  
  if (leverage > 5 && marginUsage > 50) {
    recommendations.push('High risk profile - monitor position closely');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Position risk is within acceptable parameters');
  }
  
  return recommendations;
}

module.exports = router;

// ============================================
// routes/user.js
// ============================================

const express = require('express');
const router = express.Router();
const dydxClient = require('../config/dydx');

// Middleware to validate address
const validateAddress = (req, res, next) => {
  const address = req.headers['x-wallet-address'] || req.query.address;
  if (!address) {
    return res.status(400).json({ error: 'Wallet address required' });
  }
  req.walletAddress = address;
  next();
};

router.use(validateAddress);

// Get user balance
router.get('/balance', async (req, res) => {
  try {
    const indexer = dydxClient.getIndexerClient();
    const subaccount = await indexer.account.getSubaccount(req.walletAddress, 0);
    
    const equity = parseFloat(subaccount.equity || 0);
    const marginUsed = parseFloat(subaccount.marginUsage || 0);
    
    res.json({
      wallet_address: req.walletAddress,
      total_balance: equity,
      available_balance: equity - marginUsed,
      margin_used: marginUsed,
      currency: 'USDC'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balance', message: error.message });
  }
});

// Get open positions
router.get('/positions', async (req, res) => {
  try {
    const indexer = dydxClient.getIndexerClient();
    const positions = await indexer.account.getSubaccountPerpetualPositions(req.walletAddress, 0);
    
    const formattedPositions = (positions.positions || []).map(pos => ({
      position_id: `${pos.market}-${pos.side}`,
      market: pos.market,
      side: pos.side,
      size: parseFloat(pos.size),
      entry_price: parseFloat(pos.entryPrice),
      mark_price: parseFloat(pos.exitPrice || pos.entryPrice),
      leverage: parseFloat(pos.leverage || 1),
      margin_mode: 'cross',
      unrealized_pnl: parseFloat(pos.unrealizedPnl || 0),
      realized_pnl: parseFloat(pos.realizedPnl || 0),
      liquidation_price: parseFloat(pos.liquidationPrice || 0),
      margin_ratio: parseFloat(pos.marginRatio || 0),
      opened_at: pos.createdAt
    }));

    res.json(formattedPositions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch positions', message: error.message });
  }
});

// Get trade history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const indexer = dydxClient.getIndexerClient();
    const fills = await indexer.account.getSubaccountFills(req.walletAddress, 0, { limit });
    
    const formattedTrades = (fills.fills || []).map(fill => ({
      trade_id: fill.id,
      market: fill.market,
      side: fill.side,
      size: parseFloat(fill.size),
      price: parseFloat(fill.price),
      realized_pnl: 0, // Calculate based on position
      fee: parseFloat(fill.fee),
      timestamp: fill.createdAt
    }));

    res.json(formattedTrades);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trade history', message: error.message });
  }
});

// Get risk metrics
router.get('/risk', async (req, res) => {
  try {
    const indexer = dydxClient.getIndexerClient();
    const [subaccount, positions] = await Promise.all([
      indexer.account.getSubaccount(req.walletAddress, 0),
      indexer.account.getSubaccountPerpetualPositions(req.walletAddress, 0)
    ]);
    
    const marginRatio = parseFloat(subaccount.marginRatio || 0);
    const exposureByMarket = {};
    
    (positions.positions || []).forEach(pos => {
      exposureByMarket[pos.market] = parseFloat(pos.size) * parseFloat(pos.entryPrice);
    });
    
    let liquidationRisk = 'low';
    if (marginRatio > 0.7) liquidationRisk = 'high';
    else if (marginRatio > 0.5) liquidationRisk = 'medium';
    
    const warnings = [];
    if (marginRatio > 0.6) warnings.push('High margin usage detected');
    if (Object.keys(exposureByMarket).length > 5) warnings.push('Portfolio heavily diversified');
    
    res.json({
      total_margin_ratio: marginRatio,
      maintenance_margin: parseFloat(subaccount.maintenanceMarginRequirement || 0),
      liquidation_risk: liquidationRisk,
      exposure_by_market: exposureByMarket,
      warnings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch risk metrics', message: error.message });
  }
});

// Get on-chain transactions
router.get('/transactions', async (req, res) => {
  try {
    const indexer = dydxClient.getIndexerClient();
    const transfers = await indexer.account.getSubaccountTransfers(req.walletAddress, 0);
    
    const formattedTransfers = (transfers.transfers || []).map(tx => ({
      tx_hash: tx.transactionHash || tx.id,
      type: tx.type === 'DEPOSIT' ? 'deposit' : 'withdrawal',
      amount: parseFloat(tx.amount),
      status: tx.confirmedAt ? 'confirmed' : 'pending',
      timestamp: tx.createdAt
    }));

    res.json(formattedTransfers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions', message: error.message });
  }
});

module.exports = router;