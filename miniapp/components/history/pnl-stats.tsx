"use client"

interface PnLStatsProps {
  totalPnL: number
  totalFees: number
  winRate: number
  avgPnL: number
  tradeCount: number
}

export function PnLStats({ totalPnL, totalFees, winRate, avgPnL, tradeCount }: PnLStatsProps) {
  const isPnLPositive = totalPnL >= 0

  return (
    <div className="space-y-3">
      {/* Main P&L Card */}
      <div
        className={`rounded-lg p-4 border ${isPnLPositive ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}
      >
        <p className={isPnLPositive ? "text-blue-700" : "text-red-700"}>Total P&L</p>
        <h2 className={`text-3xl font-bold mt-1 ${isPnLPositive ? "text-blue-700" : "text-red-700"}`}>
          {isPnLPositive ? "+" : ""}${totalPnL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          After fees: {isPnLPositive ? "+" : ""}${(totalPnL - totalFees).toFixed(2)}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-gray-600 text-xs font-medium">Win Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{winRate.toFixed(0)}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round((winRate / 100) * tradeCount)} / {tradeCount}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-gray-600 text-xs font-medium">Avg P&L</p>
          <p className={`text-2xl font-bold mt-1 ${avgPnL >= 0 ? "text-blue-600" : "text-red-600"}`}>
            {avgPnL >= 0 ? "+" : ""}${avgPnL.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-gray-600 text-xs font-medium">Total Fees</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${totalFees.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-gray-600 text-xs font-medium">Trades</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{tradeCount}</p>
        </div>
      </div>
    </div>
  )
}
