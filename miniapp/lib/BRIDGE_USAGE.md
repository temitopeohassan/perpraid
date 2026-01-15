# Skip Go API Bridge Integration

This integration allows bridging USDC from Base to dYdX using the Skip Go API.

## Usage

### Using the React Hook

```tsx
import { useBridge } from '@/hooks/use-bridge'

function BridgeComponent() {
  const { bridge, getRoute, trackBridge, isLoading, error } = useBridge()
  const [dydxAddress, setDydxAddress] = useState('')
  const [amount, setAmount] = useState('')

  const handleBridge = async () => {
    try {
      // Get route estimate first (optional)
      const route = await getRoute(amount, dydxAddress)
      console.log('Estimated output:', route.route.amount_out)
      
      // Execute bridge
      const result = await bridge(amount, dydxAddress)
      if (result) {
        console.log('Transaction hash:', result.txHash)
        console.log('Tracking ID:', result.trackingId)
        
        // Track bridge status
        const status = await trackBridge(result.trackingId)
        console.log('Bridge status:', status)
      }
    } catch (err) {
      console.error('Bridge failed:', err)
    }
  }

  return (
    <div>
      <input 
        value={amount} 
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (USDC)"
      />
      <input 
        value={dydxAddress} 
        onChange={(e) => setDydxAddress(e.target.value)}
        placeholder="dYdX address"
      />
      <button onClick={handleBridge} disabled={isLoading}>
        {isLoading ? 'Bridging...' : 'Bridge USDC'}
      </button>
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

### Using the Bridge Class Directly

```typescript
import { BaseToDydxBridge } from '@/lib/skip-bridge'
import { useWalletClient } from 'wagmi'

const { data: walletClient } = useWalletClient()

const bridge = new BaseToDydxBridge()
if (walletClient) {
  bridge.setProvider(walletClient)
}

// Format amount (amount in USDC, will be converted to smallest unit)
const amount = BaseToDydxBridge.formatAmount('10') // 10 USDC

// Execute bridge
const result = await bridge.bridge(amount, 'dydx1...')
console.log('TX Hash:', result.txHash)
console.log('Tracking ID:', result.trackingId)

// Track status
const status = await bridge.trackBridge(result.trackingId)
```

## API Methods

### `useBridge()` Hook

- `bridge(amount: string, dydxAddress: string)` - Execute bridge transaction
- `getRoute(amount: string, dydxAddress: string)` - Get route estimate
- `trackBridge(trackingId: string)` - Track bridge status
- `isLoading` - Loading state
- `error` - Error message if any

### `BaseToDydxBridge` Class

- `bridge(amount: string, dydxAddress: string)` - Execute bridge
- `getRoute(amount: string, dydxAddress: string)` - Get route
- `generateMsgs(amount: string, dydxAddress: string, sourceAddress: string)` - Generate messages
- `trackBridge(trackingId: string)` - Track status
- `BaseToDydxBridge.formatAmount(amount: string)` - Format USDC amount
- `BaseToDydxBridge.parseAmount(amount: string)` - Parse amount to USDC

## Configuration

- **Source Chain**: Base (Chain ID: 8453)
- **Destination Chain**: dYdX (Chain ID: dydx-mainnet-1)
- **Token**: USDC
- **Base USDC Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **dYdX USDC Denom**: `ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5`

## Notes

- Amount should be provided in USDC (not wei). The bridge will convert it internally.
- USDC on Base has 6 decimals.
- Bridge transactions are automatically saved to the backend API.
- The hook requires a connected wallet via wagmi.

