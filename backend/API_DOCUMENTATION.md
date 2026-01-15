# dYdX v4 Node Client Private API Endpoints

This document describes all the implemented endpoints for interacting with dYdX v4 using the Node Client Private API.

## Authentication

All endpoints require authentication via headers:
- `x-wallet-address`: The wallet address (dYdX subaccount address)
- `x-private-key`: The private key for signing transactions

**Important**: In production, consider using a more secure authentication method (e.g., JWT tokens) instead of passing private keys directly.

## Base URL

```
/api/trading
```

## Endpoints

### Order Operations

#### 1. Place Order
**POST** `/order`

Place a new order on dYdX.

**Request Body:**
```json
{
  "market": "BTC-USD",
  "side": "BUY",
  "type": "LIMIT",
  "size": "0.1",
  "price": "50000",
  "timeInForce": "GTT",
  "reduceOnly": false,
  "postOnly": false,
  "clientId": "optional-client-id",
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "order_id": "1234567890",
  "transaction_hash": "0x...",
  "message": "Order placed successfully"
}
```

#### 2. Cancel Order
**DELETE** `/order/:orderId`

Cancel a specific order.

**Request Body:**
```json
{
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "order_id": "1234567890",
  "transaction_hash": "0x...",
  "message": "Order cancelled successfully"
}
```

#### 3. Batch Cancel Orders
**POST** `/orders/batch-cancel`

Cancel multiple orders at once.

**Request Body:**
```json
{
  "orderIds": ["order1", "order2", "order3"],
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "order_ids": ["order1", "order2", "order3"],
  "results": [
    { "orderId": "order1", "success": true, "transactionHash": "0x..." },
    { "orderId": "order2", "success": true, "transactionHash": "0x..." }
  ],
  "success_count": 2,
  "failure_count": 1,
  "message": "Cancelled 2 of 3 orders"
}
```

### Deposit/Withdraw Operations

#### 4. Deposit
**POST** `/deposit`

Deposit funds to a subaccount.

**Request Body:**
```json
{
  "amount": 1000.0,
  "assetId": "USDC",
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "amount": 1000.0,
  "quantums": "1000000000",
  "asset_id": "USDC",
  "transaction_hash": "0x...",
  "message": "Deposit initiated successfully"
}
```

#### 5. Withdraw
**POST** `/withdraw`

Withdraw funds from a subaccount.

**Request Body:**
```json
{
  "amount": 500.0,
  "recipientAddress": "dydx1...",
  "assetId": "USDC",
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "amount": 500.0,
  "quantums": "500000000",
  "recipient_address": "dydx1...",
  "asset_id": "USDC",
  "transaction_hash": "0x...",
  "message": "Withdrawal initiated successfully"
}
```

#### 6. Transfer
**POST** `/transfer`

Transfer funds between subaccounts.

**Request Body:**
```json
{
  "recipientSubaccount": "dydx1...",
  "assetId": "USDC",
  "amount": 100.0,
  "senderSubaccountNumber": 0,
  "recipientSubaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "amount": 100.0,
  "quantums": "100000000",
  "recipient_subaccount": "dydx1...",
  "asset_id": "USDC",
  "transaction_hash": "0x...",
  "message": "Transfer initiated successfully"
}
```

#### 7. Send Token
**POST** `/send-token`

Send tokens to another address.

**Request Body:**
```json
{
  "recipientAddress": "dydx1...",
  "assetId": "USDC",
  "amount": 50.0,
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "amount": 50.0,
  "quantums": "50000000",
  "recipient_address": "dydx1...",
  "asset_id": "USDC",
  "transaction_hash": "0x...",
  "message": "Token sent successfully"
}
```

### Transaction Operations

#### 8. Simulate
**POST** `/simulate`

Simulate a transaction before execution.

**Request Body:**
```json
{
  "transaction": {
    "type": "PLACE_ORDER",
    "orderParams": { ... }
  }
}
```

**Response:**
```json
{
  "success": true,
  "simulation_result": { ... },
  "message": "Transaction simulated successfully"
}
```

#### 9. Create Transaction (Unsigned)
**POST** `/transaction/create`

Create an unsigned transaction that can be signed later.

**Request Body:**
```json
{
  "type": "PLACE_ORDER",
  "orderParams": {
    "market": "BTC-USD",
    "side": "BUY",
    "type": "LIMIT",
    "size": "0.1",
    "price": "50000"
  },
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "unsigned_transaction": { ... },
  "message": "Transaction created successfully (unsigned)"
}
```

#### 10. Broadcast Transaction
**POST** `/transaction/broadcast`

Broadcast a signed transaction.

**Request Body:**
```json
{
  "signedTransaction": {
    "body": "...",
    "authInfo": "...",
    "signatures": ["..."]
  }
}
```

**Response:**
```json
{
  "success": true,
  "transaction_hash": "0x...",
  "result": { ... },
  "message": "Transaction broadcast successfully"
}
```

### Market Operations

#### 11. Create Market Permissionless
**POST** `/market/permissionless`

Create a new perpetual market.

**Request Body:**
```json
{
  "ticker": "NEW-USD",
  "minPriceChangePpm": 1000,
  "minExchanges": 1,
  "exchangeConfigJson": "{ ... }"
}
```

