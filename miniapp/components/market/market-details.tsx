"use client"

interface MarketDetailsProps {
  market: {
    symbol: string
    name: string
    mark_price: number
    price_change_24h: number
    volume_24h: number
    funding_rate: number
  }
  onClose: () => void
  onTrade: () => void
}

export function MarketDetails({ market, onClose, onTrade }: MarketDetailsProps) {
  const isPositive = market.price_change_24h >= 0

  // Mock additional market data
  const indexPrice = market.mark_price * 0.99
  const openInterest = market.volume_24h * 0.15
  const high24h = market.mark_price * 1.08
  const low24h = market.mark_price * 0.94

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-40">
      <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{market.name}</h2>
            <p className="text-gray-600 text-sm">{market.symbol}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        {/* Price section */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <p className="text-blue-700 text-sm font-medium">Mark Price</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-1">
            ${market.mark_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </h3>
          <p className={`text-lg font-semibold mt-2 ${isPositive ? "text-blue-600" : "text-red-600"}`}>
            {isPositive ? "+" : ""}
            {market.price_change_24h.toFixed(2)}% (24h)
          </p>
        </div>

        {/* Market stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Index Price</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">${indexPrice.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Funding Rate</p>
            <p className={`text-lg font-semibold mt-1 ${market.funding_rate >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {(market.funding_rate * 100).toFixed(4)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">24h High</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">${high24h.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">24h Low</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">${low24h.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Volume 24h</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">${(market.volume_24h / 1000000000).toFixed(2)}B</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-gray-600 text-xs font-medium">Open Interest</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">${(openInterest / 1000000).toFixed(1)}M</p>
          </div>
        </div>

        {/* Trading buttons */}
        <div className="grid grid-cols-2 gap-2 pt-4">
          <button
            onClick={onTrade}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
          >
            Long
          </button>
          <button
            onClick={onTrade}
            className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition"
          >
            Short
          </button>
        </div>
      </div>
    </div>
  )
}
