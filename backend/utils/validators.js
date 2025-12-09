const validateOrderParams = (order) => {
    const errors = [];
  
    if (!order.market || typeof order.market !== 'string') {
      errors.push('Valid market symbol required');
    }
  
    if (!['BUY', 'SELL'].includes(order.side)) {
      errors.push('Side must be BUY or SELL');
    }
  
    if (!['MARKET', 'LIMIT'].includes(order.type)) {
      errors.push('Type must be MARKET or LIMIT');
    }
  
    if (typeof order.size !== 'number' || order.size <= 0) {
      errors.push('Size must be a positive number');
    }
  
    if (order.type === 'LIMIT' && (typeof order.price !== 'number' || order.price <= 0)) {
      errors.push('Price required for LIMIT orders');
    }
  
    if (typeof order.leverage !== 'number' || order.leverage < 1 || order.leverage > 20) {
      errors.push('Leverage must be between 1 and 20');
    }
  
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  const validateAddress = (address) => {
    if (!address || typeof address !== 'string') {
      return false;
    }
    
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
  
  const sanitizeMarketSymbol = (symbol) => {
    if (!symbol) return null;
    return symbol.toUpperCase().trim();
  };
  
  module.exports = {
    validateOrderParams,
    validateAddress,
    sanitizeMarketSymbol
  };
  