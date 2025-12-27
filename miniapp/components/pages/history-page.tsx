"use client"

import { useState, useEffect } from "react"
import { TradeHistoryCard } from "@/components/cards/trade-history-card"
import { apiClient } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"

export function HistoryPage() {
  const { isConnected } = useWallet()
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected) {
      loadHistory()
    } else {
      setLoading(false)
    }
  }, [isConnected])

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

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading trade history...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
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
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <header className="pt-2">
        <h1 className="text-3xl font-bold text-gray-900">Trade History</h1>
        <p className="text-gray-600 text-sm mt-1">{trades.length} trades</p>
      </header>

      {trades.length > 0 ? (
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
      )}
    </div>
  )
}
