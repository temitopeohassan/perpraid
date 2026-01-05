# PerpRaid Smart Contracts

Smart contracts for the PerpRaid perpetual futures trading platform on Base L2.

## Contracts

### PerpRaidVault
Manages USDC deposits and withdrawals for users. Handles on-chain custody of USDC before it's used for trading on dYdX v4.

**Features:**
- Deposit USDC into the vault
- Withdraw USDC from the vault
- Minimum deposit requirements
- Pausable for emergency situations

### PositionRegistry
On-chain registry for tracking perpetual futures positions. Stores position metadata for positions traded on dYdX v4.

**Features:**
- Register new positions
- Close positions
- Update position details
- Query positions by trader

### FeeManager
Manages trading fees and fee distribution.

**Features:**
- Configurable maker/taker fees
- Fee collection and distribution
- Fee tracking per trader

## Setup

1. Install dependencies:
npm install2. Create `.env` file:
cp .env.example .env
3. Configure environment variables in `.env`

## Deployment

### Base Sepolia (Testnet)
npm run deploy:base-sepolia
### Base Mainnet
npm run deploy:base
## Testing

npm test## Compilation
h
npm run compile## Verification

After deployment, verify contracts:
VERIFY=true npm run deploy:base-sepolia## Network Configuration

- **Base Mainnet**: Chain ID 8453
- **Base Sepolia**: Chain ID 84532

## USDC Addresses

- **Base Mainnet**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
```
