"use client"

export function PerformanceChart() {
  const performanceData = [
    { day: "Mon", pnl: 450 },
    { day: "Tue", pnl: 320 },
    { day: "Wed", pnl: 890 },
    { day: "Thu", pnl: -150 },
    { day: "Fri", pnl: 1200 },
    { day: "Sat", pnl: 675 },
    { day: "Sun", pnl: 425 },
  ]

  const maxPnl = Math.max(...performanceData.map((d) => d.pnl))
  const minPnl = Math.min(...performanceData.map((d) => d.pnl))
  const range = maxPnl - minPnl
  const totalWeekPnl = performanceData.reduce((sum, d) => sum + d.pnl, 0)

  return (
    <div className="bg-white rounded-lg border border-blue-100 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">7-Day Performance</h3>
        <span className={`text-xl font-bold ${totalWeekPnl >= 0 ? "text-blue-600" : "text-red-600"}`}>
          {totalWeekPnl >= 0 ? "+" : ""}
          {totalWeekPnl}
        </span>
      </div>

      <div className="flex items-end justify-between h-32 gap-1.5">
        {performanceData.map((data, idx) => {
          const height = range > 0 ? ((data.pnl - minPnl) / range) * 100 : 50
          const isPositive = data.pnl >= 0

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={`w-full rounded-t transition ${isPositive ? "bg-blue-500" : "bg-red-500"}`}
                style={{ height: `${Math.max(height, 5)}%` }}
              />
              <span className="text-xs text-gray-600">{data.day}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
        <p>
          Total This Week: <span className="font-semibold text-gray-900">${totalWeekPnl}</span>
        </p>
      </div>
    </div>
  )
}
