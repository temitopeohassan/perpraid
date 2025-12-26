const { IndexerClient, CompositeClient, ValidatorClient, Network } = require('@dydxprotocol/v4-client-js');

class DYDXClient {
  constructor() {
    this.network = process.env.DYDX_NETWORK === 'mainnet' ? Network.mainnet() : Network.testnet();
    this.indexerClient = null;
    this.compositeClient = null;
    this.validatorClient = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize Indexer Client (for reading data) - this is usually more reliable
      this.indexerClient = new IndexerClient(this.network.indexerConfig);
      
      // Try to initialize Composite Client (for trading operations)
      // This may fail due to network issues, but we can still use indexer
      try {
        this.compositeClient = await CompositeClient.connect(this.network);
      } catch (compositeError) {
        console.warn('Composite client initialization failed (trading features unavailable):', compositeError.message);
      }
      
      // Try to initialize Validator Client (for on-chain operations)
      // This may also fail, but indexer should still work
      try {
        this.validatorClient = await ValidatorClient.connect(this.network.validatorConfig);
      } catch (validatorError) {
        console.warn('Validator client initialization failed (on-chain features unavailable):', validatorError.message);
      }
      
      // Mark as initialized if at least indexer is working
      if (this.indexerClient) {
        this.initialized = true;
        console.log('dYdX clients initialized successfully');
        return true;
      } else {
        throw new Error('Failed to initialize any dYdX clients');
      }
    } catch (error) {
      console.error('Failed to initialize dYdX clients:', error);
      throw error;
    }
  }

  getIndexerClient() {
    if (!this.indexerClient) {
      throw new Error('Indexer client not initialized');
    }
    return this.indexerClient;
  }

  getCompositeClient() {
    if (!this.compositeClient) {
      throw new Error('Composite client not initialized');
    }
    return this.compositeClient;
  }

  getValidatorClient() {
    if (!this.validatorClient) {
      throw new Error('Validator client not initialized');
    }
    return this.validatorClient;
  }

  isInitialized() {
    return this.initialized;
  }
}

const dydxClient = new DYDXClient();
module.exports = dydxClient;