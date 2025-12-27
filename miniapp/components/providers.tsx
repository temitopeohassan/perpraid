"use client"

import { WalletProvider } from '@/hooks/use-wallet'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      {children}
    </WalletProvider>
  )
}
