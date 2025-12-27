"use client"

interface BalanceCardProps {
  balance?: {
    total_balance: number;
    available_balance: number;
    margin_used: number;
    currency: string;
  } | null;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const totalBalance = balance?.total_balance || 0
  const availableBalance = balance?.available_balance || 0
  const marginUsed = balance?.margin_used || 0
  const marginUtilization = totalBalance > 0 ? (marginUsed / totalBalance) * 100 : 0

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white shadow-lg">
      <p className="text-blue-100 text-sm font-medium">Total Balance</p>
      <h2 className="text-4xl font-bold mt-2">
        ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </h2>

      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-blue-500">
        <div>
          <p className="text-blue-100 text-xs">Available</p>
          <p className="text-xl font-semibold mt-1">
            ${availableBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-blue-100 text-xs">Margin Used</p>
          <p className="text-xl font-semibold mt-1">
            ${marginUsed.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-blue-500">
        <div className="flex justify-between items-center mb-2">
          <p className="text-blue-100 text-xs">Margin Utilization</p>
          <p className="text-sm font-semibold">{marginUtilization.toFixed(1)}%</p>
        </div>
        <div className="w-full bg-blue-500 rounded-full h-1.5">
          <div 
            className="bg-red-400 h-1.5 rounded-full transition-all" 
            style={{ width: `${Math.min(marginUtilization, 100)}%` }} 
          />
        </div>
      </div>
    </div>
  )
}
