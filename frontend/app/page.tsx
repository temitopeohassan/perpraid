"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { api } from "../lib/api";
import type { DashboardResponse, MarketResponse, OverviewResponse, UserSummary } from "../lib/types";

type FlowRecord = {
  name: string;
  steps: Array<{ step: string; order: number }>;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function HomePage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [markets, setMarkets] = useState<MarketResponse[]>([]);
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [depositAmount, setDepositAmount] = useState("25");
  const [withdrawalAmount, setWithdrawalAmount] = useState("15");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");
  const [tradeSize, setTradeSize] = useState("0.02");
  const [tradeLeverage, setTradeLeverage] = useState("3");
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [actionState, setActionState] = useState<{ message: string; variant: "idle" | "success" | "error" }>({
    message: "Gateway status: loading seeded state from the backend.",
    variant: "idle",
  });

  const loadShellData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [overviewResponse, usersResponse, marketsResponse, flowsResponse] = await Promise.all([
        api.getOverview(),
        api.getUsers(),
        api.getMarkets(),
        api.getFlows(),
      ]);

      setOverview(overviewResponse);
      setUsers(usersResponse.users);
      setMarkets(marketsResponse.markets);
      setFlows(flowsResponse.flows);

      if (!selectedUserId && usersResponse.users[0]) {
        setSelectedUserId(usersResponse.users[0].userId);
      }

      if (!selectedRoute && overviewResponse.blueprint.backend_services.bridge_router.supported_routes[0]) {
        setSelectedRoute(overviewResponse.blueprint.backend_services.bridge_router.supported_routes[0]);
      }

      if (!selectedMarket && overviewResponse.blueprint.backend_services.dydx_trading_engine.markets[0]) {
        setSelectedMarket(overviewResponse.blueprint.backend_services.dydx_trading_engine.markets[0]);
      }

      setActionState({
        message: "Gateway state loaded. You can now simulate deposit, trade, and withdrawal flows.",
        variant: "idle",
      });
    } catch (error) {
      setActionState({
        message: error instanceof Error ? error.message : "Failed to load gateway overview.",
        variant: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedMarket, selectedRoute, selectedUserId]);

  const loadDashboard = useCallback(async (userId: string) => {
    if (!userId) {
      return;
    }

    try {
      const dashboardResponse = await api.getDashboard(userId);
      setDashboard(dashboardResponse);
    } catch (error) {
      setActionState({
        message: error instanceof Error ? error.message : "Failed to load user dashboard.",
        variant: "error",
      });
    }
  }, []);

  useEffect(() => {
    void loadShellData();
  }, [loadShellData]);

  useEffect(() => {
    void loadDashboard(selectedUserId);
  }, [loadDashboard, selectedUserId]);

  const refreshAll = useCallback(async () => {
    await loadShellData();
    await loadDashboard(selectedUserId || users[0]?.userId || "");
  }, [loadDashboard, loadShellData, selectedUserId, users]);

  const supportedRoutes = overview?.blueprint.backend_services.bridge_router.supported_routes ?? [];
  const supportedMarkets = overview?.blueprint.backend_services.dydx_trading_engine.markets ?? [];

  const selectedMarketSnapshot = useMemo(
    () => markets.find((item) => item.market === selectedMarket) ?? markets[0],
    [markets, selectedMarket],
  );

  const submitAction = useCallback(
    async (runner: () => Promise<unknown>, successMessage: string) => {
      try {
        setActionState({
          message: "Submitting workflow to the local gateway...",
          variant: "idle",
        });
        await runner();
        await refreshAll();
        setActionState({
          message: successMessage,
          variant: "success",
        });
      } catch (error) {
        setActionState({
          message: error instanceof Error ? error.message : "The workflow request failed.",
          variant: "error",
        });
      }
    },
    [refreshAll],
  );

  const onDeposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAction(
      () =>
        api.createDeposit({
          userId: selectedUserId,
          amount: Number(depositAmount),
          route: selectedRoute,
        }),
      "Deposit flow completed: STX locked, bridged, and collateral updated.",
    );
  };

  const onTrade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAction(
      () =>
        api.createTrade({
          userId: selectedUserId,
          market: selectedMarket,
          side: tradeSide,
          size: Number(tradeSize),
          leverage: Number(tradeLeverage),
        }),
      "Trade submitted: balance validated, order executed, and position state refreshed.",
    );
  };

  const onWithdraw = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAction(
      () =>
        api.createWithdrawal({
          userId: selectedUserId,
          amount: Number(withdrawalAmount),
          route: selectedRoute,
        }),
      "Withdrawal flow completed: collateral released and STX returned to the user wallet.",
    );
  };

  return (
    <main className="page-shell">
      <div className="hero-card">
        <div>
          <p className="eyebrow">Production blueprint</p>
          <h1>{overview?.blueprint.project.name ?? "Stacks-dYdX Trading Gateway"}</h1>
          <p className="hero-copy">
            {overview?.blueprint.project.description ??
              "Cross-chain trading gateway for moving STX into dYdX collateral and executing derivative orders."}
          </p>
        </div>

        <div className="hero-meta">
          <div>
            <span>Environment</span>
            <strong>{overview?.blueprint.project.environment ?? "loading"}</strong>
          </div>
          <div>
            <span>Source chain</span>
            <strong>{overview?.blueprint.chains.source.name ?? "Stacks"}</strong>
          </div>
          <div>
            <span>Destination chain</span>
            <strong>{overview?.blueprint.chains.destination.name ?? "dYdX Chain"}</strong>
          </div>
        </div>
      </div>

      <div className={`status-banner ${actionState.variant}`}>
        <span>{actionState.message}</span>
        <button type="button" onClick={() => void refreshAll()} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard label="Users" value={overview?.summary.users ?? 0} />
        <MetricCard label="Deposits processed" value={overview?.summary.depositsProcessed ?? 0} />
        <MetricCard label="Bridges executed" value={overview?.summary.bridgesExecuted ?? 0} />
        <MetricCard label="Orders submitted" value={overview?.summary.ordersSubmitted ?? 0} />
        <MetricCard label="Withdrawals completed" value={overview?.summary.withdrawalsCompleted ?? 0} />
      </div>

      <div className="two-column">
        <SectionCard
          title="Gateway controls"
          description="Choose a seeded user and exercise the core deposit, trade, and withdrawal flows from the MCP blueprint."
        >
          <div className="control-grid">
            <label>
              <span>Active user</span>
              <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                {users.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.userId} - {user.stacksAddress.slice(0, 10)}...
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Bridge route</span>
              <select value={selectedRoute} onChange={(event) => setSelectedRoute(event.target.value)}>
                {supportedRoutes.map((route) => (
                  <option key={route} value={route}>
                    {route}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="forms-grid">
            <form className="workflow-form" onSubmit={onDeposit}>
              <h3>Deposit STX</h3>
              <p>Simulates vault lock, Hiro event detection, bridging, and USDC collateral credit.</p>
              <label>
                <span>STX amount</span>
                <input
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  inputMode="decimal"
                />
              </label>
              <button type="submit">Run deposit flow</button>
            </form>

            <form className="workflow-form" onSubmit={onTrade}>
              <h3>Submit trade</h3>
              <p>Runs balance validation, dYdX execution, and position tracking with risk controls.</p>
              <label>
                <span>Market</span>
                <select value={selectedMarket} onChange={(event) => setSelectedMarket(event.target.value)}>
                  {supportedMarkets.map((market) => (
                    <option key={market} value={market}>
                      {market}
                    </option>
                  ))}
                </select>
              </label>
              <div className="inline-grid">
                <label>
                  <span>Side</span>
                  <select value={tradeSide} onChange={(event) => setTradeSide(event.target.value as "buy" | "sell")}>
                    <option value="buy">Buy / Long</option>
                    <option value="sell">Sell / Short</option>
                  </select>
                </label>
                <label>
                  <span>Size</span>
                  <input value={tradeSize} onChange={(event) => setTradeSize(event.target.value)} inputMode="decimal" />
                </label>
                <label>
                  <span>Leverage</span>
                  <input
                    value={tradeLeverage}
                    onChange={(event) => setTradeLeverage(event.target.value)}
                    inputMode="decimal"
                  />
                </label>
              </div>
              <button type="submit">Place order</button>
            </form>

            <form className="workflow-form" onSubmit={onWithdraw}>
              <h3>Withdraw STX</h3>
              <p>Closes out available collateral, bridges back through the selected route, and releases STX.</p>
              <label>
                <span>STX amount</span>
                <input
                  value={withdrawalAmount}
                  onChange={(event) => setWithdrawalAmount(event.target.value)}
                  inputMode="decimal"
                />
              </label>
              <button type="submit">Run withdrawal flow</button>
            </form>
          </div>
        </SectionCard>

        <SectionCard
          title="Selected user"
          description="The dashboard below reflects the user state after each simulated workflow."
        >
          {dashboard ? (
            <div className="stack-gap">
              <div className="address-box">
                <div>
                  <span>Stacks address</span>
                  <strong>{dashboard.user.stacksAddress}</strong>
                </div>
                <div>
                  <span>dYdX address</span>
                  <strong>{dashboard.user.dydxAddress}</strong>
                </div>
              </div>
              <div className="metric-grid compact">
                <MetricCard label="STX wallet balance" value={number.format(dashboard.balance.stxBalance)} />
                <MetricCard label="Locked STX" value={number.format(dashboard.balance.lockedBalance)} />
                <MetricCard
                  label="Collateral USDC"
                  value={currency.format(dashboard.balance.collateralUSDC)}
                  tone="success"
                />
                <MetricCard
                  label="Available collateral"
                  value={currency.format(dashboard.balance.availableCollateral)}
                  tone={dashboard.balance.availableCollateral < 150 ? "warning" : "default"}
                />
              </div>
              <div className="metric-grid compact">
                <MetricCard label="Used margin" value={currency.format(dashboard.risk.usedMargin)} />
                <MetricCard label="Margin ratio" value={number.format(dashboard.risk.marginRatio)} />
                <MetricCard label="Liquidation monitor" value={dashboard.risk.liquidationMonitor} />
                <MetricCard label="Max leverage" value={`${dashboard.risk.maxLeverage}x`} />
              </div>
              {dashboard.risk.warnings.length > 0 ? (
                <ul className="warning-list">
                  {dashboard.risk.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted-copy">Risk engine reports no active warnings for this user.</p>
              )}
            </div>
          ) : (
            <p className="muted-copy">Loading user balances and positions...</p>
          )}
        </SectionCard>
      </div>

      <div className="two-column">
        <SectionCard title="Markets & execution" description="Seeded dYdX market snapshots exposed by the local backend.">
          <div className="market-grid">
            {markets.map((market) => (
              <article className="market-card" key={market.market}>
                <div className="market-head">
                  <h3>{market.market}</h3>
                  <span className={market.dailyChange >= 0 ? "pill positive" : "pill negative"}>
                    {market.dailyChange >= 0 ? "+" : ""}
                    {market.dailyChange}%
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Mark price</dt>
                    <dd>{currency.format(market.markPrice)}</dd>
                  </div>
                  <div>
                    <dt>Funding rate</dt>
                    <dd>{market.fundingRate}%</dd>
                  </div>
                  <div>
                    <dt>24h volume</dt>
                    <dd>{currency.format(market.volume24h)}</dd>
                  </div>
                  <div>
                    <dt>Open interest</dt>
                    <dd>{currency.format(market.openInterest)}</dd>
                  </div>
                  <div>
                    <dt>Max leverage</dt>
                    <dd>{market.maxLeverage}x</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          {selectedMarketSnapshot ? (
            <p className="muted-copy">
              Current ticket targets <strong>{selectedMarketSnapshot.market}</strong> at {currency.format(selectedMarketSnapshot.markPrice)}
              , so the notional per 1 unit is {currency.format(selectedMarketSnapshot.markPrice)}.
            </p>
          ) : null}
        </SectionCard>

        <SectionCard title="Service topology" description="Every backend service from the MCP is modeled in the local API surface.">
          <div className="service-stack">
            <div className="service-card">
              <h3>Stacks event listener</h3>
              <p>
                {overview?.services.eventListener.provider} polling {overview?.services.eventListener.source} every{" "}
                {overview?.services.eventListener.poll_interval_seconds}s.
              </p>
            </div>
            <div className="service-card">
              <h3>Bridge router</h3>
              <p>{overview?.services.bridgeRouter.providers.join(", ")}</p>
              <ul>
                {overview?.services.bridgeRouter.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="service-card">
              <h3>dYdX trading engine</h3>
              <p>{overview?.services.tradingEngine.provider}</p>
              <ul>
                {overview?.services.tradingEngine.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="service-card">
              <h3>Risk engine</h3>
              <p>Controls leverage, liquidation watch, and position tracking.</p>
              <ul>
                {overview?.services.riskEngine.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="two-column">
        <SectionCard title="System flows" description="Ordered flow steps are pulled straight from the blueprint and rendered for operators.">
          <div className="flow-grid">
            {flows.map((flow) => (
              <article className="flow-card" key={flow.name}>
                <h3>{flow.name.replaceAll("_", " ")}</h3>
                <ol>
                  {flow.steps.map((step) => (
                    <li key={step.step}>
                      <span>{step.order}</span>
                      <p>{step.step.replaceAll("_", " ")}</p>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Database model" description="Firestore collections generated from the MCP schema.">
          <div className="collection-grid">
            {Object.entries(overview?.collections ?? {}).map(([name, collection]) => (
              <article className="collection-card" key={name}>
                <h3>{name}</h3>
                <ul>
                  {collection.fields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="two-column">
        <SectionCard title="Activity ledger" description="Deposits, bridges, trades, and withdrawals update in real time as you submit forms.">
          {dashboard ? (
            <div className="table-stack">
              <div className="table-card">
                <h3>Deposits</h3>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.deposits.map((deposit) => (
                      <tr key={deposit.depositId}>
                        <td>{deposit.depositId}</td>
                        <td>{number.format(deposit.amount)} STX</td>
                        <td>{deposit.status}</td>
                        <td>{new Date(deposit.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-card">
                <h3>Bridge transactions</h3>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Route</th>
                      <th>Status</th>
                      <th>Tx hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.bridgeTransactions.map((bridge) => (
                      <tr key={bridge.bridgeId}>
                        <td>{bridge.bridgeId}</td>
                        <td>{bridge.route}</td>
                        <td>{bridge.status}</td>
                        <td>{bridge.txHash.slice(0, 14)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="muted-copy">Waiting for dashboard data...</p>
          )}
        </SectionCard>

        <SectionCard title="Positions & trades" description="Open positions and the latest execution history for the active user.">
          {dashboard ? (
            <div className="table-stack">
              <div className="table-card">
                <h3>Open positions</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Market</th>
                      <th>Side</th>
                      <th>Size</th>
                      <th>Margin</th>
                      <th>PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.positions.map((position) => (
                      <tr key={position.positionId}>
                        <td>{position.market}</td>
                        <td>{position.side}</td>
                        <td>{number.format(position.size)}</td>
                        <td>{currency.format(position.marginUsed)}</td>
                        <td className={position.unrealizedPnl >= 0 ? "positive-text" : "negative-text"}>
                          {currency.format(position.unrealizedPnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-card">
                <h3>Trade history</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Market</th>
                      <th>Side</th>
                      <th>Price</th>
                      <th>Leverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.trades.map((trade) => (
                      <tr key={trade.tradeId}>
                        <td>{trade.orderId}</td>
                        <td>{trade.market}</td>
                        <td>{trade.side}</td>
                        <td>{currency.format(trade.price)}</td>
                        <td>{trade.leverage}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-card">
                <h3>Withdrawals</h3>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.withdrawalId}>
                        <td>{withdrawal.withdrawalId}</td>
                        <td>{number.format(withdrawal.amount)} STX</td>
                        <td>{withdrawal.status}</td>
                        <td>{new Date(withdrawal.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="muted-copy">Waiting for position and trade data...</p>
          )}
        </SectionCard>
      </div>

      <div className="two-column">
        <SectionCard title="Vault contract" description="Clarity vault capabilities and emitted events from the supplied MCP.">
          <div className="split-list">
            <div>
              <h3>{overview?.blueprint.smart_contracts.stacks_vault.contract_id}</h3>
              <p>
                {overview?.blueprint.smart_contracts.stacks_vault.network} ·{" "}
                {overview?.blueprint.smart_contracts.stacks_vault.language}
              </p>
            </div>
            <div>
              <h4>Functions</h4>
              <ul>
                {overview?.blueprint.smart_contracts.stacks_vault.functions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Events</h4>
              <ul>
                {overview?.blueprint.smart_contracts.stacks_vault.events.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Security & observability" description="Operational guardrails derived from the provided blueprint.">
          <div className="split-list">
            <div>
              <h4>Wallet management</h4>
              <p>{overview?.blueprint.security.wallet_management.type}</p>
              <ul>
                {overview?.blueprint.security.wallet_management.roles.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Rate limits</h4>
              <ul>
                <li>{overview?.blueprint.security.risk_controls.rate_limits.orders_per_second} orders / second</li>
                <li>{overview?.blueprint.security.risk_controls.rate_limits.withdrawals_per_hour} withdrawals / hour</li>
                <li>{overview?.blueprint.security.risk_controls.withdrawal_delay_seconds}s withdrawal delay</li>
              </ul>
            </div>
            <div>
              <h4>Metrics</h4>
              <ul>
                {overview?.blueprint.observability.metrics.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
