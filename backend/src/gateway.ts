import { randomUUID } from "node:crypto";
import { z } from "zod";

import { gatewayBlueprint, type SupportedMarket, type SupportedRoute } from "./mcp-blueprint";
import {
  createTxHash,
  getBalance,
  getUser,
  isoNow,
  logEvent,
  marketList,
  marketSnapshots,
  routeList,
  store,
  type PositionRecord,
  type TradeRecord,
} from "./store";

const stxToUsdcRate = 2.35;

export const depositSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  route: z.enum(routeList),
});

export const tradeSchema = z.object({
  userId: z.string().min(1),
  market: z.enum(marketList),
  side: z.enum(["buy", "sell"]),
  size: z.number().positive(),
  leverage: z.number().positive(),
});

export const withdrawalSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive(),
  route: z.enum(routeList),
});

function getOpenPositions(userId: string): PositionRecord[] {
  return store.positions.filter((item) => item.userId === userId);
}

function getTrades(userId: string): TradeRecord[] {
  return store.trades
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getUsedMargin(userId: string): number {
  return getOpenPositions(userId).reduce((total, position) => total + position.marginUsed, 0);
}

function getAvailableCollateral(userId: string): number {
  const balance = getBalance(userId);
  return Math.max(balance.collateralUSDC - getUsedMargin(userId), 0);
}

function calculatePositionPnl(position: PositionRecord): number {
  const direction = position.side === "long" ? 1 : -1;
  return (position.markPrice - position.entryPrice) * position.size * direction;
}

function buildRiskSummary(userId: string) {
  const balance = getBalance(userId);
  const positions = getOpenPositions(userId);
  const usedMargin = getUsedMargin(userId);
  const effectiveCollateral = balance.collateralUSDC + positions.reduce((sum, item) => sum + calculatePositionPnl(item), 0);
  const marginRatio = usedMargin === 0 ? 0 : Number((effectiveCollateral / usedMargin).toFixed(2));
  const warnings: string[] = [];

  if (positions.some((item) => item.leverage >= gatewayBlueprint.security.risk_controls.max_leverage - 2)) {
    warnings.push("One or more positions are approaching the configured leverage ceiling.");
  }

  if (getAvailableCollateral(userId) < 150) {
    warnings.push("Available collateral is low; new orders may fail risk validation.");
  }

  if (marginRatio > 0 && marginRatio < 2) {
    warnings.push("Margin ratio is trending toward the liquidation watch threshold.");
  }

  return {
    maxLeverage: gatewayBlueprint.security.risk_controls.max_leverage,
    availableCollateral: Number(getAvailableCollateral(userId).toFixed(2)),
    usedMargin: Number(usedMargin.toFixed(2)),
    marginRatio,
    liquidationMonitor: marginRatio === 0 ? "idle" : marginRatio < 1.5 ? "elevated" : "healthy",
    warnings,
  };
}

function ensureRoute(route: SupportedRoute): SupportedRoute {
  if (!routeList.includes(route)) {
    throw new Error(`Unsupported bridge route: ${route}`);
  }
  return route;
}

function ensureMarket(market: SupportedMarket): SupportedMarket {
  if (!marketList.includes(market)) {
    throw new Error(`Unsupported market: ${market}`);
  }
  return market;
}

export function listUsers() {
  return store.users.map((user) => ({
    ...user,
    balances: getBalance(user.userId),
  }));
}

export function getOverview() {
  return {
    blueprint: gatewayBlueprint,
    summary: {
      users: store.users.length,
      depositsProcessed: store.deposits.length,
      bridgesExecuted: store.bridgeTransactions.length,
      ordersSubmitted: store.trades.length,
      withdrawalsCompleted: store.withdrawals.length,
    },
    services: {
      eventListener: {
        ...gatewayBlueprint.backend_services.stacks_event_listener,
        status: "healthy",
        lastPolledAt: isoNow(),
      },
      bridgeRouter: {
        ...gatewayBlueprint.backend_services.bridge_router,
        status: "healthy",
        activeProviders: gatewayBlueprint.backend_services.bridge_router.providers.length,
      },
      tradingEngine: {
        ...gatewayBlueprint.backend_services.dydx_trading_engine,
        status: "healthy",
      },
      riskEngine: {
        ...gatewayBlueprint.backend_services.risk_engine,
        status: "healthy",
        controls: gatewayBlueprint.security.risk_controls,
      },
    },
    collections: gatewayBlueprint.database.collections,
    recentEvents: store.eventLogs.slice(0, 6),
  };
}

export function getMarkets() {
  return marketList.map((market) => ({
    market,
    ...marketSnapshots[market],
    maxLeverage: gatewayBlueprint.security.risk_controls.max_leverage,
  }));
}

export function getUserDashboard(userId: string) {
  const user = getUser(userId);
  const balance = getBalance(userId);
  const positions = getOpenPositions(userId).map((position) => ({
    ...position,
    unrealizedPnl: Number(calculatePositionPnl(position).toFixed(2)),
  }));

  return {
    user,
    balance: {
      ...balance,
      availableCollateral: Number(getAvailableCollateral(userId).toFixed(2)),
    },
    positions,
    trades: getTrades(userId).slice(0, 10),
    deposits: store.deposits.filter((item) => item.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    withdrawals: store.withdrawals
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    bridgeTransactions: store.bridgeTransactions
      .filter((item) => {
        if (!item.depositId) {
          return false;
        }
        const deposit = store.deposits.find((entry) => entry.depositId === item.depositId);
        return deposit?.userId === userId;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    risk: buildRiskSummary(userId),
  };
}

export function getSystemFlows() {
  return Object.entries(gatewayBlueprint.system_flows).map(([name, steps]) => ({
    name,
    steps: steps.map((step, index) => ({
      step,
      order: index + 1,
    })),
  }));
}

export function getBridgeRoutes() {
  return {
    routes: gatewayBlueprint.backend_services.bridge_router.supported_routes.map((route) => ({
      route,
      providers: gatewayBlueprint.backend_services.bridge_router.providers,
      responsibilities: gatewayBlueprint.backend_services.bridge_router.responsibilities,
    })),
  };
}

export function createDeposit(input: z.infer<typeof depositSchema>) {
  const payload = depositSchema.parse(input);
  const user = getUser(payload.userId);
  const balance = getBalance(payload.userId);
  const route = ensureRoute(payload.route);

  if (payload.amount > balance.stxBalance) {
    throw new Error("Insufficient STX balance for the requested deposit.");
  }

  const depositId = `dep_${randomUUID().slice(0, 8)}`;
  const bridgeId = `bridge_${randomUUID().slice(0, 8)}`;
  const createdAt = isoNow();
  const usdcCredited = Number((payload.amount * stxToUsdcRate).toFixed(2));

  balance.stxBalance = Number((balance.stxBalance - payload.amount).toFixed(2));
  balance.lockedBalance = Number((balance.lockedBalance + payload.amount).toFixed(2));
  balance.collateralUSDC = Number((balance.collateralUSDC + usdcCredited).toFixed(2));

  store.deposits.unshift({
    depositId,
    userId: user.userId,
    amount: payload.amount,
    asset: "STX",
    status: "completed",
    txHash: createTxHash("dep"),
    createdAt,
  });

  store.bridgeTransactions.unshift({
    bridgeId,
    depositId,
    route,
    status: "completed",
    sourceChain: "Stacks",
    destinationChain: "dYdX Chain",
    txHash: createTxHash("bridge"),
    createdAt,
  });

  logEvent(
    "deposit",
    `Deposit ${depositId} locked ${payload.amount} STX from ${user.stacksAddress}, routed via ${route}, and credited ${usdcCredited} USDC on dYdX.`,
  );

  return {
    depositId,
    bridgeId,
    creditedUSDC: usdcCredited,
    route,
    balance,
  };
}

export function createTrade(input: z.infer<typeof tradeSchema>) {
  const payload = tradeSchema.parse(input);
  const user = getUser(payload.userId);
  const market = ensureMarket(payload.market);

  if (payload.leverage > gatewayBlueprint.security.risk_controls.max_leverage) {
    throw new Error(
      `Requested leverage exceeds the configured limit of ${gatewayBlueprint.security.risk_controls.max_leverage}x.`,
    );
  }

  const marketSnapshot = marketSnapshots[market];
  const notional = marketSnapshot.markPrice * payload.size;
  const requiredMargin = Number((notional / payload.leverage).toFixed(2));

  if (requiredMargin > getAvailableCollateral(payload.userId)) {
    throw new Error("Insufficient collateral to place this order.");
  }

  const tradeId = `trade_${randomUUID().slice(0, 8)}`;
  const orderId = `order_${randomUUID().slice(0, 8)}`;
  const createdAt = isoNow();

  const tradeRecord: TradeRecord = {
    tradeId,
    orderId,
    userId: user.userId,
    market,
    side: payload.side,
    price: marketSnapshot.markPrice,
    size: payload.size,
    leverage: payload.leverage,
    status: "filled",
    createdAt,
  };

  store.trades.unshift(tradeRecord);
  store.positions.unshift({
    positionId: `pos_${randomUUID().slice(0, 8)}`,
    userId: user.userId,
    market,
    side: payload.side === "buy" ? "long" : "short",
    size: payload.size,
    entryPrice: marketSnapshot.markPrice,
    markPrice: marketSnapshot.markPrice,
    leverage: payload.leverage,
    marginUsed: requiredMargin,
    openedAt: createdAt,
  });

  logEvent(
    "trade",
    `Order ${orderId} routed to dYdX v4 for ${payload.side.toUpperCase()} ${payload.size} ${market} at ${marketSnapshot.markPrice}.`,
  );

  return {
    tradeId,
    orderId,
    requiredMargin,
    executionPrice: marketSnapshot.markPrice,
    risk: buildRiskSummary(user.userId),
  };
}

export function createWithdrawal(input: z.infer<typeof withdrawalSchema>) {
  const payload = withdrawalSchema.parse(input);
  const user = getUser(payload.userId);
  const balance = getBalance(payload.userId);
  const route = ensureRoute(payload.route);
  const requiredUsdc = Number((payload.amount * stxToUsdcRate).toFixed(2));

  if (requiredUsdc > getAvailableCollateral(payload.userId)) {
    throw new Error("Requested withdrawal exceeds available collateral after open positions.");
  }

  const withdrawalId = `wd_${randomUUID().slice(0, 8)}`;
  const createdAt = isoNow();

  balance.collateralUSDC = Number((balance.collateralUSDC - requiredUsdc).toFixed(2));
  balance.lockedBalance = Math.max(Number((balance.lockedBalance - payload.amount).toFixed(2)), 0);
  balance.stxBalance = Number((balance.stxBalance + payload.amount).toFixed(2));

  store.withdrawals.unshift({
    withdrawalId,
    userId: user.userId,
    amount: payload.amount,
    asset: "STX",
    status: "completed",
    createdAt,
  });

  logEvent(
    "withdrawal",
    `Withdrawal ${withdrawalId} closed out ${requiredUsdc} USDC collateral, routed via ${route}, and released ${payload.amount} STX to ${user.stacksAddress}.`,
  );

  return {
    withdrawalId,
    debitedUSDC: requiredUsdc,
    route,
    balance,
    delaySeconds: gatewayBlueprint.security.risk_controls.withdrawal_delay_seconds,
  };
}
