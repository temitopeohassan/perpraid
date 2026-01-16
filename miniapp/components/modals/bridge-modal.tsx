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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBridge, type BridgeDirection } from "@/hooks/use-bridge"
import { useDydxWallet } from "@/hooks/use-dydx-wallet"
import { useAccount } from "wagmi"
import { toast } from "sonner"
import { Loader2, ArrowLeftRight } from "lucide-react"

interface BridgeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BridgeModal({ open, onOpenChange }: BridgeModalProps) {
  const { address: baseAddress, isConnected: isBaseConnected } = useAccount()
  const { address: dydxAddress, isConnected: isDydxConnected, connect: connectDydx, isInstalled: isKeplrInstalled } = useDydxWallet()
  const { bridge, bridgeBaseToDydx, bridgeDydxToBase, isLoading } = useBridge()
  
  const [direction, setDirection] = useState<BridgeDirection>("base-to-dydx")
  const [amount, setAmount] = useState("")
  const [destinationAddress, setDestinationAddress] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (!destinationAddress) {
      toast.error("Please enter destination address")
      return
    }

    try {
      if (direction === "base-to-dydx") {
        if (!isBaseConnected) {
          toast.error("Please connect your Base wallet first")
          return
        }
        await bridgeBaseToDydx(amount, destinationAddress)
      } else {
        if (!isDydxConnected) {
          if (!isKeplrInstalled) {
            toast.error("Keplr wallet is not installed. Please install Keplr extension.")
            window.open("https://www.keplr.app/", "_blank")
            return
          }
          await connectDydx()
          // Wait a moment for connection
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        await bridgeDydxToBase(amount, destinationAddress)
      }
      
      onOpenChange(false)
      // Reset form
      setAmount("")
      setDestinationAddress("")
    } catch (error) {
      console.error("Bridge error:", error)
    }
  }

  // Auto-fill destination address based on direction
  const handleDirectionChange = (newDirection: BridgeDirection) => {
    setDirection(newDirection)
    if (newDirection === "base-to-dydx" && dydxAddress) {
      setDestinationAddress(dydxAddress)
    } else if (newDirection === "dydx-to-base" && baseAddress) {
      setDestinationAddress(baseAddress)
    } else {
      setDestinationAddress("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Bridge USDC
          </DialogTitle>
          <DialogDescription>
            Bridge USDC between Base and dYdX chains
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Direction Selector */}
          <div className="space-y-2">
            <Label htmlFor="direction">Bridge Direction</Label>
            <Select value={direction} onValueChange={(value) => handleDirectionChange(value as BridgeDirection)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="base-to-dydx">Base → dYdX</SelectItem>
                <SelectItem value="dydx-to-base">dYdX → Base</SelectItem>
              </SelectContent>
            </Select>
            {direction === "base-to-dydx" && !isBaseConnected && (
              <p className="text-sm text-muted-foreground">
                Connect your Base wallet to bridge from Base
              </p>
            )}
            {direction === "dydx-to-base" && !isDydxConnected && (
              <p className="text-sm text-muted-foreground">
                {isKeplrInstalled 
                  ? "Connect your Keplr wallet to bridge from dYdX"
                  : "Install Keplr wallet to bridge from dYdX"}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              step="0.000001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Destination Address */}
          <div className="space-y-2">
            <Label htmlFor="destination">
              {direction === "base-to-dydx" ? "dYdX Address" : "Base Address"}
            </Label>
            <Input
              id="destination"
              type="text"
              placeholder={direction === "base-to-dydx" ? "dydx1..." : "0x..."}
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              required
            />
            {direction === "base-to-dydx" && dydxAddress && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDestinationAddress(dydxAddress)}
              >
                Use Connected dYdX Address
              </Button>
            )}
            {direction === "dydx-to-base" && baseAddress && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDestinationAddress(baseAddress)}
              >
                Use Connected Base Address
              </Button>
            )}
          </div>

          {/* Connect Wallet Button for dYdX */}
          {direction === "dydx-to-base" && !isDydxConnected && (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await connectDydx()
                } catch (error) {
                  console.error("Failed to connect dYdX wallet:", error)
                }
              }}
            >
              Connect Keplr Wallet
            </Button>
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
            <Button 
              type="submit" 
              disabled={isLoading || (direction === "base-to-dydx" && !isBaseConnected) || (direction === "dydx-to-base" && !isDydxConnected)}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Bridging...
                </>
              ) : (
                "Bridge"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
