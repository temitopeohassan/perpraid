const { CompositeClient, Network, Order_Side, Order_TimeInForce, OrderType, Asset, SubaccountId, AssetId } = require('@dydxprotocol/v4-client-js');
const dydxClient = require('../config/dydx');
const { ethers } = require('ethers');

/**
 * dYdX Service Layer
 * Wraps all dYdX Node Client private API methods
 */
class DydxService {
  constructor() {
    this.compositeClient = null;
    this.indexerClient = null;
  }

  /**
   * Initialize the service with a wallet
   */
  async initialize(walletAddress, privateKey) {
    if (!dydxClient.isInitialized()) {
      await dydxClient.initialize();
    }

    try {
      this.compositeClient = dydxClient.getCompositeClient();
      this.indexerClient = dydxClient.getIndexerClient();
      this.validatorClient = dydxClient.getValidatorClient();
    } catch (error) {
      // If composite client is not available, we still try to work with what we have
      this.indexerClient = dydxClient.getIndexerClient();
    }

    // Create wallet from private key
    this.wallet = new ethers.Wallet(privateKey);
    this.walletAddress = walletAddress;
    
    return true;
  }

  /**
   * Get composite client (requires wallet initialization)
   */
  getCompositeClient() {
    if (!this.compositeClient) {
      throw new Error('Service not initialized with wallet');
    }
    return this.compositeClient;
  }

  /**
   * Get indexer client
   */
  getIndexerClient() {
    return this.indexerClient || dydxClient.getIndexerClient();
  }

