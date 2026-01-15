"use client"

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { wagmiConfig } from '@/lib/wagmi-config'
import { WalletProvider } from '@/hooks/use-wallet'
import { isFarcasterEnvironment } from '@/lib/farcaster-detection'
import { useState, useEffect } from 'react'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  // Use state to avoid hydration mismatch - only check on client side
  const [isFarcaster, setIsFarcaster] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsFarcaster(isFarcasterEnvironment())
  }, [])

  // During SSR, always render the same structure to avoid hydration mismatch
  // After mount, we can conditionally render based on environment
  if (!mounted) {
    // Render default structure during SSR
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <WalletProvider>
              {children}
            </WalletProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    )
  }

  // After mount, conditionally render based on environment
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {/* Only wrap with RainbowKitProvider when outside Farcaster */}
        {!isFarcaster ? (
          <RainbowKitProvider>
            <WalletProvider>
              {children}
            </WalletProvider>
          </RainbowKitProvider>
        ) : (
          <WalletProvider>
            {children}
          </WalletProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
