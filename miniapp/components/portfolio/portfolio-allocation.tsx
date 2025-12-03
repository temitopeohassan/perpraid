"use client"

export function PortfolioAllocation() {
  const positions = [
    { market: "BTC-PERP", allocation: 45, color: "bg-blue-600" },
    { market: "ETH-PERP", allocation: 30, color: "bg-blue-500" },
    { market: "SOL-PERP", allocation: 15, color: "bg-red-500" },
    { market: "ARB-PERP", allocation: 10, color: "bg-red-600" },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Exposure by Market</h3>

      <div className="space-y-3">
        {positions.map((position) => (
          <div key={position.market}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-900">{position.market}</span>
              <span className="text-sm font-semibold text-gray-900">{position.allocation}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${position.color} h-2 rounded-full transition-all`}
                style={{ width: `${position.allocation}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-600">Long Exposure</p>
          <p className="text-lg font-semibold text-blue-600">65%</p>
        </div>
        <div>
          <p className="text-gray-600">Short Exposure</p>
          <p className="text-lg font-semibold text-red-600">35%</p>
        </div>
      </div>
    </div>
  )
}