**Response:**
```json
{
  "success": true,
  "ticker": "NEW-USD",
  "transaction_hash": "0x...",
  "message": "Market created successfully"
}
```

### Staking Operations

#### 12. Delegate
**POST** `/delegate`

Delegate tokens to a validator.

**Request Body:**
```json
{
  "validatorAddress": "dydxvaloper1...",
  "amount": 1000.0,
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "validator_address": "dydxvaloper1...",
  "amount": 1000.0,
  "quantums": "1000000000",
  "transaction_hash": "0x...",
  "message": "Delegation successful"
}
```

#### 13. Undelegate
**POST** `/undelegate`

Undelegate tokens from a validator.

**Request Body:**
```json
{
  "validatorAddress": "dydxvaloper1...",
  "amount": 500.0,
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "validator_address": "dydxvaloper1...",
  "amount": 500.0,
  "quantums": "500000000",
  "transaction_hash": "0x...",
  "message": "Undelegation successful"
}
```

#### 14. Register Affiliate
**POST** `/affiliate/register`

Register an affiliate address.

**Request Body:**
```json
{
  "affiliateAddress": "dydx1...",
  "rate": 0.001,
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "affiliate_address": "dydx1...",
  "rate": 0.001,
  "transaction_hash": "0x...",
  "message": "Affiliate registered successfully"
}
```

#### 15. Withdraw Delegator Reward
**POST** `/staking/reward/withdraw`

Withdraw staking rewards from a validator.

**Request Body:**
```json
{
  "validatorAddress": "dydxvaloper1...",
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "validator_address": "dydxvaloper1...",
  "transaction_hash": "0x...",
  "message": "Delegator reward withdrawn successfully"
}
```

### Position Operations

#### 16. Close Position
**POST** `/position/close`

Close an open position.

**Request Body:**
```json
{
  "market": "BTC-USD",
  "size": "0.1",
  "price": "50000",
  "type": "MARKET",
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "market": "BTC-USD",
  "side": "SELL",
  "size": "0.1",
  "transaction_hash": "0x...",
  "message": "Position close order placed successfully"
}
```

### MegaVault Operations

#### 17. Deposit to MegaVault
**POST** `/megavault/deposit`

Deposit funds to the MegaVault.

**Request Body:**
```json
{
  "amount": 1000.0,
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "amount": 1000.0,
  "quantums": "1000000000",
  "transaction_hash": "0x...",
  "message": "Deposit to MegaVault initiated successfully"
}
```

#### 18. Withdraw from MegaVault
**POST** `/megavault/withdraw`

Withdraw funds from the MegaVault.

**Request Body:**
```json
{
  "amount": 500.0,
  "subaccountNumber": 0
}
```

**Response:**
```json
{
  "success": true,
  "amount": 500.0,
  "quantums": "500000000",
  "transaction_hash": "0x...",
  "message": "Withdrawal from MegaVault initiated successfully"
}
```

#### 19. Get Owner Shares in MegaVault
**GET** `/megavault/shares/:ownerAddress`

Get the shares owned by an address in the MegaVault.

**Response:**
```json
{
  "success": true,
  "owner_address": "dydx1...",
  "shares": {
    "USDC": "1000000000"
  },
  "total_shares": "10000000000",
  "message": "MegaVault shares retrieved successfully"
}
```

#### 20. Get Withdrawal Info of MegaVault
**GET** `/megavault/withdrawal-info?min_amount=0&limit=100`

Get withdrawal information for the MegaVault.

**Query Parameters:**
- `min_amount` (optional): Minimum amount filter (default: 0)
- `limit` (optional): Maximum number of results (default: 100)

**Response:**
```json
{
  "success": true,
  "withdrawals": [
    {
      "owner": "dydx1...",
      "amount": "1000000000",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "total_count": 1,
  "message": "MegaVault withdrawal info retrieved successfully"
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid authentication
- `500`: Internal Server Error - Server or dYdX API error

## Notes

1. **Amounts**: All amounts should be provided in the asset's base unit (e.g., USDC: 1.0 = 1 USDC). The service converts to quantums internally.

2. **Subaccount Numbers**: Default is 0. You can use different subaccount numbers for organization.

3. **Transaction Hashes**: All successful operations return a transaction hash that can be used to track the transaction status.

4. **Async Operations**: Some operations (deposits, withdrawals) are initiated on-chain and may take time to complete. Monitor transaction status using the returned hash.

5. **Rate Limiting**: Consider implementing rate limiting in production to prevent abuse.

6. **Security**: Never expose private keys in client-side code. Use secure backend authentication in production.

## Example Usage

### Place a Limit Order

```javascript
const response = await fetch('http://localhost:3000/api/trading/order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': 'dydx1...',
    'x-private-key': '0x...'
  },
  body: JSON.stringify({
    market: 'BTC-USD',
    side: 'BUY',
    type: 'LIMIT',
    size: '0.1',
    price: '50000',
    reduceOnly: false,
    postOnly: false
  })
});

const result = await response.json();
console.log(result);
```

### Deposit Funds

```javascript
const response = await fetch('http://localhost:3000/api/trading/deposit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': 'dydx1...',
    'x-private-key': '0x...'
  },
  body: JSON.stringify({
    amount: 1000.0,
    assetId: 'USDC'
  })
});

const result = await response.json();
console.log(result);
```

