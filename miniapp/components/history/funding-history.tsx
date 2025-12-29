"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"

interface FundingPayment {
  market?: string;
  rate: number;
  price: number;
  effectiveAt: string;
  fundingIndex: string;
}

export function FundingHistory({ market }: { market?: string }) {
  const { isConnected } = useWallet()
  const [funding, setFunding] = useState<FundingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected) {
      loadFundingHistory()
    } else {
      setLoading(false)
    }
  }, [isConnected, market])

  const loadFundingHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getFundingHistory(market, 50)
      setFunding(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load funding history')
      console.error('Error loading funding history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Connect wallet to view funding history</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading funding history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-600 mb-2">Error loading funding history</p>
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={loadFundingHistory}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (funding.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No funding history found</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {funding.map((payment, idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg border border-gray-200 p-3 flex justify-between items-center"
        >
          <div className="flex-1">
            {payment.market && (
              <p className="text-sm font-medium text-gray-900">{payment.market}</p>
            )}
            <p className="text-xs text-gray-500">
              {new Date(payment.effectiveAt).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${payment.rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {payment.rate >= 0 ? '+' : ''}{(payment.rate * 100).toFixed(4)}%
            </p>
            <p className="text-xs text-gray-500">Price: ${parseFloat(payment.price.toString()).toFixed(2)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
