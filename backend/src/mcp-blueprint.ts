export const gatewayBlueprint = {
  mcp_version: "1.1",
  project: {
    name: "Stacks-dYdX Trading Gateway",
    description:
      "A cross-chain trading platform enabling Stacks users to trade derivatives on dYdX via automated bridging and execution.",
    environment: "production",
  },
  chains: {
    source: {
      name: "Stacks",
      asset: "STX",
      type: "bitcoin-layer2",
    },
    destination: {
      name: "dYdX Chain",
      asset: "USDC",
      type: "cosmos-appchain",
    },
  },
  smart_contracts: {
    stacks_vault: {
      network: "Stacks Mainnet",
      contract_id: "SPXXXX.vault",
      language: "Clarity",
      functions: ["deposit", "withdraw", "lock-funds", "release-funds"],
      events: ["deposit", "withdraw", "funds_locked", "funds_released"],
    },
  },
  backend_services: {
    stacks_event_listener: {
      type: "event_listener",
      source: "Stacks API",
      poll_interval_seconds: 10,
      events: ["deposit", "withdraw"],
      provider: "Hiro API",
    },
    bridge_router: {
      type: "cross_chain_router",
      supported_routes: ["STX->BTC->USDC", "STX->ETH->USDC", "STX->sBTC->USDC"],
      providers: ["Rango", "LI.FI", "Squid"],
      responsibilities: [
        "swap_assets",
        "execute_bridge",
        "track_bridge_transactions",
      ],
    },
    dydx_trading_engine: {
      type: "execution_engine",
      provider: "dYdX v4",
      features: ["place_order", "cancel_order", "get_positions", "get_account_balance"],
      markets: ["BTC-USD", "ETH-USD", "SOL-USD"],
    },
    risk_engine: {
      type: "monitoring_service",
      features: ["leverage_limits", "liquidation_monitor", "position_tracking"],
    },
  },
  database: {
    provider: "Firebase Firestore",
    collections: {
      users: {
        fields: ["userId", "stacksAddress", "dydxAddress", "createdAt"],
      },
      deposits: {
        fields: ["depositId", "userId", "amount", "asset", "status", "txHash", "createdAt"],
      },
      bridgeTransactions: {
        fields: [
          "bridgeId",
          "depositId",
          "route",
          "status",
          "sourceChain",
          "destinationChain",
          "txHash",
        ],
      },
      balances: {
        fields: ["userId", "stxBalance", "lockedBalance", "collateralUSDC"],
      },
      trades: {
        fields: [
          "tradeId",
          "orderId",
          "userId",
          "market",
          "side",
          "price",
          "size",
          "status",
          "createdAt",
        ],
      },
      withdrawals: {
        fields: ["withdrawalId", "userId", "amount", "asset", "status", "createdAt"],
      },
    },
  },
  system_flows: {
    deposit_flow: [
      "user_submits_stx_deposit",
      "stacks_vault_emits_deposit_event",
      "event_listener_detects_event",
      "deposit_record_created_in_firestore",
      "bridge_router_executes_swap",
      "usdc_sent_to_dydx_account",
      "user_balance_updated",
    ],
    trade_flow: [
      "user_places_trade",
      "api_server_validates_balance",
      "dydx_trading_engine_places_order",
      "trade_record_saved",
      "positions_updated",
    ],
    withdrawal_flow: [
      "user_requests_withdrawal",
      "positions_closed_on_dydx",
      "usdc_withdrawn",
      "bridge_router_converts_to_stx",
      "stx_sent_to_user_wallet",
    ],
  },
  security: {
    wallet_management: {
      type: "MPC",
      roles: ["hot_wallet", "settlement_wallet", "treasury_wallet"],
    },
    risk_controls: {
      max_leverage: 10,
      withdrawal_delay_seconds: 300,
      rate_limits: {
        orders_per_second: 10,
        withdrawals_per_hour: 5,
      },
    },
  },
  observability: {
    logging: "structured_logs",
    metrics: [
      "deposits_processed",
      "bridges_executed",
      "orders_submitted",
      "withdrawals_completed",
    ],
  },
} as const;

export type SupportedMarket =
  (typeof gatewayBlueprint.backend_services.dydx_trading_engine.markets)[number];

export type SupportedRoute =
  (typeof gatewayBlueprint.backend_services.bridge_router.supported_routes)[number];
