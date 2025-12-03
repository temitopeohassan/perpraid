"use client"

import { useState } from "react"
import { PositionCard } from "@/components/cards/position-card"
import { PositionDetailsModal } from "@/components/modals/position-details-modal"

const MOCK_POSITIONS = [
  {
    position_id: "pos_001",
    market: "BTC-PERP",
    side: "LONG",
    size: 0.5,
    entry_price: 42000,
    mark_price: 42500,
    leverage: 5,
    unrealized_pnl: 1250,
    liquidation_price: 36400,
    margin_ratio: 0.45,
    opened_at: new Date("2025-12-01T10:30:00"),
    funding_paid: 25.5,
  },
  {
    position_id: "pos_002",
    market: "ETH-PERP",
    side: "SHORT",
    size: 10,
    entry_price: 2300,
    mark_price: 2250,
    leverage: 3,
    unrealized_pnl: 500,
    liquidation_price: 2680,
    margin_ratio: 0.62,
    opened_at: new Date("2025-11-30T14:15:00"),
    funding_paid: -12.8,
  },
]

export function PositionsPage() {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null)

  const selectedPositionData = selectedPosition ? MOCK_POSITIONS.find((p) => p.position_id === selectedPosition) : null

  const totalUnrealizedPnL = MOCK_POSITIONS.reduce((sum, p) => sum + p.unrealized_pnl, 0)
  const averageLeverage =
    MOCK_POSITIONS.length > 0 ? MOCK_POSITIONS.reduce((sum, p) => sum + p.leverage, 0) / MOCK_POSITIONS.length : 0

  return (
    <div className="p-4 space-y-4">
      <header className="pt-2">
        <h1 className="text-3xl font-bold text-gray-900">Open Positions</h1>
        <p className="text-gray-600 text-sm mt-1">{MOCK_POSITIONS.length} active position(s)</p>
      </header>

      {MOCK_POSITIONS.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg border border-blue-100 p-3">
            <p className="text-gray-600 text-xs">Total P&L</p>
            <p className={`text-2xl font-bold mt-1 ${totalUnrealizedPnL >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {totalUnrealizedPnL >= 0 ? "+" : ""}${totalUnrealizedPnL.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-gray-600 text-xs">Avg Leverage</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">{averageLeverage.toFixed(1)}x</p>
          </div>
        </div>
      )}

      {MOCK_POSITIONS.length > 0 ? (
        <div className="space-y-3">
          {MOCK_POSITIONS.map((position) => (
            <PositionCard
              key={position.position_id}
              position={position}
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
        <PositionDetailsModal position={selectedPositionData} onClose={() => setSelectedPosition(null)} />
      )}
    </div>
  )
}
