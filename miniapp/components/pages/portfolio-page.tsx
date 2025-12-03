"use client"

import { BalanceCard } from "@/components/cards/balance-card"
import { RiskMetricsCard } from "@/components/cards/risk-metrics-card"
import { PortfolioAllocation } from "@/components/portfolio/portfolio-allocation"
import { PerformanceChart } from "@/components/portfolio/performance-chart"

export function PortfolioPage() {
  return (
    <div className="p-4 space-y-4">
      <header className="pt-2">
        <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
        <p className="text-gray-600 text-sm mt-1">Wallet: 0x742d...8F4b</p>
      </header>

      <BalanceCard />

      <PerformanceChart />

      <RiskMetricsCard />

      <PortfolioAllocation />

      <div className="bg-white rounded-lg border border-red-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition">
            Deposit
          </button>
          <button className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition">
            Withdraw
          </button>
        </div>
      </div>
    </div>
  )
}
