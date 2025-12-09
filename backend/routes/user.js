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