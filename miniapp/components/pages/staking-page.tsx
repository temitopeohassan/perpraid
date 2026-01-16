"use client"

import { useState } from "react"
import { StakingCard } from "@/components/cards/staking-card"
import { StakingModal } from "@/components/modals/staking-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useStaking, type IncentiveKey } from "@/hooks/use-staking"
import { useBridge } from "@/hooks/use-bridge"
import { formatDistanceToNow } from "date-fns"
import { ExternalLink, TrendingUp, Clock, DollarSign } from "lucide-react"
import { formatUnits } from "viem"

export function StakingPage() {
  const { stakingData, distributeWeeklyAllowance, isLoading } = useStaking()
  const { bridge } = useBridge()
  const [stakingModalOpen, setStakingModalOpen] = useState(false)
  const [unstakeModalOpen, setUnstakeModalOpen] = useState(false)
  const [selectedStakeIndex, setSelectedStakeIndex] = useState<number | undefined>()
  const [selectedIncentiveKey, setSelectedIncentiveKey] = useState<IncentiveKey | undefined>()

  const handleStakeClick = () => {
    setStakingModalOpen(true)
  }

  const handleUnstakeClick = (stakeIndex: number, incentiveKey: IncentiveKey) => {
    setSelectedStakeIndex(stakeIndex)
    setSelectedIncentiveKey(incentiveKey)
    setUnstakeModalOpen(true)
  }

  const handleBridgeAllowance = async () => {
    const allowance = parseFloat(stakingData?.tradingAllowance || "0")
    if (allowance <= 0) {
      return
    }

    // First distribute the weekly allowance if needed
    // Then bridge it
    // For now, we'll assume the user has already distributed it
    // In production, you'd want to check if distribution is needed first
    
    // Get dYdX address from user (you might want to add this to user settings)
    const dydxAddress = prompt("Enter your dYdX address:")
    if (!dydxAddress) {
      return
    }

    try {
      // Bridge the trading allowance
      await bridge(allowance.toString(), dydxAddress)
    } catch (error) {
      console.error("Bridge error:", error)
    }
  }

  const handleDistributeAllowance = async () => {
    try {
      await distributeWeeklyAllowance()
    } catch (error) {
      console.error("Distribute error:", error)
    }
  }

  const activeStakes = stakingData?.userStakes?.filter((s) => s.isActive) || []
  const tradingAllowance = parseFloat(stakingData?.tradingAllowance || "0")

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Staking</h1>
          <p className="text-muted-foreground mt-1">
            Stake your funds to earn yield and trading allowance
          </p>
        </div>
      </div>

      {/* Staking Overview Card */}
      <StakingCard
        onStakeClick={handleStakeClick}
        onBridgeAllowanceClick={handleBridgeAllowance}
      />

      {/* Active Stakes */}
      {activeStakes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Stakes</CardTitle>
            <CardDescription>Your currently staked LP positions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token ID</TableHead>
                  <TableHead>Staked At</TableHead>
                  <TableHead>Last Claimed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeStakes.map((stake, index) => (
                  <TableRow key={stake.tokenId.toString()}>
                    <TableCell className="font-mono">
                      #{stake.tokenId.toString()}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(Number(stake.stakedAt) * 1000), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(Number(stake.lastClaimed) * 1000), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-500">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUnstakeClick(index, {
                            rewardToken: "0x" as `0x${string}`,
                            pool: "0x" as `0x${string}`,
                            startTime: 0n,
                            endTime: 0n,
                            refundee: "0x" as `0x${string}`,
                          })
                        }
                      >
                        Unstake
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Trading Allowance Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Trading Allowance
          </CardTitle>
          <CardDescription>
            Your weekly trading allowance from staking yield
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Current Allowance</p>
              <p className="text-2xl font-bold">
                ${tradingAllowance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Accumulated</p>
              <p className="text-2xl font-bold">
                ${parseFloat(stakingData?.totalAccumulated || "0").toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {tradingAllowance > 0 && (
              <>
                <Button onClick={handleDistributeAllowance} disabled={isLoading}>
                  Distribute Weekly Allowance
                </Button>
                <Button onClick={handleBridgeAllowance} variant="default">
                  Bridge to dYdX
                </Button>
              </>
            )}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  How Trading Allowance Works
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Yield from your staked positions is accumulated and distributed as trading
                  allowance every week. This allowance can be bridged to dYdX for trading. Staking
                  happens on Base, and the allowance is bridged to dYdX when you're ready to trade.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <StakingModal
        open={stakingModalOpen}
        onOpenChange={setStakingModalOpen}
        mode="stake"
      />
      {selectedStakeIndex !== undefined && selectedIncentiveKey && (
        <StakingModal
          open={unstakeModalOpen}
          onOpenChange={setUnstakeModalOpen}
          mode="unstake"
          stakeIndex={selectedStakeIndex}
          incentiveKey={selectedIncentiveKey}
        />
      )}
    </div>
  )
}
