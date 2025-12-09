class PositionCalculator {
    static calculateLiquidationPrice(entryPrice, size, leverage, side, maintenanceMargin = 0.03) {
      const initialMargin = (entryPrice * size) / leverage;
      const maintenanceMarginValue = (entryPrice * size) * maintenanceMargin;
      
      if (side === 'LONG') {
        return entryPrice - ((initialMargin - maintenanceMarginValue) / size);
      } else {
        return entryPrice + ((initialMargin - maintenanceMarginValue) / size);
      }
    }
  
    static calculatePnL(entryPrice, currentPrice, size, side) {
      if (side === 'LONG') {
        return (currentPrice - entryPrice) * size;
      } else {
        return (entryPrice - currentPrice) * size;
      }
    }
  
    static calculatePnLPercentage(entryPrice, currentPrice, side) {
      const priceChange = side === 'LONG' 
        ? (currentPrice - entryPrice) / entryPrice
        : (entryPrice - currentPrice) / entryPrice;
      
      return priceChange * 100;
    }
  
    static calculateRequiredMargin(notionalValue, leverage) {
      return notionalValue / leverage;
    }
  
    static calculateMarginRatio(equity, maintenanceMargin) {
      if (equity <= 0) return 1;
      return maintenanceMargin / equity;
    }
  
    static calculateFundingPayment(notionalValue, fundingRate) {
      return notionalValue * fundingRate;
    }
  
    static estimateLiquidationDistance(currentPrice, liquidationPrice) {
      return Math.abs((liquidationPrice - currentPrice) / currentPrice) * 100;
    }
  }
  
  module.exports = PositionCalculator;