const WebSocket = require('ws');

class DYDXWebSocketService {
  constructor() {
    this.ws = null;
    this.subscriptions = new Map();
    this.reconnectInterval = 5000;
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
  }

  connect() {
    const wsUrl = process.env.DYDX_NETWORK === 'mainnet'
      ? 'wss://indexer.dydx.trade/v4/ws'
      : 'wss://indexer.v4testnet.dydx.exchange/v4/ws';

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('WebSocket connected to dYdX');
      this.reconnectAttempts = 0;
      this.resubscribeAll();
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    });
  }

  subscribe(channel, market, callback) {
    const subscriptionId = `${channel}:${market}`;
    
    if (!this.subscriptions.has(subscriptionId)) {
      this.subscriptions.set(subscriptionId, new Set());
    }
    
    this.subscriptions.get(subscriptionId).add(callback);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendSubscription(channel, market);
    }
  }

  sendSubscription(channel, market) {
    const message = {
      type: 'subscribe',
      channel,
      id: market
    };

    this.ws.send(JSON.stringify(message));
  }

  resubscribeAll() {
    for (const [subscriptionId] of this.subscriptions) {
      const [channel, market] = subscriptionId.split(':');
      this.sendSubscription(channel, market);
    }
  }

  handleMessage(message) {
    const subscriptionId = `${message.channel}:${message.id}`;
    const callbacks = this.subscriptions.get(subscriptionId);

    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(message.contents);
        } catch (error) {
          console.error('Callback error:', error);
        }
      });
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

module.exports = new DYDXWebSocketService();