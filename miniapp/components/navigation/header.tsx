"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Menu, Home, TrendingUp, Wallet } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import { isFarcasterEnvironment } from "@/lib/farcaster-detection"

interface HeaderProps {
  onMenuClick?: (item: "home" | "positions" | "wallet") => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useWallet()

  // Check environment only on client side to avoid hydration issues
  useEffect(() => {
    setMounted(true)
    setIsFarcaster(isFarcasterEnvironment())
  }, [])

  const menuItems = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "positions" as const, label: "Positions", icon: TrendingUp },
    { id: "wallet" as const, label: "Wallet", icon: Wallet },
  ]

  const handleMenuClick = (item: "home" | "positions" | "wallet") => {
    setIsOpen(false)
    onMenuClick?.(item)
  }

  const formatAddress = (addr: string | null) => {
    if (!addr) return null
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-24 items-center px-4">
        <Drawer open={isOpen} onOpenChange={setIsOpen} direction="left">
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 h-10 w-10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="w-3/4 sm:max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Menu</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-2 p-4">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <DrawerClose key={item.id} asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3"
                      onClick={() => handleMenuClick(item.id)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Button>
                  </DrawerClose>
                )
              })}
            </div>
          </DrawerContent>
        </Drawer>

        <div className="flex items-center gap-3 flex-1">
          <Image
            src="/logo.png"
            alt="PERP Raid Logo"
            width={80}
            height={80}
            className="h-16 w-16 object-contain"
            priority
          />
          <span className="text-xl font-semibold">PERP Raid</span>
        </div>

        {/* Show RainbowKit ConnectButton when outside Farcaster */}
        {/* Only render after mount to avoid hydration issues */}
        {mounted ? (
          !isFarcaster ? (
            <ConnectButton />
          ) : isConnected && address ? (
            /* Show wallet address when inside Farcaster and connected */
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {formatAddress(address)}
              </span>
            </div>
          ) : null
        ) : (
          /* Show placeholder during SSR to avoid hydration mismatch */
          <div className="h-10 w-10" />
        )}
      </div>
    </header>
  )
}

