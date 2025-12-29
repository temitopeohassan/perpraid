# PerpRaid

A non-custodial crypto perpetual futures trading platform built as a Farcaster Mini App. Trade perpetual futures on Base L2 using dYdX v4 infrastructure with up to 20x leverage.

## Overview

PerpRaid is a hybrid architecture trading platform that combines:
- **On-chain**: Base L2 blockchain for deposits, withdrawals, and settlements
- **Off-chain**: dYdX v4 for order matching and perpetual futures trading
- **Frontend**: Farcaster Mini App for seamless social trading experience

## Features

### Trading Capabilities
- **Perpetual Futures Trading**: Trade perpetual futures contracts on multiple markets
- **Leverage**: Up to 20x leverage with cross or isolated margin modes
- **Order Types**: Market and limit orders with reduce-only and post-only options
- **Real-time Market Data**: Live prices, order books, funding rates, and 24h statistics

### Portfolio Management
- **Balance Tracking**: Monitor USDC balance, available margin, and margin utilization
- **Position Management**: View open positions with real-time P&L, leverage, and liquidation prices
- **Trade History**: Complete history of all trades and closed positions
- **Risk Metrics**: Real-time risk assessment with liquidation risk indicators and warnings

### Market Data
- **Market Listings**: Browse all available perpetual futures markets
- **Order Books**: Real-time bid/ask depth for each market
- **Funding Rates**: Current and historical funding rate data
- **24h Statistics**: Price changes, volume, and high/low prices

## Architecture

### Platform Details
- **Platform**: Base L2
- **Execution Engine**: dYdX v4 API
- **Settlement Currency**: USDC
- **Max Leverage**: 20x
- **Margin Modes**: Cross margin, Isolated margin
- **Architecture**: Hybrid (on-chain Base L2 + off-chain dYdX v4)

### Project Structure

```
perpraid/
├── backend/          # Express.js API server
│   ├── routes/       # API route handlers
│   ├── config/       # dYdX and Firebase configuration
│   └── services/     # Business logic services
├── miniapp/          # Next.js Farcaster Mini App
│   ├── app/          # Next.js app router pages
│   ├── components/   # React components
│   └── lib/          # Utilities and API client
```

## API Resources

### User Resources
- **User Balance**: Current USDC balance and available margin
- **Open Positions**: All active perpetual futures positions
- **Trade History**: Historical trades and closed positions
- **Risk Metrics**: Portfolio risk assessment and warnings
- **On-Chain Transactions**: Deposit and withdrawal history

### Market Resources
- **Market List**: All tradeable perpetual futures markets
- **Market Data**: Real-time market data (prices, funding, volume)
- **Order Book**: Current order book depth for markets
- **Funding History**: Historical funding rate payments

## Trading Tools

### Order Management
- `place_order`: Place new perpetual futures orders (market or limit)
- `cancel_order`: Cancel open orders
- `close_position`: Close positions (full or partial)

### Account Management
- `deposit_usdc`: Deposit USDC from wallet to trading balance
- `withdraw_usdc`: Withdraw USDC from trading balance to wallet
- `update_leverage`: Update leverage for a specific market
- `set_margin_mode`: Set margin mode (cross or isolated)

### Risk Analysis
- `calculate_liquidation_price`: Calculate liquidation price for positions
- `analyze_position_risk`: Analyze risk metrics for positions
- `get_funding_history`: Get funding rate payment history

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Firebase project for data storage
- dYdX API access (testnet or mainnet)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (`.env`):
```env
PORT=3000
NODE_ENV=development
DYDX_NETWORK=testnet
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

4. Start the server:
```bash
npm run dev
```

### Mini App Setup

1. Navigate to the miniapp directory:
```bash
cd miniapp
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (`.env.local`):
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
```

4. Run the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Technology Stack

### Backend
- **Express.js**: REST API server
- **dYdX v4 Client**: Perpetual futures trading
- **Firebase Admin SDK**: Database and data persistence
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing

### Frontend
- **Next.js 15**: React framework with App Router
- **Farcaster Mini App SDK**: Farcaster integration
- **Wagmi**: Ethereum wallet integration
- **Tailwind CSS**: Styling
- **Radix UI**: Component library

## API Endpoints

### Markets
- `GET /api/markets/list` - Get all available markets
- `GET /api/markets/:market/data` - Get market data
- `GET /api/markets/:market/orderbook` - Get order book
- `GET /api/markets/:market/funding` - Get funding history

### User
- `GET /api/user/balance` - Get user balance (requires `x-wallet-address` header)
- `GET /api/user/positions` - Get open positions
- `GET /api/user/history` - Get trade history
- `GET /api/user/risk` - Get risk metrics
- `GET /api/user/transactions` - Get on-chain transactions

### Trading
- `POST /api/trading/order` - Place order (requires wallet credentials)
- `DELETE /api/trading/order/:orderId` - Cancel order
- `POST /api/trading/position/close` - Close position
- `POST /api/trading/deposit` - Deposit USDC
- `POST /api/trading/withdraw` - Withdraw USDC
- `PUT /api/trading/leverage` - Update leverage
- `PUT /api/trading/margin-mode` - Set margin mode

### Risk
- `POST /api/risk/liquidation-price` - Calculate liquidation price
- `POST /api/risk/analyze` - Analyze position risk

## Security

- All trading endpoints require wallet authentication
- Private keys are never stored on the server
- Transactions are signed client-side
- Firebase provides secure data storage
- CORS and Helmet middleware protect the API

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the repository.
