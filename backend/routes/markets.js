const express = require('express');
const router = express.Router();
const dydxClient = require('../config/dydx');

// Get all available markets
router.get('/list', async (req, res) => {
  try {
    const indexer = dydxClient.getIndexerClient();
    const markets = await indexer.markets.getPerpetualMarkets();
    
    const formattedMarkets = Object.entries(markets.markets || {}).map(([symbol, data]) => ({
      market: symbol,
      base_asset: data.baseAsset || symbol.split('-')[0],
      quote_asset: 'USDC',
      min_order_size: parseFloat(data.minOrderSize || 0),
      max_leverage: parseFloat(data.maxPositionSize || 20),
      tick_size: parseFloat(data.tickSize || 0),
      step_size: parseFloat(data.stepSize || 0),
      status: data.status === 'ACTIVE' ? 'active' : 'suspended'
    }));

    res.json(formattedMarkets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch markets', message: error.message });
  }
});

// Get market data for specific market
router.get('/:market/data', async (req, res) => {
  try {
    const { market } = req.params;
    const indexer = dydxClient.getIndexerClient();
    
    const [marketData, trades, candles] = await Promise.all([
      indexer.markets.getPerpetualMarket(market),
      indexer.markets.getPerpetualMarketTrades(market, { limit: 1 }),
      indexer.markets.getPerpetualMarketCandles(market, '1DAY')
    ]);

    const candle24h = candles.candles?.[0];
    
    res.json({
      market,
      mark_price: parseFloat(marketData.oraclePrice || 0),
      index_price: parseFloat(marketData.indexPrice || 0),
      funding_rate: parseFloat(marketData.nextFundingRate || 0),
      next_funding_time: marketData.nextFundingAt,
      open_interest: parseFloat(marketData.openInterest || 0),
      volume_24h: parseFloat(candle24h?.usdVolume || 0),
      price_change_24h: candle24h ? 
        ((parseFloat(candle24h.close) - parseFloat(candle24h.open)) / parseFloat(candle24h.open)) * 100 : 0,
      high_24h: parseFloat(candle24h?.high || 0),
      low_24h: parseFloat(candle24h?.low || 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch market data', message: error.message });
  }
});

// Get order book for specific market
router.get('/:market/orderbook', async (req, res) => {
  try {
    const { market } = req.params;
    const indexer = dydxClient.getIndexerClient();
    
    const orderbook = await indexer.markets.getPerpetualMarketOrderbook(market);
    
    res.json({
      bids: (orderbook.bids || []).map(bid => ({
        price: parseFloat(bid.price),
        size: parseFloat(bid.size)
      })),
      asks: (orderbook.asks || []).map(ask => ({
        price: parseFloat(ask.price),
        size: parseFloat(ask.size)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orderbook', message: error.message });
  }
});

// Get funding history
router.get('/:market/funding', async (req, res) => {
  try {
    const { market } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const indexer = dydxClient.getIndexerClient();
    
    const funding = await indexer.markets.getPerpetualMarketFunding(market, { limit });
    
    res.json(funding);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch funding history', message: error.message });
  }
});

module.exports = router;