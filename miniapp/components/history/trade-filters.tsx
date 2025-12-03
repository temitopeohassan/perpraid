"use client"

interface TradeFiltersProps {
  period: "24h" | "7d" | "30d" | "all"
  onPeriodChange: (period: "24h" | "7d" | "30d" | "all") => void
  markets: string[]
  selectedMarket: string | null
  onMarketChange: (market: string | null) => void
}

export function TradeFilters({ period, onPeriodChange, markets, selectedMarket, onMarketChange }: TradeFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["24h", "7d", "30d", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              period === p ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => onMarketChange(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
            selectedMarket === null ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
          }`}
        >
          All Markets
        </button>
        {markets.map((market) => (
          <button
            key={market}
            onClick={() => onMarketChange(market)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              selectedMarket === market ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            {market}
          </button>
        ))}
      </div>
    </div>
  )
}
