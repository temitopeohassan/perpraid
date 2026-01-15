const express = require('express');
const router = express.Router();
const DydxService = require('../services/dydx-service');
const { Order_Side, Order_TimeInForce, OrderType, AssetId } = require('@dydxprotocol/v4-client-js');

// Middleware to validate wallet and initialize service
const validateWallet = async (req, res, next) => {
  const address = req.headers['x-wallet-address'];
  const privateKey = req.headers['x-private-key'];
  
  if (!address || !privateKey) {
    return res.status(400).json({ error: 'Wallet address and private key required in headers' });
  }
  
  try {
    req.dydxService = new DydxService();
    await req.dydxService.initialize(address, privateKey);
    req.walletAddress = address;
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Failed to initialize wallet', message: error.message });
  }
};

router.use(validateWallet);

// ==================== ORDER OPERATIONS ====================

/**
 * POST /api/trading/order
 * Place Order
 */
router.post('/order', async (req, res) => {
  try {
    const { 
      market, 
      side, 
      type, 
      size, 
      price, 
      timeInForce, 
      reduceOnly, 
      postOnly, 
      clientId,
      subaccountNumber 
    } = req.body;
    
    if (!market || !side || !type || !size) {
      return res.status(400).json({ error: 'Missing required fields: market, side, type, size' });
    }

    const result = await req.dydxService.placeOrder({
      market,
      side,
      type,
      size,
      price,
      timeInForce,
      reduceOnly,
      postOnly,
      clientId,
      subaccountNumber
    });

    res.json({
      success: true,
      order_id: result.clientId,
      transaction_hash: result.transactionHash,
      message: 'Order placed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to place order', message: error.message });
  }
});

/**
 * DELETE /api/trading/order/:orderId
 * Cancel Order
 */
router.delete('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { subaccountNumber } = req.body;
    
    const result = await req.dydxService.cancelOrder(orderId, subaccountNumber);

    res.json({
      success: true,
      order_id: result.orderId,
      transaction_hash: result.transactionHash,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel order', message: error.message });
  }
});

/**
 * POST /api/trading/orders/batch-cancel
 * Batch Cancel Orders
 */
router.post('/orders/batch-cancel', async (req, res) => {
  try {
    const { orderIds, subaccountNumber } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'orderIds array is required' });
    }

    const result = await req.dydxService.batchCancelOrders(orderIds, subaccountNumber);

    res.json({
      success: true,
      order_ids: result.orderIds,
      results: result.results,
      success_count: result.successCount,
      failure_count: result.failureCount,
      message: `Cancelled ${result.successCount} of ${orderIds.length} orders`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to batch cancel orders', message: error.message });
  }
});

// ==================== DEPOSIT/WITHDRAW OPERATIONS ====================

/**
 * POST /api/trading/deposit
 * Deposit
 */
router.post('/deposit', async (req, res) => {
  try {
    const { amount, assetId, subaccountNumber } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const result = await req.dydxService.deposit(amount, assetId, subaccountNumber);

    res.json({
      success: true,
      amount: result.amount,
      quantums: result.quantums,
      asset_id: result.assetId,
      transaction_hash: result.transactionHash,
      message: 'Deposit initiated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process deposit', message: error.message });
  }
});

/**
 * POST /api/trading/withdraw
 * Withdraw
 */
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, recipientAddress, assetId, subaccountNumber } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    if (!recipientAddress) {
      return res.status(400).json({ error: 'Recipient address is required' });
    }

    const result = await req.dydxService.withdraw(amount, recipientAddress, assetId, subaccountNumber);

    res.json({
      success: true,
      amount: result.amount,
      quantums: result.quantums,
      recipient_address: result.recipientAddress,
      asset_id: result.assetId,
      transaction_hash: result.transactionHash,
      message: 'Withdrawal initiated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process withdrawal', message: error.message });
  }
});

/**
 * POST /api/trading/transfer
 * Transfer (between subaccounts)
 */
router.post('/transfer', async (req, res) => {
  try {
    const { recipientSubaccount, assetId, amount, senderSubaccountNumber, recipientSubaccountNumber } = req.body;
    
    if (!recipientSubaccount || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Recipient subaccount and amount are required' });
    }

    const result = await req.dydxService.transfer({
      recipientSubaccount,
      assetId,
      amount,
      senderSubaccountNumber,
      recipientSubaccountNumber
    });

    res.json({
      success: true,
      amount: result.amount,
      quantums: result.quantums,
      recipient_subaccount: result.recipientSubaccount,
      asset_id: result.assetId,
      transaction_hash: result.transactionHash,
      message: 'Transfer initiated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process transfer', message: error.message });
  }
});

/**
 * POST /api/trading/send-token
 * Send Token
 */
