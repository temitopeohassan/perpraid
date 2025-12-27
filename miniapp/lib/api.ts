

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://perpraid-api.vercel.app';

export interface ApiError {
  error: string;
  message: string;
}

class ApiClient {
  private baseUrl: string;
  private walletAddress: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.walletAddress = localStorage.getItem('wallet_address');
    }
  }

  setWalletAddress(address: string) {
    this.walletAddress = address;
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet_address', address);
    }
  }

  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.walletAddress) {
      headers['x-wallet-address'] = this.walletAddress;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'Request failed',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || error.error);
    }

    return response.json();
  }

  async getMarkets() {
    return this.request<Array<{
      market: string;
      base_asset: string;
      quote_asset: string;
      min_order_size: number;
      max_leverage: number;
      tick_size: number;
      step_size: number;
      status: string;
    }>>('/api/markets/list');
  }

  async getMarketData(market: string) {
    return this.request<{
      market: string;
      mark_price: number;
      index_price: number;
      funding_rate: number;
      next_funding_time: string;
      open_interest: number;
      volume_24h: number;
      price_change_24h: number;
      high_24h: number;
      low_24h: number;
    }>(`/api/markets/${market}/data`);
  }

  async getOrderBook(market: string) {
    return this.request<{
      bids: Array<{ price: number; size: number }>;
      asks: Array<{ price: number; size: number }>;
    }>(`/api/markets/${market}/orderbook`);
  }

  async getBalance() {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<{
      wallet_address: string;
      total_balance: number;
      available_balance: number;
      margin_used: number;
      currency: string;
    }>('/api/user/balance');
  }

  async getPositions() {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<Array<{
      position_id: string;
      market: string;
      side: string;
      size: number;
      entry_price: number;
      mark_price: number;
      leverage: number;
      margin_mode: string;
      unrealized_pnl: number;
      realized_pnl: number;
      liquidation_price: number;
      margin_ratio: number;
      opened_at: string;
    }>>('/api/user/positions');
  }

  async getTradeHistory(limit = 50) {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<Array<{
      trade_id: string;
      market: string;
      side: string;
      size: number;
      price: number;
      realized_pnl: number;
      fee: number;
      timestamp: string;
    }>>(`/api/user/history?limit=${limit}`);
  }

  async getRiskMetrics() {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<{
      total_margin_ratio: number;
      maintenance_margin: number;
      liquidation_risk: 'low' | 'medium' | 'high';
      exposure_by_market: Record<string, number>;
      warnings: string[];
    }>('/api/user/risk');
  }

  async getTransactions() {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<Array<{
      tx_hash: string;
      type: 'deposit' | 'withdrawal';
      amount: number;
      status: 'pending' | 'confirmed' | 'failed';
      timestamp: string;
    }>>('/api/user/transactions');
  }

  async placeOrder(orderData: {
    market: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    size: number;
    price?: number;
    leverage: number;
    margin_mode?: 'cross' | 'isolated';
    reduce_only?: boolean;
    post_only?: boolean;
  }) {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<{
      success: boolean;
      order_id: string;
      transaction_hash: string;
      message: string;
    }>('/api/trading/order', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async cancelOrder(orderId: string) {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<{
      success: boolean;
      order_id: string;
      transaction_hash: string;
      message: string;
    }>(`/api/trading/order/${orderId}`, {
      method: 'DELETE',
    });
  }

  async closePosition(positionId: string, type: 'MARKET' | 'LIMIT', size?: number, price?: number) {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<{
      success: boolean;
      position_id: string;
      transaction_hash: string;
      message: string;
    }>('/api/trading/position/close', {
      method: 'POST',
      body: JSON.stringify({ position_id: positionId, type, size, price }),
    });
  }

  async deposit(amount: number) {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<{
      success: boolean;
      amount: number;
      transaction_hash: string;
      message: string;
    }>('/api/trading/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async withdraw(amount: number) {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<{
      success: boolean;
      amount: number;
      transaction_hash: string;
      message: string;
    }>('/api/trading/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async calculateLiquidationPrice(data: {
    market: string;
    side: 'LONG' | 'SHORT';
    size: number;
    entry_price: number;
    leverage: number;
    margin_mode?: 'cross' | 'isolated';
  }) {
    return this.request<{
      market: string;
      side: string;
      liquidation_price: number;
      entry_price: number;
      leverage: number;
      margin_mode: string;
      distance_to_liquidation: number;
    }>('/api/risk/liquidation-price', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async analyzeRisk(data: {
    position_id?: string;
    market?: string;
    size?: number;
    leverage?: number;
  }) {
    if (!this.walletAddress) {
      throw new Error('Wallet address not set');
    }
    return this.request<{
      market: string;
      position_size: number;
      leverage: number;
      notional_value: number;
      required_margin: number;
      account_equity: number;
      margin_usage_percent: number;
      funding_rate: number;
      daily_funding_cost: number;
      risk_score: number;
      recommendations: string[];
    }>('/api/risk/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

