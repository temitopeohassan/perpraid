'use client'

import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { BaseToDydxBridge } from '@/lib/skip-bridge'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface UseBridgeReturn {
  bridge: (amount: string, dydxAddress: string) => Promise<{ txHash: string; trackingId: string } | null>
  getRoute: (amount: string, dydxAddress: string) => Promise<any>
  trackBridge: (trackingId: string) => Promise<any>
  isLoading: boolean
  error: string | null
  bridgeInstance: BaseToDydxBridge | null
}

export function useBridge(): UseBridgeReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bridgeInstance, setBridgeInstance] = useState<BaseToDydxBridge | null>(null)
  
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  // Initialize bridge instance when wallet is available
  const getBridgeInstance = useCallback((): BaseToDydxBridge | null => {
    if (!walletClient) {
      return null
    }

    // Create bridge instance - viem wallet client can be passed directly
    const bridge = new BaseToDydxBridge()
    bridge.setProvider(walletClient)
    
    return bridge
  }, [walletClient])

  const bridge = useCallback(async (amount: string, dydxAddress: string) => {
    if (!address) {
      setError('Wallet not connected')
      toast.error('Please connect your wallet first')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const instance = getBridgeInstance()
      if (!instance) {
        throw new Error('Bridge instance not available. Please connect your wallet.')
      }

      // Format amount (assuming amount is in USDC, needs to be in smallest unit)
      const formattedAmount = BaseToDydxBridge.formatAmount(amount)
      
      const result = await instance.bridge(formattedAmount, dydxAddress)
      
      // Save bridge transaction to backend
      try {
        await apiClient.saveBridgeTransaction({
          tx_hash: result.txHash,
          tracking_id: result.trackingId,
          source_chain: 'base',
          dest_chain: 'dydx',
          amount: parseFloat(amount),
          dydx_address: dydxAddress,
        })
      } catch (err) {
        // Non-critical error - transaction was successful even if save fails
        console.warn('Failed to save bridge transaction to backend:', err)
      }
      
      toast.success(`Bridge transaction submitted! Hash: ${result.txHash.slice(0, 10)}...`)
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bridge tokens'
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [address, getBridgeInstance])

  const getRoute = useCallback(async (amount: string, dydxAddress: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const instance = getBridgeInstance()
      if (!instance) {
        throw new Error('Bridge instance not available')
      }

      const formattedAmount = BaseToDydxBridge.formatAmount(amount)
      const route = await instance.getRoute(formattedAmount, dydxAddress)
      
      return route
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get route'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [getBridgeInstance])

  const trackBridge = useCallback(async (trackingId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const instance = getBridgeInstance()
      if (!instance) {
        throw new Error('Bridge instance not available')
      }

      const status = await instance.trackBridge(trackingId)
      return status
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track bridge'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [getBridgeInstance])

  return {
    bridge,
    getRoute,
    trackBridge,
    isLoading,
    error,
    bridgeInstance: bridgeInstance || getBridgeInstance(),
  }
}

