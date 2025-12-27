"use client"

import { useState, useEffect } from "react"
import { PositionCard } from "@/components/cards/position-card"
import { PositionDetailsModal } from "@/components/modals/position-details-modal"
import { apiClient } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"

interface Position {
  position_id: string;
  market: string;
  side: string;
  size: number;
  entry_price: number;
  mark_price: number;
  leverage: number;
  margin_mode: string;
  unrealized_pnl: number;
  realized_pnl: number;
  liquidation_price: number;
  margin_ratio: number;
  opened_at: string;
}

export function PositionsPage() {
  const { isConnected } = useWallet()
  const [positions, setPositions] = useState<Position[]>([])
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected) {
      loadPositions()
    } else {
      setLoading(false)
    }
  }, [isConnected])

  const loadPositions = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getPositions()
      setPositions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions')
      console.error('Error loading positions:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedPositionData = selectedPosition
    ? positions.find((p) => p.position_id === selectedPosition)
    : null

  const totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0)
  const averageLeverage =
    positions.length > 0
      ? positions.reduce((sum, p) => sum + p.leverage, 0) / positions.length
      : 0

  if (!isConnected) {
    return (
      <div className="p-4 space-y-4">
        <header className="pt-2">
          <h1 className="text-3xl font-bold text-gray-900">Open Positions</h1>
        </header>
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-3">Wallet not connected</p>
          <p className="text-sm text-gray-500">Please connect your wallet to view positions</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading positions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-600 mb-2">Error loading positions</p>
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={loadPositions}
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
        <h1 className="text-3xl font-bold text-gray-900">Open Positions</h1>
        <p className="text-gray-600 text-sm mt-1">{positions.length} active position(s)</p>
      </header>

      {positions.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg border border-blue-100 p-3">
            <p className="text-gray-600 text-xs">Total P&L</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                totalUnrealizedPnL >= 0 ? "text-blue-600" : "text-red-600"
              }`}
            >
              {totalUnrealizedPnL >= 0 ? "+" : ""}${totalUnrealizedPnL.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-gray-600 text-xs">Avg Leverage</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">{averageLeverage.toFixed(1)}x</p>
          </div>
        </div>
      )}

      {positions.length > 0 ? (
        <div className="space-y-3">
          {positions.map((position) => (
            <PositionCard
              key={position.position_id}
              position={{
                ...position,
                opened_at: new Date(position.opened_at),
                funding_paid: 0, // Not available in API response
              }}
              onClick={() => setSelectedPosition(position.position_id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-3">No open positions</p>
          <p className="text-sm text-gray-500">Start trading from the Markets tab</p>
        </div>
      )}

      {selectedPositionData && (
        <PositionDetailsModal
          position={{
            ...selectedPositionData,
            opened_at: new Date(selectedPositionData.opened_at),
            funding_paid: 0,
          }}
          onClose={() => setSelectedPosition(null)}
        />
      )}
    </div>
  )
}
