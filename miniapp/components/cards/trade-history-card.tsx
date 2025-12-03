"use client"

interface TradeHistoryCardProps {
  trade: {
    trade_id: string
    market: string
    side: "BUY" | "SELL"
    size: number
    price: number
    realized_pnl: number
    fee: number
    timestamp: Date
  }
}

export function TradeHistoryCard({ trade }: TradeHistoryCardProps) {
  const isBuy = trade.side === "BUY"
  const isPnLPositive = trade.realized_pnl >= 0

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${isBuy ? "bg-blue-100" : "bg-red-100"}`}
          >
            <span className={`text-lg font-bold ${isBuy ? "text-blue-600" : "text-red-600"}`}>{isBuy ? "↓" : "↑"}</span>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{trade.market}</h4>
            <p className="text-xs text-gray-600">
              {trade.side} {trade.size} @ ${trade.price}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-semibold text-lg ${isPnLPositive ? "text-blue-600" : "text-red-600"}`}>
            {isPnLPositive ? "+" : ""}${trade.realized_pnl.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">{formatTime(trade.timestamp)}</p>
        </div>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-600 pt-2 border-t">
        <span>Fee: ${trade.fee.toFixed(2)}</span>
        <span>
          Net: {isPnLPositive ? "+" : ""}${(trade.realized_pnl - trade.fee).toFixed(2)}
        </span>
      </div>
    </div>
  )
}
