"use client"

interface PositionCardProps {
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
  }
  onClick: () => void
}

export function PositionCard({ position, onClick }: PositionCardProps) {
  const pnlPercent = ((position.unrealized_pnl / (position.entry_price * position.size)) * 100).toFixed(2)
  const isLong = position.side === "LONG"
  const isPnLPositive = position.unrealized_pnl >= 0

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md hover:bg-blue-50 transition p-4 space-y-3 text-left active:bg-gray-100"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{position.market}</h3>
          <div className="flex gap-2 items-center mt-1">
            <span
              className={`text-xs font-bold px-2 py-1 rounded ${isLong ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}
            >
              {isLong ? "LONG" : "SHORT"}
            </span>
            <span className="text-xs text-gray-600">
              {position.size} @ ${position.entry_price}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${isPnLPositive ? "text-blue-600" : "text-red-600"}`}>
            {isPnLPositive ? "+" : ""}${position.unrealized_pnl.toFixed(2)}
          </p>
          <p className={`text-sm ${isPnLPositive ? "text-blue-600" : "text-red-600"}`}>
            {isPnLPositive ? "+" : ""}
            {pnlPercent}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs border-t pt-3">
        <div>
          <p className="text-gray-600">Mark Price</p>
          <p className="font-semibold text-gray-900">${position.mark_price}</p>
        </div>
        <div>
          <p className="text-gray-600">Leverage</p>
          <p className="font-semibold text-gray-900">{position.leverage}x</p>
        </div>
        <div>
          <p className="text-gray-600">Margin Ratio</p>
          <p className="font-semibold text-gray-900">{(position.margin_ratio * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-xs">
        <p className="text-red-800">
          <span className="font-semibold">Liquidation:</span> ${position.liquidation_price.toFixed(2)}
        </p>
      </div>
    </button>
  )
}
