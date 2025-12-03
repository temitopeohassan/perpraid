"use client"

import { useState } from "react"
import { MarketCard } from "@/components/cards/market-card"
import { MarketDetails } from "@/components/market/market-details"
import { TradingModal } from "@/components/modals/trading-modal"

const MOCK_MARKETS = [
  {
    symbol: "BTC-PERP",
    name: "Bitcoin",
    mark_price: 42500,
    price_change_24h: 2.5,
    volume_24h: 1200000000,
    funding_rate: 0.0015,
  },
  {
    symbol: "ETH-PERP",
    name: "Ethereum",
    mark_price: 2250,
    price_change_24h: -1.2,
    volume_24h: 850000000,
    funding_rate: 0.0012,
  },
  {
    symbol: "SOL-PERP",
    name: "Solana",
    mark_price: 185,
    price_change_24h: 5.3,
    volume_24h: 420000000,
    funding_rate: 0.0008,
  },
  {
    symbol: "ARB-PERP",
    name: "Arbitrum",
    mark_price: 1.25,
    price_change_24h: -0.8,
    volume_24h: 180000000,
    funding_rate: 0.001,
  },
  {
    symbol: "DOGE-PERP",
    name: "Dogecoin",
    mark_price: 0.38,
    price_change_24h: 8.2,
    volume_24h: 95000000,
    funding_rate: 0.0009,
  },
  {
    symbol: "OP-PERP",
    name: "Optimism",
    mark_price: 2.85,
    price_change_24h: 1.5,
    volume_24h: 140000000,
    funding_rate: 0.0011,
  },
]

export function MarketsPage() {
  const [selectedMarket, setSelectedMarket] = useState<(typeof MOCK_MARKETS)[0] | null>(null)
  const [showTradingModal, setShowTradingModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"change" | "volume">("volume")

  const filteredMarkets = MOCK_MARKETS.filter(
    (market) =>
      market.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    if (sortBy === "change") {
      return b.price_change_24h - a.price_change_24h
    }
    return b.volume_24h - a.volume_24h
  })

  return (
    <div className="p-4 space-y-4">
      <header className="pt-2">
        <h1 className="text-3xl font-bold text-gray-900">Markets</h1>
        <p className="text-gray-600 text-sm mt-1">Real-time perpetual futures</p>
      </header>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 bg-white rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("volume")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              sortBy === "volume" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            Volume
          </button>
          <button
            onClick={() => setSortBy("change")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              sortBy === "change" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            Change
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sortedMarkets.length > 0 ? (
          sortedMarkets.map((market) => (
            <MarketCard
              key={market.symbol}
              market={market}
              onClick={() => {
                setSelectedMarket(market)
              }}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">No markets found</p>
          </div>
        )}
      </div>

      {selectedMarket && !showTradingModal && (
        <MarketDetails
          market={selectedMarket}
          onClose={() => setSelectedMarket(null)}
          onTrade={() => setShowTradingModal(true)}
        />
      )}

      {selectedMarket && showTradingModal && (
        <TradingModal
          market={selectedMarket}
          onClose={() => {
            setShowTradingModal(false)
            setSelectedMarket(null)
          }}
        />
      )}
    </div>
  )
}