  /**
   * Place Order
   */
  async placeOrder(params) {
    const { market, side, type, size, price, timeInForce, reduceOnly, postOnly, clientId, subaccountNumber = 0 } = params;
    
    const orderParams = {
      market,
      side: side === 'BUY' ? Order_Side.SIDE_BUY : Order_Side.SIDE_SELL,
      type: type === 'MARKET' ? OrderType.MARKET : OrderType.LIMIT,
      size: size.toString(),
      price: price ? price.toString() : undefined,
      timeInForce: timeInForce || (postOnly ? Order_TimeInForce.POST_ONLY : Order_TimeInForce.GTT),
      reduceOnly: reduceOnly || false,
      postOnly: postOnly || false,
      clientId: clientId || Date.now().toString()
    };

    const tx = await this.compositeClient.placeOrder(
      this.walletAddress,
      subaccountNumber,
      orderParams
    );

    return {
      clientId: orderParams.clientId,
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Cancel Order
   */
  async cancelOrder(orderId, subaccountNumber = 0) {
    const tx = await this.compositeClient.cancelOrder(
      this.walletAddress,
      subaccountNumber,
      orderId
    );

    return {
      orderId,
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Batch Cancel Orders
   */
  async batchCancelOrders(orderIds, subaccountNumber = 0) {
    // Cancel orders one by one if batch cancel is not available
    const results = [];
    for (const orderId of orderIds) {
      try {
        const result = await this.cancelOrder(orderId, subaccountNumber);
        results.push({ orderId, success: true, transactionHash: result.transactionHash });
      } catch (error) {
        results.push({ orderId, success: false, error: error.message });
      }
    }

    return {
      orderIds,
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  }

  /**
   * Deposit
   */
  async deposit(amount, assetId = AssetId.USDC, subaccountNumber = 0) {
    // Convert amount to quantums (USDC has 6 decimals)
    const quantums = BigInt(Math.floor(amount * 1e6));
    
    const tx = await this.compositeClient.depositToSubaccount(
      this.walletAddress,
      subaccountNumber,
      quantums,
      assetId
    );

    return {
      amount,
      quantums: quantums.toString(),
      assetId,
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Withdraw
   */
  async withdraw(amount, recipientAddress, assetId = AssetId.USDC, subaccountNumber = 0) {
    // Convert amount to quantums
    const quantums = BigInt(Math.floor(amount * 1e6));
    
    const tx = await this.compositeClient.withdrawFromSubaccount(
      this.walletAddress,
      subaccountNumber,
      recipientAddress,
      quantums,
      assetId
    );

    return {
      amount,
      quantums: quantums.toString(),
      recipientAddress,
      assetId,
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Transfer (between subaccounts)
   */
  async transfer(params) {
    const { recipientSubaccount, assetId = AssetId.USDC, amount, senderSubaccountNumber = 0, recipientSubaccountNumber = 0 } = params;
    
    // Convert amount to quantums
    const quantums = BigInt(Math.floor(amount * 1e6));
    
    const tx = await this.compositeClient.transfer(
      this.walletAddress,
      senderSubaccountNumber,
      recipientSubaccount,
      recipientSubaccountNumber,
      quantums,
      assetId
    );

    return {
      amount,
      quantums: quantums.toString(),
      recipientSubaccount,
      assetId,
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Send Token
   */
  async sendToken(params) {
    const { recipientAddress, assetId = AssetId.USDC, amount, subaccountNumber = 0 } = params;
    
    // Convert amount to quantums
    const quantums = BigInt(Math.floor(amount * 1e6));
    
    const tx = await this.compositeClient.sendToken(
      this.walletAddress,
      subaccountNumber,
      recipientAddress,
      quantums,
      assetId
    );

    return {
      amount,
      quantums: quantums.toString(),
      recipientAddress,
      assetId,
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Simulate Transaction
   */
  async simulate(transaction) {
    // Use validator client for simulation
    if (!this.validatorClient) {
      throw new Error('Validator client not available for simulation');
    }

    // Simulate the transaction
    // Note: The exact API may vary - this is a placeholder for the actual implementation
    try {
      const result = await this.validatorClient.post.simulate(transaction);
      return result;
    } catch (error) {
      // If simulate is not available via validator client, return transaction details
      return {
        transaction,
        note: 'Simulation endpoint may need adjustment based on actual dYdX v4 API'
      };
    }
  }

  /**
   * Create Transaction (unsigned)
   */
  async createTransaction(params) {
    // This creates an unsigned transaction that can be signed later
    // The exact implementation depends on the transaction type
    const { type, ...txParams } = params;
    
    let unsignedTx;
    
    switch (type) {
      case 'PLACE_ORDER':
        unsignedTx = await this.compositeClient.placeOrder(
          this.walletAddress,
          txParams.subaccountNumber || 0,
          txParams.orderParams,
          { unsigned: true }
        );
        break;
      case 'CANCEL_ORDER':
        unsignedTx = await this.compositeClient.cancelOrder(
          this.walletAddress,
          txParams.subaccountNumber || 0,
          txParams.orderId,
          { unsigned: true }
        );
        break;
      case 'DEPOSIT':
        unsignedTx = await this.compositeClient.depositToSubaccount(
          this.walletAddress,
          txParams.subaccountNumber || 0,
          txParams.quantums,
          txParams.assetId,
          { unsigned: true }
        );
        break;
      case 'WITHDRAW':
        unsignedTx = await this.compositeClient.withdrawFromSubaccount(
          this.walletAddress,
          txParams.subaccountNumber || 0,
          txParams.recipientAddress,
          txParams.quantums,
          txParams.assetId,
          { unsigned: true }
        );
        break;
      default:
        throw new Error(`Unsupported transaction type: ${type}`);
    }

    return unsignedTx;
  }

  /**
   * Broadcast Transaction
   */
  async broadcastTransaction(signedTransaction) {
    if (!this.validatorClient) {
      throw new Error('Validator client not available for broadcasting');
    }

    try {
      const result = await this.validatorClient.post.broadcastTx(signedTransaction);
      return {
        transactionHash: result.txhash || result.hash || signedTransaction.hash,
        result
      };
    } catch (error) {
      // If broadcastTx has different signature, try alternative
      throw new Error(`Failed to broadcast transaction: ${error.message}`);
    }
  }

  /**
   * Create Market Permissionless
   */
  async createMarketPermissionless(params) {
    const { ticker, minPriceChangePpm, minExchanges, exchangeConfigJson } = params;
    
    // This may need to use validator client directly
    if (!this.validatorClient) {
      throw new Error('Validator client required for creating markets');
    }

    // Use validator client for market creation
    // Note: The exact API may vary - this is a placeholder
    try {
      const tx = await this.validatorClient.post.createPerpetualMarket(
        this.walletAddress,
        ticker,
        minPriceChangePpm,
        minExchanges,
        exchangeConfigJson
      );

      return {
        ticker,
        transactionHash: tx.hash || tx.txhash,
        tx
      };
    } catch (error) {
      throw new Error(`Failed to create market: ${error.message}`);
    }
  }

  /**
   * Delegate
   */
  async delegate(validatorAddress, amount, subaccountNumber = 0) {
    // Convert amount to quantums
    const quantums = BigInt(Math.floor(amount * 1e6));
    
    const tx = await this.compositeClient.delegate(
      this.walletAddress,
      subaccountNumber,
      validatorAddress,
      quantums
    );

    return {
      validatorAddress,
      amount,
      quantums: quantums.toString(),
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Undelegate
   */
  async undelegate(validatorAddress, amount, subaccountNumber = 0) {
    // Convert amount to quantums
    const quantums = BigInt(Math.floor(amount * 1e6));
    
    const tx = await this.compositeClient.undelegate(
      this.walletAddress,
      subaccountNumber,
      validatorAddress,
      quantums
    );

    return {
      validatorAddress,
      amount,
      quantums: quantums.toString(),
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Register Affiliate
   */
  async registerAffiliate(affiliateAddress, rate, subaccountNumber = 0) {
    // This may need to use validator client directly
    if (!this.validatorClient) {
      throw new Error('Validator client required for affiliate registration');
    }

    try {
      const tx = await this.validatorClient.post.registerAffiliate(
        this.walletAddress,
        subaccountNumber,
        affiliateAddress,
        rate
      );

      return {
        affiliateAddress,
        rate,
        transactionHash: tx.hash || tx.txhash,
        tx
      };
    } catch (error) {
      throw new Error(`Failed to register affiliate: ${error.message}`);
    }
  }

  /**
   * Withdraw Delegator Reward
   */
  async withdrawDelegatorReward(validatorAddress, subaccountNumber = 0) {
    const tx = await this.compositeClient.withdrawDelegatorReward(
      this.walletAddress,
      subaccountNumber,
      validatorAddress
    );

    return {
      validatorAddress,
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Close Position
   */
  async closePosition(params) {
    const { market, size, price, type = 'MARKET', subaccountNumber = 0 } = params;
    
    // Get current position to determine side
    const positions = await this.indexerClient.account.getSubaccountPerpetualPositions(
      this.walletAddress,
      subaccountNumber
    );
    
    const position = positions.positions?.find(p => p.market === market);
    if (!position) {
      throw new Error(`No open position found for market: ${market}`);
    }

    const positionSize = parseFloat(position.size || 0);
    const closeSide = positionSize > 0 ? 'SELL' : 'BUY';
    const closeSize = size || Math.abs(positionSize);

    const orderParams = {
      market,
      side: closeSide === 'BUY' ? Order_Side.SIDE_BUY : Order_Side.SIDE_SELL,
      type: type === 'MARKET' ? OrderType.MARKET : OrderType.LIMIT,
      size: closeSize.toString(),
      price: price ? price.toString() : undefined,
      reduceOnly: true,
      clientId: Date.now().toString()
    };

    const tx = await this.compositeClient.placeOrder(
      this.walletAddress,
      subaccountNumber,
      orderParams
    );

    return {
      market,
      side: closeSide,
      size: closeSize,
      transactionHash: tx.hash,
      tx
    };
  }

  /**
   * Deposit to MegaVault
   */
  async depositToMegaVault(amount, subaccountNumber = 0) {
    // Convert amount to quantums
    const quantums = BigInt(Math.floor(amount * 1e6));
    
    // Use validator client for vault operations
    if (!this.validatorClient) {
      throw new Error('Validator client required for vault operations');
    }

    try {
      const tx = await this.validatorClient.post.depositToVault(
        this.walletAddress,
        subaccountNumber,
        quantums
      );

      return {
        amount,
        quantums: quantums.toString(),
        transactionHash: tx.hash || tx.txhash,
        tx
      };
    } catch (error) {
      throw new Error(`Failed to deposit to MegaVault: ${error.message}`);
    }
  }

  /**
   * Withdraw from MegaVault
   */
  async withdrawFromMegaVault(amount, subaccountNumber = 0) {
    // Convert amount to quantums
    const quantums = BigInt(Math.floor(amount * 1e6));
    
    // Use validator client for vault operations
    if (!this.validatorClient) {
      throw new Error('Validator client required for vault operations');
    }

    try {
      const tx = await this.validatorClient.post.withdrawFromVault(
        this.walletAddress,
        subaccountNumber,
        quantums
      );

      return {
        amount,
        quantums: quantums.toString(),
        transactionHash: tx.hash || tx.txhash,
        tx
      };
    } catch (error) {
      throw new Error(`Failed to withdraw from MegaVault: ${error.message}`);
    }
  }

  /**
   * Get Owner Shares in MegaVault
   */
  async getOwnerSharesInMegaVault(ownerAddress) {
    const indexer = this.getIndexerClient();
    const result = await indexer.account.getVaultShareBalances(ownerAddress);

    return {
      ownerAddress,
      shares: result.shares || {},
      totalShares: result.totalShares || '0'
    };
  }

  /**
   * Get Withdrawal Info of MegaVault
   */
  async getWithdrawalInfoOfMegaVault(minAmount, limit = 100) {
    const indexer = this.getIndexerClient();
    const result = await indexer.account.getVaultWithdrawalInfo(minAmount, limit);

    return {
      withdrawals: result.withdrawals || [],
      totalCount: result.totalCount || 0
    };
  }
}

module.exports = DydxService;

