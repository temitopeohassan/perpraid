import { gatewayBlueprint, type SupportedMarket, type SupportedRoute } from "./mcp-blueprint";

export interface UserRecord {
  userId: string;
  stacksAddress: string;
  dydxAddress: string;
  createdAt: string;
}

export interface DepositRecord {
  depositId: string;
  userId: string;
  amount: number;
  asset: "STX";
  status: "detected" | "bridging" | "completed";
  txHash: string;
  createdAt: string;
}

export interface BridgeTransactionRecord {
  bridgeId: string;
  depositId: string | null;
  route: SupportedRoute;
  status: "pending" | "completed";
  sourceChain: "Stacks";
  destinationChain: "dYdX Chain";
  txHash: string;
  createdAt: string;
}

export interface BalanceRecord {
  userId: string;
  stxBalance: number;
  lockedBalance: number;
  collateralUSDC: number;
}

export interface TradeRecord {
  tradeId: string;
  orderId: string;
  userId: string;
  market: SupportedMarket;
  side: "buy" | "sell";
  price: number;
  size: number;
  leverage: number;
  status: "filled" | "cancelled";
  createdAt: string;
}

export interface WithdrawalRecord {
  withdrawalId: string;
  userId: string;
  amount: number;
  asset: "STX";
  status: "completed";
  createdAt: string;
}

export interface PositionRecord {
  positionId: string;
  userId: string;
  market: SupportedMarket;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  marginUsed: number;
  openedAt: string;
}

export interface EventLogRecord {
  id: string;
  type: "deposit" | "trade" | "withdrawal";
  message: string;
  createdAt: string;
}

const now = () => new Date().toISOString();
const hash = (suffix: string) => `0x${suffix.padEnd(12, "0")}${Date.now().toString(16)}`;

export const marketSnapshots: Record<
  SupportedMarket,
  { markPrice: number; fundingRate: number; volume24h: number; openInterest: number; dailyChange: number }
> = {
  "BTC-USD": {
    markPrice: 68250,
    fundingRate: 0.012,
    volume24h: 24_800_000,
    openInterest: 12_400_000,
    dailyChange: 2.8,
  },
  "ETH-USD": {
    markPrice: 3625,
    fundingRate: 0.01,
    volume24h: 15_100_000,
    openInterest: 9_500_000,
    dailyChange: 1.9,
  },
  "SOL-USD": {
    markPrice: 165,
    fundingRate: 0.022,
    volume24h: 8_600_000,
    openInterest: 4_200_000,
    dailyChange: 4.7,
  },
};

export const store: {
  users: UserRecord[];
  balances: BalanceRecord[];
  deposits: DepositRecord[];
  bridgeTransactions: BridgeTransactionRecord[];
  trades: TradeRecord[];
  withdrawals: WithdrawalRecord[];
  positions: PositionRecord[];
  eventLogs: EventLogRecord[];
} = {
  users: [
    {
      userId: "user_001",
      stacksAddress: "SP2C2HF0EXAMPLESTACKS001",
      dydxAddress: "dydx1q8p9user001gateway",
      createdAt: "2026-03-01T09:00:00.000Z",
    },
    {
      userId: "user_002",
      stacksAddress: "SP38T3TEXAMPLESTACKS002",
      dydxAddress: "dydx1m4ruser002gateway",
      createdAt: "2026-03-04T15:45:00.000Z",
    },
  ],
  balances: [
    {
      userId: "user_001",
      stxBalance: 640,
      lockedBalance: 95,
      collateralUSDC: 1175,
    },
    {
      userId: "user_002",
      stxBalance: 380,
      lockedBalance: 40,
      collateralUSDC: 525,
    },
  ],
  deposits: [
    {
      depositId: "dep_seed_001",
      userId: "user_001",
      amount: 95,
      asset: "STX",
      status: "completed",
      txHash: hash("depa1"),
      createdAt: "2026-03-08T11:20:00.000Z",
    },
  ],
  bridgeTransactions: [
    {
      bridgeId: "bridge_seed_001",
      depositId: "dep_seed_001",
      route: "STX->sBTC->USDC",
      status: "completed",
      sourceChain: "Stacks",
      destinationChain: "dYdX Chain",
      txHash: hash("bri1"),
      createdAt: "2026-03-08T11:21:00.000Z",
    },
  ],
  trades: [
    {
      tradeId: "trade_seed_001",
      orderId: "order_seed_001",
      userId: "user_001",
      market: "BTC-USD",
      side: "buy",
      price: 67980,
      size: 0.03,
      leverage: 4,
      status: "filled",
      createdAt: "2026-03-09T13:12:00.000Z",
    },
  ],
  withdrawals: [] as WithdrawalRecord[],
  positions: [
    {
      positionId: "pos_seed_001",
      userId: "user_001",
      market: "BTC-USD",
      side: "long",
      size: 0.03,
      entryPrice: 67980,
      markPrice: marketSnapshots["BTC-USD"].markPrice,
      leverage: 4,
      marginUsed: (67980 * 0.03) / 4,
      openedAt: "2026-03-09T13:12:00.000Z",
    },
  ],
  eventLogs: [
    {
      id: "evt_seed_001",
      type: "deposit",
      message: "Stacks vault deposit detected by Hiro listener and bridged over STX->sBTC->USDC.",
      createdAt: "2026-03-08T11:21:00.000Z",
    },
    {
      id: "evt_seed_002",
      type: "trade",
      message: "dYdX execution engine placed BTC-USD order for user_001 and opened a long position.",
      createdAt: "2026-03-09T13:12:00.000Z",
    },
  ],
};

export const marketList = gatewayBlueprint.backend_services.dydx_trading_engine.markets;
export const routeList = gatewayBlueprint.backend_services.bridge_router.supported_routes;

export function getUser(userId: string): UserRecord {
  const user = store.users.find((item) => item.userId === userId);
  if (!user) {
    throw new Error(`Unknown user: ${userId}`);
  }
  return user;
}

export function getBalance(userId: string): BalanceRecord {
  const balance = store.balances.find((item) => item.userId === userId);
  if (!balance) {
    throw new Error(`Missing balance for user: ${userId}`);
  }
  return balance;
}

export function logEvent(type: EventLogRecord["type"], message: string): void {
  store.eventLogs.unshift({
    id: `evt_${store.eventLogs.length + 1}`,
    type,
    message,
    createdAt: now(),
  });
}

export function createTxHash(prefix: string): string {
  return hash(prefix);
}

export function isoNow(): string {
  return now();
}
