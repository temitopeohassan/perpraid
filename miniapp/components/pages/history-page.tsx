"use client"

import { useState } from "react"
import { TradeHistoryCard } from "@/components/cards/trade-history-card"
import { PnLStats } from "@/components/history/pnl-stats"
import { TradeFilters } from "@/components/history/trade-filters"

const MOCK_HISTORY = [
  {
    trade_id: "trade_001",
    market: "BTC-PERP",
    side: "BUY",
    size: 0.25,
    price: 41800,
    realized_pnl: 175,
    fee: 26.13,
    timestamp: new Date("2025-12-02T14:30:00"),
  },
  {
    trade_id: "trade_002",
    market: "ETH-PERP",
    side: "SELL",
    size: 5,
    price: 2350,
    realized_pnl: 250,
    fee: 58.75,
    timestamp: new Date("2025-12-01T10:15:00"),
  },
  {
    trade_id: "trade_003",
    market: "SOL-PERP",
    side: "BUY",
    size: 100,
    price: 180,
    realized_pnl: -150,
    fee: 45.0,
    timestamp: new Date("2025-11-30T16:45:00"),
  },
  {
    trade_id: "trade_004",
    market: "BTC-PERP",
    side: "SELL",
    size: 0.1,
    price: 42200,
    realized_pnl: 40,
    fee: 4.22,
    timestamp: new Date("2025-11-29T09:20:00"),
  },
  {
    trade_id: "trade_005",
    market: "ARB-PERP",
    side: "BUY",
    size: 500,
    price: 1.2,
    realized_pnl: 50,
    fee: 30.0,
    timestamp: new Date("2025-11-28T13:50:00"),
  },
]

export function HistoryPage() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d" | "all">("7d")
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null)

  // Filter trades based on period and market
  const filteredTrades = MOCK_HISTORY.filter((trade) => {
    const tradeDate = new Date(trade.timestamp)
    const now = new Date()
    let periodMs = 0

    if (period === "24h") periodMs = 24 * 60 * 60 * 1000
    else if (period === "7d") periodMs = 7 * 24 * 60 * 60 * 1000
    else if (period === "30d") periodMs = 30 * 24 * 60 * 60 * 1000
    else periodMs = Number.POSITIVE_INFINITY

    const isWithinPeriod = periodMs === Number.POSITIVE_INFINITY || now.getTime() - tradeDate.getTime() <= periodMs
    const matchesMarket = !selectedMarket || trade.market === selectedMarket

    return isWithinPeriod && matchesMarket
  })

  const totalPnL = filteredTrades.reduce((sum, trade) => sum + trade.realized_pnl, 0)
  const totalFees = filteredTrades.reduce((sum, trade) => sum + trade.fee, 0)
  const winRate =
    filteredTrades.length > 0
      ? (filteredTrades.filter((t) => t.realized_pnl > 0).length / filteredTrades.length) * 100
      : 0
  const avgPnL = filteredTrades.length > 0 ? totalPnL / filteredTrades.length : 0

  const uniqueMarkets = [...new Set(MOCK_HISTORY.map((t) => t.market))]

  return (
    <div className="p-4 space-y-4">
      <header className="pt-2">
        <h1 className="text-3xl font-bold text-gray-900">Trade History</h1>
        <p className="text-gray-600 text-sm mt-1">{filteredTrades.length} trade(s)</p>
      </header>

      <TradeFilters
        period={period}
        onPeriodChange={setPeriod}
        markets={uniqueMarkets}
        selectedMarket={selectedMarket}
        onMarketChange={setSelectedMarket}
      />

      <PnLStats
        totalPnL={totalPnL}
        totalFees={totalFees}
        winRate={winRate}
        avgPnL={avgPnL}
        tradeCount={filteredTrades.length}
      />

      {filteredTrades.length > 0 ? (
        <div className="space-y-2">
          {filteredTrades.map((trade) => (
            <TradeHistoryCard key={trade.trade_id} trade={trade} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">No trades found for this period</p>
        </div>
      )}
    </div>
  )
}
