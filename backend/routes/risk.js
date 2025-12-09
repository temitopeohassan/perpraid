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