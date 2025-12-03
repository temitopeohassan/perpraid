"use client"

import { useState } from "react"

interface TradingModalProps {
  market: {
    symbol: string
    name: string
    mark_price: number
  }
  onClose: () => void
}

export function TradingModal({ market, onClose }: TradingModalProps) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY")
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET")
  const [size, setSize] = useState("")
  const [leverage, setLeverage] = useState(1)
  const [price, setPrice] = useState("")

  const handleSubmit = () => {
    console.log("[v0] Order submission:", { market: market.symbol, side, orderType, size, leverage, price })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{market.name}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("BUY")}
            className={`py-3 rounded-lg font-semibold transition ${side === "BUY" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}
          >
            Long
          </button>
          <button
            onClick={() => setSide("SELL")}
            className={`py-3 rounded-lg font-semibold transition ${side === "SELL" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-900 hover:bg-gray-200"}`}
          >
            Short
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOrderType("MARKET")}
            className={`py-2 rounded-lg text-sm font-medium transition ${orderType === "MARKET" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-900"}`}
          >
            Market
          </button>
          <button
            onClick={() => setOrderType("LIMIT")}
            className={`py-2 rounded-lg text-sm font-medium transition ${orderType === "LIMIT" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-900"}`}
          >
            Limit
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
          <input
            type="number"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Enter size"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {orderType === "LIMIT" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Leverage: {leverage}x</label>
          <input
            type="range"
            min="1"
            max="20"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          <p>Est. Entry: ${market.mark_price}</p>
          <p>
            Margin Required: ${size ? ((Number.parseFloat(size) * market.mark_price) / leverage).toFixed(2) : "0.00"}
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!size}
          className={`w-full py-3 rounded-lg font-semibold text-white transition ${
            !size
              ? "bg-gray-300 cursor-not-allowed"
              : side === "BUY"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {side === "BUY" ? "Open Long" : "Open Short"}
        </button>
      </div>
    </div>
  )
}
