const firebaseClient = require('../config/firebase');
const dydxClient = require('../config/dydx');

class FirebaseSyncService {
  /**
   * Sync user balance from dYdX to Firebase
   */
  async syncUserBalance(walletAddress) {
    try {
      const indexer = dydxClient.getIndexerClient();
      const subaccount = await indexer.account.getSubaccount(walletAddress, 0);
      
      const balanceData = {
        wallet_address: walletAddress.toLowerCase(),
        total_balance: parseFloat(subaccount.equity || 0),
        available_balance: parseFloat(subaccount.equity || 0) - parseFloat(subaccount.marginUsage || 0),
        margin_used: parseFloat(subaccount.marginUsage || 0),
        currency: 'USDC'
      };

      await firebaseClient.saveUserBalance(walletAddress, balanceData);
      return balanceData;
    } catch (error) {
      console.error(`Failed to sync balance for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Sync user positions from dYdX to Firebase
   */
  async syncUserPositions(walletAddress) {
    try {
      const indexer = dydxClient.getIndexerClient();
      const positions = await indexer.account.getSubaccountPerpetualPositions(walletAddress, 0);
      
      const positionsData = (positions.positions || []).map(pos => ({
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
        opened_at: pos.createdAt || new Date().toISOString()
      }));

      // Save each position to Firebase
      for (const position of positionsData) {
        await firebaseClient.savePosition(walletAddress, position.position_id, position);
      }

      return positionsData;
    } catch (error) {
      console.error(`Failed to sync positions for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Sync trade history from dYdX to Firebase
   */
  async syncTradeHistory(walletAddress, limit = 50) {
    try {
      const indexer = dydxClient.getIndexerClient();
      const fills = await indexer.account.getSubaccountFills(walletAddress, 0, { limit });
      
      const trades = (fills.fills || []).map(fill => ({
        trade_id: fill.id,
        market: fill.market,
        side: fill.side,
        size: parseFloat(fill.size),
        price: parseFloat(fill.price),
        realized_pnl: 0,
        fee: parseFloat(fill.fee),
        timestamp: fill.createdAt || new Date().toISOString()
      }));

      // Save each trade to Firebase
      for (const trade of trades) {
        await firebaseClient.saveTrade(walletAddress, trade.trade_id, trade);
      }

      return trades;
    } catch (error) {
      console.error(`Failed to sync trade history for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Sync market data to Firebase
   */
  async syncMarketData(market) {
    try {
      const indexer = dydxClient.getIndexerClient();
      const marketData = await indexer.markets.getPerpetualMarket(market);
      
      const formattedData = {
        market: market,
        mark_price: parseFloat(marketData.markPrice || 0),
        index_price: parseFloat(marketData.indexPrice || 0),
        funding_rate: parseFloat(marketData.fundingRate || 0),
        next_funding_time: marketData.nextFundingTime || new Date().toISOString(),
        open_interest: parseFloat(marketData.openInterest || 0),
        volume_24h: parseFloat(marketData.volume24H || 0),
        price_change_24h: 0, // Calculate from historical data
        high_24h: parseFloat(marketData.high24H || 0),
        low_24h: parseFloat(marketData.low24H || 0)
      };

      await firebaseClient.saveMarketData(market, formattedData);
      return formattedData;
    } catch (error) {
      console.error(`Failed to sync market data for ${market}:`, error);
      throw error;
    }
  }
}

module.exports = new FirebaseSyncService();
