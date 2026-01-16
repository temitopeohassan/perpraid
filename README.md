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

### Staking & Yield
- **Uniswap V3 Staking**: Stake Uniswap V3 LP positions on Base to earn yield
- **Trading Allowance**: Weekly distribution of staking yield as trading allowance
- **Stake/Unstake**: Easy staking and unstaking of LP positions
- **Yield Tracking**: Monitor accumulated yield and pending rewards
- **Allowance Bridging**: Bridge trading allowance from Base to dYdX for trading

### Cross-Chain Bridging
- **Bidirectional Bridge**: Bridge USDC between Base and dYdX chains
- **Base → dYdX**: Bridge from Base to dYdX using Skip API
- **dYdX → Base**: Bridge from dYdX to Base using Keplr wallet
- **Transaction Tracking**: Real-time tracking of bridge transactions
- **Multi-Wallet Support**: Connect both EVM (Base) and Cosmos (dYdX) wallets

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
│   ├── routes/       # API route handlers (markets, user, trading, risk, staking)
│   ├── config/       # dYdX and Firebase configuration
│   ├── services/     # Business logic services (dydx, staking, websocket)
│   └── middleware/  # Authentication and validation
├── miniapp/          # Next.js Farcaster Mini App
│   ├── app/          # Next.js app router pages
│   ├── components/   # React components (cards, modals, pages, navigation)
│   ├── hooks/        # React hooks (wallet, bridge, staking)
│   └── lib/          # Utilities, API client, and bridge implementations
├── contracts/        # Smart contracts (Solidity)
│   ├── contracts/    # Contract source files
│   ├── scripts/      # Deployment scripts
│   └── test/         # Contract tests
```

## API Resources

### User Resources
- **User Balance**: Current USDC balance and available margin
- **Open Positions**: All active perpetual futures positions
- **Trade History**: Historical trades and closed positions
- **Risk Metrics**: Portfolio risk assessment and warnings
- **On-Chain Transactions**: Deposit and withdrawal history

### Staking Resources
- **Staking Data**: Current staking status, trading allowance, and yield
- **Staking History**: History of stake/unstake transactions
- **Trading Allowance**: Weekly trading allowance from staking yield
- **Allowance History**: Historical trading allowance distributions

### Market Resources
- **Market List**: All tradeable perpetual futures markets
- **Market Data**: Real-time market data (prices, funding, volume)
- **Order Book**: Current order book depth for markets
- **Funding History**: Historical funding rate payments

### Bridge Resources
- **Bridge History**: History of bridge transactions
- **Bridge Tracking**: Real-time status of bridge transactions
- **Route Estimation**: Get optimal bridge routes and fees

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

### Staking Operations
- `stake`: Stake Uniswap V3 LP positions to earn yield
- `unstake`: Unstake positions and claim rewards
- `claim_rewards`: Claim pending staking rewards
- `distribute_weekly_allowance`: Distribute weekly trading allowance
- `get_trading_allowance`: View current trading allowance balance

### Cross-Chain Bridging
- `bridge_base_to_dydx`: Bridge USDC from Base to dYdX
- `bridge_dydx_to_base`: Bridge USDC from dYdX to Base
- `get_bridge_route`: Get optimal bridge route and estimate fees
- `track_bridge`: Track bridge transaction status

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
BASE_RPC_URL=https://mainnet.base.org
STAKING_CONTRACT_ADDRESS=0x... # Deployed StakingAllowanceManager address
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
NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS=0x... # StakingAllowanceManager address
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id # Optional, for WalletConnect
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
- **Wagmi**: Ethereum wallet integration (Base/EVM)
- **Keplr Wallet**: Cosmos wallet integration (dYdX chain)
- **Viem**: Ethereum library for Base chain interactions
- **CosmJS**: Cosmos SDK library for dYdX chain interactions
- **Skip API**: Cross-chain bridge routing and execution
- **Tailwind CSS**: Styling
- **Radix UI**: Component library

### Smart Contracts
- **Solidity 0.8.28**: Smart contract language
- **Hardhat**: Development environment
- **OpenZeppelin**: Security libraries
- **StakingAllowanceManager**: Staking and allowance management contract
- **SkipBridge**: Bridge contract for Base ↔ dYdX transfers

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

### Staking
- `GET /api/staking/data` - Get staking data and trading allowance
- `GET /api/staking/history` - Get staking transaction history
- `POST /api/staking/save` - Save staking transaction
- `GET /api/staking/allowance-history` - Get trading allowance distribution history
- `GET /api/staking/stakes` - Get active stakes
- `GET /api/staking/pending-rewards` - Get pending rewards
- `POST /api/staking/verify-transaction` - Verify staking transaction

### Bridge
- `GET /api/bridge/history` - Get bridge transaction history
- `POST /api/bridge/save` - Save bridge transaction
- `GET /api/bridge/track/:trackingId` - Track bridge transaction status

## Smart Contracts

### StakingAllowanceManager
Manages staking with Uniswap V3 Staker and trading allowance distribution.

**Features:**
- Stake/unstake Uniswap V3 LP positions
- Accumulate yield from staking rewards
- Weekly trading allowance distribution
- Track user stakes and rewards

**Deployment:**
```bash
cd contracts
npx hardhat run scripts/deploy.ts --network base
```

### SkipBridge
Handles bridging USDC between Base and dYdX chains.

**Features:**
- Initiate bridge requests
- Track bridge status
- Fee collection
- Refund mechanism

## Security

- All trading endpoints require wallet authentication
- Private keys are never stored on the server
- Transactions are signed client-side
- Keplr wallet integration for secure dYdX transactions
- Firebase provides secure data storage
- CORS and Helmet middleware protect the API
- Smart contracts use OpenZeppelin security libraries

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the repository.
