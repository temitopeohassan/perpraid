# SkipBridge Smart Contract Integration

This document explains how to integrate the `SkipBridge` smart contract with the Skip Go API for bridging USDC from Base to dYdX.

## Overview

The `SkipBridge` contract handles the on-chain portion of the bridge process, while the Skip Go API (via a relayer service) handles the off-chain routing and execution. The contract:

1. Accepts USDC deposits from users
2. Tracks bridge requests with unique IDs
3. Allows authorized relayers to update bridge status
4. Handles refunds for failed bridges
5. Collects bridge fees

## Architecture

```
User → SkipBridge Contract → Relayer Service → Skip Go API → dYdX
```

### Flow:

1. **Initiation**: User calls `initiateBridge()` with amount and dYdX address
   - Contract collects USDC and calculates fees
   - Creates a `BridgeRequest` with `Pending` status
   - Returns a `requestId`

2. **Processing**: Relayer (after calling Skip Go API) calls `processBridge()`
   - Updates request with `trackingId` and `txHash`
   - Sets status to `Processing`

3. **Completion**: Relayer calls `completeBridge()` after confirmation
   - Sets status to `Completed`
   - Transfers USDC to relayer (who handles the actual bridge via Skip Go API)

4. **Failure**: If bridge fails, relayer calls `failBridge()`
   - Sets status to `Failed`
   - Refunds USDC to user (minus fees)

## Contract Functions

### User Functions

#### `initiateBridge(uint256 amount, string calldata dydxAddress)`
- Initiates a bridge request
- Transfers USDC from user
- Collects bridge fee
- Returns `requestId`

**Parameters:**
- `amount`: Amount of USDC to bridge (in USDC decimals, 6)
- `dydxAddress`: Destination dYdX address

**Returns:** `bytes32 requestId`

### Relayer Functions

#### `processBridge(bytes32 requestId, bytes32 trackingId, string calldata txHash)`
- Updates bridge request with Skip Go API tracking information
- Only callable by authorized relayer

**Parameters:**
- `requestId`: Bridge request ID
- `trackingId`: Skip Go API tracking ID
- `txHash`: Transaction hash from bridge execution

#### `completeBridge(bytes32 requestId)`
- Marks bridge as completed
- Transfers USDC to relayer

#### `failBridge(bytes32 requestId, string calldata reason)`
- Marks bridge as failed
- Refunds user (minus fees)

### View Functions

#### `getBridgeRequest(bytes32 requestId)`
Returns bridge request details.

#### `getUserBridgeRequests(address user)`
Returns array of request IDs for a user.

#### `calculateFee(uint256 amount)`
Calculates bridge fee for an amount.

### Admin Functions

#### `setRelayer(address newRelayer)`
Updates the authorized relayer address.

#### `setBridgeLimits(uint256 newMinAmount, uint256 newMaxAmount)`
Updates minimum and maximum bridge amounts.

#### `setBridgeFee(uint256 newBridgeFeeBps)`
Updates bridge fee (in basis points).

## Relayer Service Integration

The relayer service should:

1. **Listen for events**: Monitor `BridgeInitiated` events from the contract

2. **Call Skip Go API**: When a new bridge is initiated:
   ```typescript
   const bridge = new BaseToDydxBridge()
   const route = await bridge.getRoute(amount, dydxAddress)
   const msgs = await bridge.generateMsgs(amount, dydxAddress, sourceAddress, route)
   ```

3. **Execute transaction**: Send the transaction using the wallet/signer

4. **Update contract**: Call `processBridge()` with the tracking ID and tx hash:
   ```solidity
   skipBridge.processBridge(requestId, trackingId, txHash)
   ```

5. **Monitor status**: Poll Skip Go API to check bridge status:
   ```typescript
   const status = await bridge.trackBridge(trackingId)
   ```

6. **Complete or fail**: Based on status:
   - If completed: `skipBridge.completeBridge(requestId)`
   - If failed: `skipBridge.failBridge(requestId, reason)`

## Example Relayer Service Code

```typescript
import { ethers } from 'ethers'
import { BaseToDydxBridge } from '@/lib/skip-bridge'

const skipBridge = new ethers.Contract(SKIP_BRIDGE_ADDRESS, ABI, provider)
const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider)

// Listen for bridge initiation events
skipBridge.on('BridgeInitiated', async (requestId, user, amount, dydxAddress, timestamp) => {
  try {
    // Get bridge instance
    const bridge = new BaseToDydxBridge()
    bridge.setProvider(wallet)
    
    // Format amount (contract stores in USDC units)
    const formattedAmount = BaseToDydxBridge.formatAmount(ethers.formatUnits(amount, 6))
    
    // Execute bridge via Skip Go API
    const result = await bridge.bridge(formattedAmount, dydxAddress)
    
    // Update contract
    const tx = await skipBridge.connect(wallet).processBridge(
      requestId,
      ethers.hexlify(ethers.toUtf8Bytes(result.trackingId)),
      result.txHash
    )
    await tx.wait()
    
    // Monitor for completion
    monitorBridge(requestId, result.trackingId)
  } catch (error) {
    // Mark as failed
    await skipBridge.connect(wallet).failBridge(requestId, error.message)
  }
})

async function monitorBridge(requestId: string, trackingId: string) {
  const bridge = new BaseToDydxBridge()
  
  const checkStatus = async () => {
    const status = await bridge.trackBridge(trackingId)
    
    if (status.completed) {
      await skipBridge.connect(wallet).completeBridge(requestId)
    } else if (status.status === 'failed') {
      await skipBridge.connect(wallet).failBridge(requestId, status.error || 'Bridge failed')
    } else {
      // Check again in 30 seconds
      setTimeout(checkStatus, 30000)
    }
  }
  
  checkStatus()
}
```

## Deployment

```bash
# Set environment variables
export USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  # Base mainnet
export RELAYER_ADDRESS=<your-relayer-address>

# Deploy
npm run deploy:base
```

## Security Considerations

1. **Relayer Security**: The relayer has significant control. Use a multisig or timelock for relayer updates.

2. **Fee Limits**: Bridge fees are capped at 10% (1000 bps) to prevent abuse.

3. **Amount Limits**: Min/max amounts prevent dust attacks and limit exposure.

4. **Reentrancy**: Contract uses `ReentrancyGuard` to prevent reentrancy attacks.

5. **Access Control**: Critical functions are protected with `onlyOwner` or `onlyRelayer`.

## Testing

Run tests:
```bash
npm test
```

## Events

- `BridgeInitiated(bytes32 indexed requestId, address indexed user, uint256 amount, string dydxAddress, uint256 timestamp)`
- `BridgeProcessed(bytes32 indexed requestId, bytes32 indexed trackingId, string txHash, uint256 timestamp)`
- `BridgeCompleted(bytes32 indexed requestId, bytes32 indexed trackingId, address indexed user, uint256 amount, uint256 timestamp)`
- `BridgeFailed(bytes32 indexed requestId, bytes32 indexed trackingId, address indexed user, string reason)`