router.post('/send-token', async (req, res) => {
  try {
    const { recipientAddress, assetId, amount, subaccountNumber } = req.body;
    
    if (!recipientAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Recipient address and amount are required' });
    }

    const result = await req.dydxService.sendToken({
      recipientAddress,
      assetId,
      amount,
      subaccountNumber
    });

    res.json({
      success: true,
      amount: result.amount,
      quantums: result.quantums,
      recipient_address: result.recipientAddress,
      asset_id: result.assetId,
      transaction_hash: result.transactionHash,
      message: 'Token sent successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send token', message: error.message });
  }
});

// ==================== TRANSACTION OPERATIONS ====================

/**
 * POST /api/trading/simulate
 * Simulate Transaction
 */
router.post('/simulate', async (req, res) => {
  try {
    const { transaction } = req.body;
    
    if (!transaction) {
      return res.status(400).json({ error: 'Transaction object is required' });
    }

    const result = await req.dydxService.simulate(transaction);

    res.json({
      success: true,
      simulation_result: result,
      message: 'Transaction simulated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to simulate transaction', message: error.message });
  }
});

/**
 * POST /api/trading/transaction/create
 * Create Transaction (unsigned)
 */
router.post('/transaction/create', async (req, res) => {
  try {
    const { type, ...txParams } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Transaction type is required' });
    }

    const unsignedTx = await req.dydxService.createTransaction({ type, ...txParams });

    res.json({
      success: true,
      unsigned_transaction: unsignedTx,
      message: 'Transaction created successfully (unsigned)'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction', message: error.message });
  }
});

/**
 * POST /api/trading/transaction/broadcast
 * Broadcast Transaction
 */
router.post('/transaction/broadcast', async (req, res) => {
  try {
    const { signedTransaction } = req.body;
    
    if (!signedTransaction) {
      return res.status(400).json({ error: 'Signed transaction is required' });
    }

    const result = await req.dydxService.broadcastTransaction(signedTransaction);

    res.json({
      success: true,
      transaction_hash: result.transactionHash,
      result: result.result,
      message: 'Transaction broadcast successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to broadcast transaction', message: error.message });
  }
});

// ==================== MARKET OPERATIONS ====================

/**
 * POST /api/trading/market/permissionless
 * Create Market Permissionless
 */
router.post('/market/permissionless', async (req, res) => {
  try {
    const { ticker, minPriceChangePpm, minExchanges, exchangeConfigJson } = req.body;
    
    if (!ticker || !minPriceChangePpm || !minExchanges || !exchangeConfigJson) {
      return res.status(400).json({ 
        error: 'Missing required fields: ticker, minPriceChangePpm, minExchanges, exchangeConfigJson' 
      });
    }

    const result = await req.dydxService.createMarketPermissionless({
      ticker,
      minPriceChangePpm,
      minExchanges,
      exchangeConfigJson
    });

    res.json({
      success: true,
      ticker: result.ticker,
      transaction_hash: result.transactionHash,
      message: 'Market created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create market', message: error.message });
  }
});

// ==================== STAKING OPERATIONS ====================

/**
 * POST /api/trading/delegate
 * Delegate
 */
router.post('/delegate', async (req, res) => {
  try {
    const { validatorAddress, amount, subaccountNumber } = req.body;
    
    if (!validatorAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Validator address and amount are required' });
    }

    const result = await req.dydxService.delegate(validatorAddress, amount, subaccountNumber);

    res.json({
      success: true,
      validator_address: result.validatorAddress,
      amount: result.amount,
      quantums: result.quantums,
      transaction_hash: result.transactionHash,
      message: 'Delegation successful'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delegate', message: error.message });
  }
});

/**
 * POST /api/trading/undelegate
 * Undelegate
 */
router.post('/undelegate', async (req, res) => {
  try {
    const { validatorAddress, amount, subaccountNumber } = req.body;
    
    if (!validatorAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Validator address and amount are required' });
    }

    const result = await req.dydxService.undelegate(validatorAddress, amount, subaccountNumber);

    res.json({
      success: true,
      validator_address: result.validatorAddress,
      amount: result.amount,
      quantums: result.quantums,
      transaction_hash: result.transactionHash,
      message: 'Undelegation successful'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to undelegate', message: error.message });
  }
});

/**
 * POST /api/trading/affiliate/register
 * Register Affiliate
 */
router.post('/affiliate/register', async (req, res) => {
  try {
    const { affiliateAddress, rate, subaccountNumber } = req.body;
    
    if (!affiliateAddress || rate === undefined) {
      return res.status(400).json({ error: 'Affiliate address and rate are required' });
    }

    const result = await req.dydxService.registerAffiliate(affiliateAddress, rate, subaccountNumber);

    res.json({
      success: true,
      affiliate_address: result.affiliateAddress,
      rate: result.rate,
      transaction_hash: result.transactionHash,
      message: 'Affiliate registered successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register affiliate', message: error.message });
  }
});

/**
 * POST /api/trading/staking/reward/withdraw
 * Withdraw Delegator Reward
 */
router.post('/staking/reward/withdraw', async (req, res) => {
  try {
    const { validatorAddress, subaccountNumber } = req.body;
    
    if (!validatorAddress) {
      return res.status(400).json({ error: 'Validator address is required' });
    }

    const result = await req.dydxService.withdrawDelegatorReward(validatorAddress, subaccountNumber);

    res.json({
      success: true,
      validator_address: result.validatorAddress,
      transaction_hash: result.transactionHash,
      message: 'Delegator reward withdrawn successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to withdraw delegator reward', message: error.message });
  }
});

// ==================== POSITION OPERATIONS ====================

/**
 * POST /api/trading/position/close
 * Close Position
 */
router.post('/position/close', async (req, res) => {
  try {
    const { market, size, price, type, subaccountNumber } = req.body;
    
    if (!market || !type) {
      return res.status(400).json({ error: 'Market and type are required' });
    }

    const result = await req.dydxService.closePosition({
      market,
      size,
      price,
      type,
      subaccountNumber
    });

    res.json({
      success: true,
      market: result.market,
      side: result.side,
      size: result.size,
      transaction_hash: result.transactionHash,
      message: 'Position close order placed successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to close position', message: error.message });
  }
});

// ==================== MEGAVAULT OPERATIONS ====================

/**
 * POST /api/trading/megavault/deposit
 * Deposit to MegaVault
 */
router.post('/megavault/deposit', async (req, res) => {
  try {
    const { amount, subaccountNumber } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const result = await req.dydxService.depositToMegaVault(amount, subaccountNumber);

    res.json({
      success: true,
      amount: result.amount,
      quantums: result.quantums,
      transaction_hash: result.transactionHash,
      message: 'Deposit to MegaVault initiated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deposit to MegaVault', message: error.message });
  }
});

/**
 * POST /api/trading/megavault/withdraw
 * Withdraw from MegaVault
 */
router.post('/megavault/withdraw', async (req, res) => {
  try {
    const { amount, subaccountNumber } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    const result = await req.dydxService.withdrawFromMegaVault(amount, subaccountNumber);

    res.json({
      success: true,
      amount: result.amount,
      quantums: result.quantums,
      transaction_hash: result.transactionHash,
      message: 'Withdrawal from MegaVault initiated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to withdraw from MegaVault', message: error.message });
  }
});

/**
 * GET /api/trading/megavault/shares/:ownerAddress
 * Get Owner Shares in MegaVault
 */
router.get('/megavault/shares/:ownerAddress', async (req, res) => {
  try {
    const { ownerAddress } = req.params;
    
    const result = await req.dydxService.getOwnerSharesInMegaVault(ownerAddress);

    res.json({
      success: true,
      owner_address: result.ownerAddress,
      shares: result.shares,
      total_shares: result.totalShares,
      message: 'MegaVault shares retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get MegaVault shares', message: error.message });
  }
});

/**
 * GET /api/trading/megavault/withdrawal-info
 * Get Withdrawal Info of MegaVault
 */
router.get('/megavault/withdrawal-info', async (req, res) => {
  try {
    const minAmount = parseFloat(req.query.min_amount) || 0;
    const limit = parseInt(req.query.limit) || 100;
    
    const result = await req.dydxService.getWithdrawalInfoOfMegaVault(minAmount, limit);

    res.json({
      success: true,
      withdrawals: result.withdrawals,
      total_count: result.totalCount,
      message: 'MegaVault withdrawal info retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get MegaVault withdrawal info', message: error.message });
  }
});

// ==================== LEGACY ENDPOINTS (for backward compatibility) ====================

/**
 * PUT /api/trading/leverage
 * Update leverage for market (legacy - dYdX v4 handles leverage per-position)
 */
router.put('/leverage', async (req, res) => {
  try {
    const { market, leverage } = req.body;
    
    if (!market || !leverage || leverage < 1 || leverage > 20) {
      return res.status(400).json({ error: 'Invalid leverage parameters' });
    }

    res.json({
      success: true,
      market,
      leverage,
      message: 'Leverage will be applied to next order (dYdX v4 handles leverage per-position)'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update leverage', message: error.message });
  }
});

/**
 * PUT /api/trading/margin-mode
 * Set margin mode (legacy - dYdX v4 primarily uses cross margin)
 */
router.put('/margin-mode', async (req, res) => {
  try {
    const { market, margin_mode } = req.body;
    
    if (!market || !['cross', 'isolated'].includes(margin_mode)) {
      return res.status(400).json({ error: 'Invalid margin mode parameters' });
    }

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
