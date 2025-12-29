"use client"

import { useState } from "react"
import { TradeHistoryCard } from "@/components/cards/trade-history-card"
import { FundingHistory } from "@/components/history/funding-history"
import { apiClient } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"

export function HistoryPage() {
  const { isConnected } = useWallet()
  const [activeTab, setActiveTab] = useState<"trades" | "funding">("trades")
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load trades when tab is active
  useState(() => {
    if (isConnected && activeTab === "trades") {
      loadHistory()
    } else {
      setLoading(false)
    }
  })

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getTradeHistory(50)
      setTrades(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trade history')
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="p-4 space-y-4">
        <header className="pt-2">
          <h1 className="text-3xl font-bold text-gray-900">Trade History</h1>
        </header>
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-3">Wallet not connected</p>
          <p className="text-sm text-gray-500">Please connect your wallet to view trade history</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <header className="pt-2">
        <h1 className="text-3xl font-bold text-gray-900">History</h1>
        <p className="text-gray-600 text-sm mt-1">
          {activeTab === "trades" ? `${trades.length} trades` : "Funding payments"}
        </p>
      </header>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("trades")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "trades"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-900 hover:bg-gray-200"
          }`}
        >
          Trades
        </button>
        <button
          onClick={() => setActiveTab("funding")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "funding"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-900 hover:bg-gray-200"
          }`}
        >
          Funding
        </button>
      </div>

      {activeTab === "trades" ? (
        loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading trade history...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-600 mb-2">Error loading history</p>
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={loadHistory}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : trades.length > 0 ? (
          <div className="space-y-3">
            {trades.map((trade) => (
              <TradeHistoryCard key={trade.trade_id} trade={trade} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600 mb-3">No trade history</p>
            <p className="text-sm text-gray-500">Your completed trades will appear here</p>
          </div>
        )
      ) : (
        <FundingHistory />
      )}
    </div>
  )
}
