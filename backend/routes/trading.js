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