import type { DashboardResponse, MarketResponse, OverviewResponse, UserSummary } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getOverview: () => request<OverviewResponse>("/api/overview"),
  getUsers: () => request<{ users: UserSummary[] }>("/api/users"),
  getMarkets: () => request<{ markets: MarketResponse[] }>("/api/markets"),
  getFlows: () => request<{ flows: Array<{ name: string; steps: Array<{ step: string; order: number }> }> }>("/api/system/flows"),
  getDashboard: (userId: string) => request<DashboardResponse>(`/api/users/${userId}/dashboard`),
  createDeposit: (payload: { userId: string; amount: number; route: string }) =>
    request("/api/deposits", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createTrade: (payload: {
    userId: string;
    market: string;
    side: "buy" | "sell";
    size: number;
    leverage: number;
  }) =>
    request("/api/trades", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createWithdrawal: (payload: { userId: string; amount: number; route: string }) =>
    request("/api/withdrawals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
