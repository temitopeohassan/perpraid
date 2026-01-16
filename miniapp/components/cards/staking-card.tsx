"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Clock, DollarSign, ArrowRight } from "lucide-react"
import { useStaking } from "@/hooks/use-staking"
import { formatDistanceToNow } from "date-fns"

interface StakingCardProps {
  onStakeClick?: () => void
  onUnstakeClick?: () => void
  onBridgeAllowanceClick?: () => void
}

export function StakingCard({ 
  onStakeClick, 
  onUnstakeClick,
  onBridgeAllowanceClick 
}: StakingCardProps) {
  const { stakingData, isLoading } = useStaking()

  const tradingAllowance = parseFloat(stakingData?.tradingAllowance || "0")
  const totalAccumulated = parseFloat(stakingData?.totalAccumulated || "0")
  const activeStakes = stakingData?.userStakes?.filter((s) => s.isActive) || []
  const totalStaked = activeStakes.length

  return (
    <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Staking & Yield
            </CardTitle>
            <CardDescription className="text-purple-100 mt-1">
              Stake funds to earn trading allowance
            </CardDescription>
          </div>
          {totalStaked > 0 && (
            <Badge variant="secondary" className="bg-purple-500 text-white">
              {totalStaked} Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trading Allowance */}
        <div className="bg-purple-500/30 rounded-lg p-4 border border-purple-400/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <span className="text-sm font-medium text-purple-100">Trading Allowance</span>
            </div>
            <Badge variant="secondary" className="bg-green-500 text-white">
              Weekly
            </Badge>
          </div>
          <p className="text-3xl font-bold mt-2">
            ${tradingAllowance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-purple-200 mt-1">
            Available to bridge to dYdX
          </p>
          {tradingAllowance > 0 && (
            <Button
              onClick={onBridgeAllowanceClick}
              className="w-full mt-3 bg-white text-purple-700 hover:bg-purple-50"
              size="sm"
            >
              Bridge to dYdX
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Total Accumulated */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-400/20">
            <p className="text-xs text-purple-200 mb-1">Total Yield</p>
            <p className="text-xl font-semibold">
              ${totalAccumulated.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-400/20">
            <p className="text-xs text-purple-200 mb-1">Active Stakes</p>
            <p className="text-xl font-semibold">{totalStaked}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onStakeClick}
            className="flex-1 bg-white text-purple-700 hover:bg-purple-50"
            disabled={isLoading}
          >
            Stake
          </Button>
          {totalStaked > 0 && (
            <Button
              onClick={onUnstakeClick}
              variant="outline"
              className="flex-1 border-purple-300 text-white hover:bg-purple-500/50"
              disabled={isLoading}
            >
              Unstake
            </Button>
          )}
        </div>

        {/* Next Distribution Info */}
        {totalAccumulated > 0 && (
          <div className="flex items-center gap-2 text-xs text-purple-200 pt-2 border-t border-purple-400/30">
            <Clock className="h-4 w-4" />
            <span>Allowance distributed weekly</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
