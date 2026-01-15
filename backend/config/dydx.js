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
      const networkType = process.env.DYDX_NETWORK || 'testnet';
      console.log(`Initializing dYdX clients for network: ${networkType}`);
      
      // Log network endpoints for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Network config:', {
          indexer: this.network.indexerConfig?.restEndpoint || 'N/A',
          validator: this.network.validatorConfig?.restEndpoint || 'N/A',
          chainId: this.network.chainId || 'N/A'
        });
      }
      
      // Initialize Indexer Client (for reading data) - this is usually more reliable
      try {
        this.indexerClient = new IndexerClient(this.network.indexerConfig);
        console.log('✓ Indexer client initialized');
      } catch (indexerError) {
        console.error('✗ Failed to initialize Indexer client:', indexerError.message);
        throw indexerError;
      }
      
      // Try to initialize Composite Client (for trading operations)
      // This may fail due to network issues, but we can still use indexer
      // Note: CompositeClient.connect() fetches chain info from validator endpoints
      try {
        console.log('Attempting to connect Composite client...');
        this.compositeClient = await Promise.race([
          CompositeClient.connect(this.network),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
          )
        ]);
        console.log('✓ Composite client initialized');
      } catch (compositeError) {
        const errorMsg = compositeError.message || compositeError.toString();
        const errorDetails = compositeError.cause ? ` (cause: ${compositeError.cause.message})` : '';
        console.warn(`⚠ Composite client initialization failed (trading features unavailable): ${errorMsg}${errorDetails}`);
        console.warn('  Note: This is usually due to network connectivity issues or validator endpoints being unreachable.');
        console.warn('  The server will continue to run with read-only features via the Indexer client.');
        if (compositeError.stack && process.env.NODE_ENV === 'development') {
          console.debug('Composite client error stack:', compositeError.stack);
        }
      }
      
      // Try to initialize Validator Client (for on-chain operations)
      // This may also fail, but indexer should still work
      // Note: ValidatorClient.connect() connects to validator RPC endpoints
      try {
        console.log('Attempting to connect Validator client...');
        if (!this.network.validatorConfig) {
          throw new Error('Validator config not available for this network');
        }
        this.validatorClient = await Promise.race([
          ValidatorClient.connect(this.network.validatorConfig),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
          )
        ]);
        console.log('✓ Validator client initialized');
      } catch (validatorError) {
        const errorMsg = validatorError.message || validatorError.toString();
        const errorDetails = validatorError.cause ? ` (cause: ${validatorError.cause.message})` : '';
        console.warn(`⚠ Validator client initialization failed (on-chain features unavailable): ${errorMsg}${errorDetails}`);
        console.warn('  Note: This is usually due to network connectivity issues or validator RPC endpoints being unreachable.');
        console.warn('  The server will continue to run with read-only features via the Indexer client.');
        if (validatorError.stack && process.env.NODE_ENV === 'development') {
          console.debug('Validator client error stack:', validatorError.stack);
        }
      }
      
      // Mark as initialized if at least indexer is working
      if (this.indexerClient) {
        this.initialized = true;
        const availableClients = [
          this.indexerClient && 'Indexer',
          this.compositeClient && 'Composite',
          this.validatorClient && 'Validator'
        ].filter(Boolean).join(', ');
        console.log(`✓ dYdX clients initialized successfully (${availableClients})`);
        return true;
      } else {
        throw new Error('Failed to initialize any dYdX clients');
      }
    } catch (error) {
      console.error('✗ Failed to initialize dYdX clients:', error.message);
      if (error.stack && process.env.NODE_ENV === 'development') {
        console.error('Error stack:', error.stack);
      }
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