const { IndexerClient, CompositeClient, ValidatorClient, Network } = require('@dydxprotocol/v4-client-js');

class DYDXClient {
  constructor() {
    this.network = process.env.DYDX_NETWORK === 'mainnet' ? Network.mainnet() : Network.testnet();
    this.indexerClient = null;
    this.compositeClient = null;
    this.validatorClient = null;
  }

  async initialize() {
    try {
      // Initialize Indexer Client (for reading data)
      this.indexerClient = new IndexerClient(this.network.indexerConfig);
      
      // Initialize Composite Client (for trading operations)
      this.compositeClient = await CompositeClient.connect(this.network);
      
      // Initialize Validator Client (for on-chain operations)
      this.validatorClient = await ValidatorClient.connect(this.network.validatorConfig);
      
      console.log('dYdX clients initialized successfully');
      return true;
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
}

const dydxClient = new DYDXClient();
module.exports = dydxClient;