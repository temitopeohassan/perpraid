"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStaking, type IncentiveKey } from "@/hooks/use-staking"
import { useAccount } from "wagmi"
import { parseUnits, Address } from "viem"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface StakingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "stake" | "unstake"
  stakeIndex?: number
  incentiveKey?: IncentiveKey
}

export function StakingModal({
  open,
  onOpenChange,
  mode,
  stakeIndex,
  incentiveKey,
}: StakingModalProps) {
  const { address } = useAccount()
  const { stake, unstake, isLoading } = useStaking()
  const [tokenId, setTokenId] = useState("")
  const [rewardToken, setRewardToken] = useState("")
  const [pool, setPool] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [refundee, setRefundee] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === "stake") {
      if (!tokenId || !rewardToken || !pool || !startTime || !endTime || !refundee) {
        toast.error("Please fill in all fields")
        return
      }

      try {
        const key: IncentiveKey = {
          rewardToken: rewardToken as Address,
          pool: pool as Address,
          startTime: BigInt(startTime),
          endTime: BigInt(endTime),
          refundee: refundee as Address,
        }

        const result = await stake(BigInt(tokenId), key)
        if (result) {
          toast.success("Staking transaction submitted!")
          onOpenChange(false)
          // Reset form
          setTokenId("")
          setRewardToken("")
          setPool("")
          setStartTime("")
          setEndTime("")
          setRefundee("")
        }
      } catch (error) {
        console.error("Stake error:", error)
      }
    } else if (mode === "unstake") {
      if (stakeIndex === undefined || !incentiveKey) {
        toast.error("Missing stake information")
        return
      }

      try {
        const result = await unstake(BigInt(stakeIndex), incentiveKey)
        if (result) {
          toast.success("Unstaking transaction submitted!")
          onOpenChange(false)
        }
      } catch (error) {
        console.error("Unstake error:", error)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "stake" ? "Stake LP Position" : "Unstake LP Position"}
          </DialogTitle>
          <DialogDescription>
            {mode === "stake"
              ? "Stake your Uniswap V3 LP NFT to start earning yield. The yield will be deposited as trading allowance weekly."
              : "Unstake your position to withdraw your LP NFT. Any pending rewards will be claimed automatically."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {mode === "stake" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="tokenId">LP NFT Token ID</Label>
                <Input
                  id="tokenId"
                  type="text"
                  placeholder="123456"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rewardToken">Reward Token Address</Label>
                <Input
                  id="rewardToken"
                  type="text"
                  placeholder="0x..."
                  value={rewardToken}
                  onChange={(e) => setRewardToken(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pool">Pool Address</Label>
                <Input
                  id="pool"
                  type="text"
                  placeholder="0x..."
                  value={pool}
                  onChange={(e) => setPool(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time (Unix)</Label>
                  <Input
                    id="startTime"
                    type="text"
                    placeholder="1234567890"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (Unix)</Label>
                  <Input
                    id="endTime"
                    type="text"
                    placeholder="1234567890"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refundee">Refundee Address</Label>
                <Input
                  id="refundee"
                  type="text"
                  placeholder="0x..."
                  value={refundee}
                  onChange={(e) => setRefundee(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                You are about to unstake position #{stakeIndex}. Any pending rewards will be
                automatically claimed and added to your trading allowance.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : mode === "stake" ? (
                "Stake"
              ) : (
                "Unstake"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
