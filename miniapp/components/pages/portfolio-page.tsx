"use client"

import { BalanceCard } from "@/components/cards/balance-card"
import { RiskMetricsCard } from "@/components/cards/risk-metrics-card"
import { PortfolioAllocation } from "@/components/portfolio/portfolio-allocation"
import { PerformanceChart } from "@/components/portfolio/performance-chart"
import { apiClient } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"

export function PortfolioPage() {
  const { address, isConnected } = useWallet()
  const [balance, setBalance] = useState<any>(null)
  const [riskMetrics, setRiskMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isConnected) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [isConnected])

  const loadData = async () => {
    try {
      setLoading(true)
      const [balanceData, riskData] = await Promise.all([
        apiClient.getBalance(),
        apiClient.getRiskMetrics(),
      ])
      setBalance(balanceData)
      setRiskMetrics(riskData)
    } catch (err) {
      console.error('Error loading portfolio data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async () => {
    // Implement deposit logic
    console.log('Deposit clicked')
  }

  const handleWithdraw = async () => {
    // Implement withdraw logic
    console.log('Withdraw clicked')
  }

  if (!isConnected) {
    return (
      <div className="p-4 space-y-4">
        <header className="pt-2">
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-600 text-sm mt-1">Wallet not connected</p>
        </header>
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-3">Please connect your wallet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <header className="pt-2">
        <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
        <p className="text-gray-600 text-sm mt-1">
          Wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
        </p>
      </header>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading portfolio...</p>
        </div>
      ) : (
        <>
          <BalanceCard balance={balance} />
          <PerformanceChart />
          <RiskMetricsCard riskMetrics={riskMetrics} />
          <PortfolioAllocation />
          <div className="bg-white rounded-lg border border-red-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDeposit}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
              >
                Deposit
              </button>
              <button
                onClick={handleWithdraw}
                className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition"
              >
                Withdraw
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
