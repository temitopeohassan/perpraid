"use client"

export function RiskMetricsCard() {
  const marginRatio = 0.55
  const liquidationRisk = "low"
  const warnings = ["Monitor BTC position as it approaches liquidation price"]

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-blue-50 border-blue-200 text-blue-900"
      case "medium":
        return "bg-yellow-50 border-yellow-200 text-yellow-900"
      case "high":
        return "bg-red-50 border-red-200 text-red-900"
      default:
        return "bg-gray-50 border-gray-200 text-gray-900"
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${getRiskColor(liquidationRisk)}`}>
      <h3 className="font-semibold mb-3">Risk Metrics</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Margin Ratio</span>
          <span className="font-semibold">{(marginRatio * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Liquidation Risk</span>
          <span className="font-semibold capitalize">{liquidationRisk}</span>
        </div>
        {warnings.length > 0 && (
          <div className="pt-2 border-t mt-2">
            <p className="font-semibold mb-1">Warnings</p>
            {warnings.map((warning, idx) => (
              <p key={idx} className="text-xs opacity-90">
                • {warning}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
