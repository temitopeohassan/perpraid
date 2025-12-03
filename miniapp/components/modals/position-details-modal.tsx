"use client"

import { useState } from "react"

interface PositionDetailsModalProps {
  position: {
    position_id: string
    market: string
    side: "LONG" | "SHORT"
    size: number
    entry_price: number
    mark_price: number
    leverage: number
    unrealized_pnl: number
    liquidation_price: number
    margin_ratio: number
    opened_at: Date
    funding_paid: number
  }
  onClose: () => void
}

export function PositionDetailsModal({ position, onClose }: PositionDetailsModalProps) {
  const [action, setAction] = useState<"adjust" | "close" | null>(null)
  const [newLeverage, setNewLeverage] = useState(position.leverage)
  const [closeSize, setCloseSize] = useState("")

  const isLong = position.side === "LONG"
  const isPnLPositive = position.unrealized_pnl >= 0
  const timeOpen = Math.floor((Date.now() - position.opened_at.getTime()) / (1000 * 60 * 60))
  const distanceToLiquidation = isLong
    ? ((position.mark_price - position.liquidation_price) / position.mark_price) * 100
    : ((position.liquidation_price - position.mark_price) / position.mark_price) * 100

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{position.market}</h2>
            <p className={`text-lg font-semibold mt-1 ${isLong ? "text-blue-600" : "text-red-600"}`}>
              {isLong ? "LONG" : "SHORT"} {position.size}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        {/* P&L Display */}
        <div
          className={`rounded-lg p-4 border ${isPnLPositive ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}
        >
          <p className={isPnLPositive ? "text-blue-700" : "text-red-700"}>Unrealized P&L</p>
          <h3 className={`text-3xl font-bold mt-1 ${isPnLPositive ? "text-blue-700" : "text-red-700"}`}>
            {isPnLPositive ? "+" : ""}${position.unrealized_pnl.toFixed(2)}
          </h3>
        </div>

        {/* Position Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Entry Price</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">${position.entry_price}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Mark Price</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">${position.mark_price}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Leverage</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{position.leverage}x</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Margin Ratio</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{(position.margin_ratio * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Liquidation Price</p>
            <p className="text-lg font-semibold text-red-600">${position.liquidation_price.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Distance to Liquidation</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{distanceToLiquidation.toFixed(1)}%</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-600">Time Open</p>
            <p className="font-semibold text-gray-900">{timeOpen}h</p>
          </div>
          <div>
            <p className="text-gray-600">Funding Paid</p>
            <p className={`font-semibold ${position.funding_paid >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {position.funding_paid >= 0 ? "+" : ""}${position.funding_paid.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {action === null && (
          <div className="grid grid-cols-2 gap-2 pt-4">
            <button
              onClick={() => setAction("adjust")}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
            >
              Adjust Leverage
            </button>
            <button
              onClick={() => setAction("close")}
              className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition"
            >
              Close Position
            </button>
          </div>
        )}

        {/* Adjust Leverage Form */}
        {action === "adjust" && (
          <div className="space-y-3 pt-4">
            <button onClick={() => setAction(null)} className="text-blue-600 text-sm font-semibold mb-2">
              ← Back
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Leverage: {newLeverage}x</label>
              <input
                type="range"
                min="1"
                max="20"
                value={newLeverage}
                onChange={(e) => setNewLeverage(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition">
              Confirm Adjustment
            </button>
          </div>
        )}

        {/* Close Position Form */}
        {action === "close" && (
          <div className="space-y-3 pt-4">
            <button onClick={() => setAction(null)} className="text-blue-600 text-sm font-semibold mb-2">
              ← Back
            </button>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size to Close (Max: {position.size})
              </label>
              <input
                type="number"
                value={closeSize}
                onChange={(e) => setCloseSize(e.target.value)}
                placeholder="Enter size"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              disabled={!closeSize}
              className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                closeSize ? "bg-red-600 hover:bg-red-700" : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Close Position
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
