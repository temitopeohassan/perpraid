"use client"

interface MarketCardProps {
  market: {
    symbol: string
    name: string
    mark_price: number
    price_change_24h: number
    volume_24h: number
    funding_rate: number
  }
  onClick: () => void
}

export function MarketCard({ market, onClick }: MarketCardProps) {
  const isPositive = market.price_change_24h >= 0

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md hover:bg-blue-50 transition p-4 text-left active:bg-gray-100"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{market.name}</h3>
          <p className="text-xs text-gray-600">{market.symbol}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">
            ${market.mark_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-sm font-medium ${isPositive ? "text-blue-600" : "text-red-600"}`}>
            {isPositive ? "+" : ""}
            {market.price_change_24h.toFixed(2)}%
          </p>
        </div>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-600">
        <span>Vol: ${(market.volume_24h / 1000000000).toFixed(2)}B</span>
        <span className={`font-medium ${market.funding_rate >= 0 ? "text-blue-600" : "text-red-600"}`}>
          Rate: {(market.funding_rate * 100).toFixed(4)}%
        </span>
      </div>
    </button>
  )
}
