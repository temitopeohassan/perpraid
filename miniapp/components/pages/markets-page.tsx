"use client"

import { useState, useEffect } from "react"
import { MarketCard } from "@/components/cards/market-card"
import { MarketDetails } from "@/components/market/market-details"
import { TradingModal } from "@/components/modals/trading-modal"
import { apiClient } from "@/lib/api"

interface Market {
  market: string;
  base_asset: string;
  quote_asset: string;
  min_order_size: number;
  max_leverage: number;
  tick_size: number;
  step_size: number;
  status: string;
}

interface MarketData {
  market: string;
  mark_price: number;
  index_price: number;
  funding_rate: number;
  next_funding_time: string;
  open_interest: number;
  volume_24h: number;
  price_change_24h: number;
  high_24h: number;
  low_24h: number;
}

export function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [showTradingModal, setShowTradingModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"change" | "volume">("volume")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMarkets()
  }, [])

  useEffect(() => {
    if (selectedMarket) {
      loadMarketData(selectedMarket.market)
    }
  }, [selectedMarket])

  const loadMarkets = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.getMarkets()
      setMarkets(data.filter(m => m.status === 'active'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markets')
      console.error('Error loading markets:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMarketData = async (market: string) => {
    try {
      const data = await apiClient.getMarketData(market)
      setMarketData(data)
    } catch (err) {
      console.error('Error loading market data:', err)
    }
  }

  const filteredMarkets = markets.filter(
    (market) =>
      market.base_asset.toLowerCase().includes(searchQuery.toLowerCase()) ||
      market.market.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const sortedMarkets = [...filteredMarkets].sort((a, b) => {
    // For now, sort by market name since we don't have volume/change in the list endpoint
    return a.market.localeCompare(b.market)
  })

  const marketForDisplay = selectedMarket && marketData ? {
    symbol: selectedMarket.market,
    name: selectedMarket.base_asset,
    mark_price: marketData.mark_price,
    price_change_24h: marketData.price_change_24h,
    volume_24h: marketData.volume_24h,
    funding_rate: marketData.funding_rate,
  } : null

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading markets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-600 mb-2">Error loading markets</p>
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={loadMarkets}
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
      </div>

      <div className="space-y-3">
        {sortedMarkets.length > 0 ? (
          sortedMarkets.map((market) => (
            <MarketCard
              key={market.market}
              market={{
                symbol: market.market,
                name: market.base_asset,
                mark_price: 0, // Will be loaded when selected
                price_change_24h: 0,
                volume_24h: 0,
                funding_rate: 0,
              }}
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

      {marketForDisplay && !showTradingModal && (
        <MarketDetails
          market={marketForDisplay}
          onClose={() => {
            setSelectedMarket(null)
            setMarketData(null)
          }}
          onTrade={() => setShowTradingModal(true)}
        />
      )}

      {marketForDisplay && showTradingModal && (
        <TradingModal
          market={marketForDisplay}
          onClose={() => {
            setShowTradingModal(false)
            setSelectedMarket(null)
            setMarketData(null)
          }}
        />
      )}
    </div>
  )
}
