export interface OverviewResponse {
  blueprint: {
    project: {
      name: string;
      description: string;
      environment: string;
    };
    chains: {
      source: {
        name: string;
        asset: string;
        type: string;
      };
      destination: {
        name: string;
        asset: string;
        type: string;
      };
    };
    smart_contracts: {
      stacks_vault: {
        network: string;
        contract_id: string;
        language: string;
        functions: string[];
        events: string[];
      };
    };
    backend_services: {
      bridge_router: {
        supported_routes: string[];
        providers: string[];
        responsibilities: string[];
      };
      dydx_trading_engine: {
        markets: string[];
      };
    };
    database: {
      provider: string;
      collections: Record<string, { fields: string[] }>;
    };
    system_flows: Record<string, string[]>;
    security: {
      wallet_management: {
        type: string;
        roles: string[];
      };
      risk_controls: {
        max_leverage: number;
        withdrawal_delay_seconds: number;
        rate_limits: {
          orders_per_second: number;
          withdrawals_per_hour: number;
        };
      };
    };
    observability: {
      logging: string;
      metrics: string[];
    };
  };
  summary: {
    users: number;
    depositsProcessed: number;
    bridgesExecuted: number;
    ordersSubmitted: number;
    withdrawalsCompleted: number;
  };
  services: {
    eventListener: {
      source: string;
      provider: string;
      poll_interval_seconds: number;
      status: string;
    };
    bridgeRouter: {
      providers: string[];
      supported_routes: string[];
      responsibilities: string[];
      status: string;
    };
    tradingEngine: {
      provider: string;
      markets: string[];
      features: string[];
      status: string;
    };
    riskEngine: {
      features: string[];
      status: string;
      controls: {
        max_leverage: number;
        withdrawal_delay_seconds: number;
        rate_limits: {
          orders_per_second: number;
          withdrawals_per_hour: number;
        };
      };
    };
  };
  collections: Record<string, { fields: string[] }>;
  recentEvents: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
}

export interface MarketResponse {
  market: string;
  markPrice: number;
  fundingRate: number;
  volume24h: number;
  openInterest: number;
  dailyChange: number;
  maxLeverage: number;
}

export interface UserSummary {
  userId: string;
  stacksAddress: string;
  dydxAddress: string;
  createdAt: string;
  balances: {
    stxBalance: number;
    lockedBalance: number;
    collateralUSDC: number;
  };
}

export interface DashboardResponse {
  user: {
    userId: string;
    stacksAddress: string;
    dydxAddress: string;
    createdAt: string;
  };
  balance: {
    stxBalance: number;
    lockedBalance: number;
    collateralUSDC: number;
    availableCollateral: number;
  };
  positions: Array<{
    positionId: string;
    market: string;
    side: string;
    size: number;
    entryPrice: number;
    markPrice: number;
    leverage: number;
    marginUsed: number;
    unrealizedPnl: number;
    openedAt: string;
  }>;
  trades: Array<{
    tradeId: string;
    orderId: string;
    market: string;
    side: string;
    price: number;
    size: number;
    leverage: number;
    status: string;
    createdAt: string;
  }>;
  deposits: Array<{
    depositId: string;
    amount: number;
    status: string;
    txHash: string;
    createdAt: string;
  }>;
  withdrawals: Array<{
    withdrawalId: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  bridgeTransactions: Array<{
    bridgeId: string;
    route: string;
    status: string;
    txHash: string;
    createdAt: string;
  }>;
  risk: {
    maxLeverage: number;
    availableCollateral: number;
    usedMargin: number;
    marginRatio: number;
    liquidationMonitor: string;
    warnings: string[];
  };
}
