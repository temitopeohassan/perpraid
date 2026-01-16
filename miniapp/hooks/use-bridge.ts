'use client'

import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { BaseToDydxBridge, BidirectionalBridge } from '@/lib/skip-bridge'
import { DydxToBaseBridge } from '@/lib/dydx-to-base-bridge'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export type BridgeDirection = 'base-to-dydx' | 'dydx-to-base'

interface UseBridgeReturn {
  bridge: (amount: string, destinationAddress: string, direction?: BridgeDirection) => Promise<{ txHash: string; trackingId: string } | null>
  bridgeBaseToDydx: (amount: string, dydxAddress: string) => Promise<{ txHash: string; trackingId: string } | null>
  bridgeDydxToBase: (amount: string, baseAddress: string) => Promise<{ txHash: string; trackingId: string } | null>
  getRoute: (amount: string, destinationAddress: string, direction?: BridgeDirection) => Promise<any>
  getRouteBaseToDydx: (amount: string, dydxAddress: string) => Promise<any>
  getRouteDydxToBase: (amount: string, baseAddress: string) => Promise<any>
  trackBridge: (trackingId: string) => Promise<any>
  isLoading: boolean
  error: string | null
  bridgeInstance: BaseToDydxBridge | null
  dydxBridgeInstance: DydxToBaseBridge | null
}

export function useBridge() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bridgeInstance, setBridgeInstance] = useState<BaseToDydxBridge | null>(null)
  const [dydxBridgeInstance, setDydxBridgeInstance] = useState<DydxToBaseBridge | null>(null)
  
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  // Get dYdX wallet connection
  const { 
    address: dydxAddress, 
    isConnected: isDydxConnected,
    signTransaction,
    sendTransaction 
  } = useDydxWallet()

  // Initialize dYdX bridge instance when wallet is connected
  useEffect(() => {
    if (isDydxConnected && dydxAddress && signTransaction && sendTransaction) {
      const wallet: DydxWallet = {
        address: dydxAddress,
        signTransaction,
        sendTransaction,
      }
      const bridge = new DydxToBaseBridge(wallet)
      setDydxBridgeInstance(bridge)
    } else {
      setDydxBridgeInstance(null)
    }
  }, [isDydxConnected, dydxAddress, signTransaction, sendTransaction])

  // Initialize Base bridge instance when wallet is available
  const getBridgeInstance = useCallback((): BaseToDydxBridge | null => {
    if (!walletClient) {
      return null
    }

    // Create bridge instance - viem wallet client can be passed directly
    const bridge = new BaseToDydxBridge()
    bridge.setProvider(walletClient)
    
    return bridge
  }, [walletClient])

  // Initialize dYdX bridge instance (requires dYdX wallet)
  const getDydxBridgeInstance = useCallback((): DydxToBaseBridge | null => {
    // This will be set when dYdX wallet is connected
    // The wallet instance is passed from useDydxWallet hook
    return dydxBridgeInstance || new DydxToBaseBridge()
  }, [dydxBridgeInstance])

  // Bridge from Base to dYdX
  const bridgeBaseToDydx = useCallback(async (amount: string, dydxAddress: string) => {
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

  // Bridge from dYdX to Base
  const bridgeDydxToBase = useCallback(async (amount: string, baseAddress: string) => {
    if (!isDydxConnected || !dydxAddress) {
      setError('dYdX wallet not connected')
      toast.error('Please connect your dYdX wallet first')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const instance = getDydxBridgeInstance()
      if (!instance) {
        throw new Error('dYdX bridge instance not available. Please connect your dYdX wallet first.')
      }

      // Format amount
      const formattedAmount = DydxToBaseBridge.formatAmount(amount)
      
      const result = await instance.bridge(formattedAmount, baseAddress)
      
      // Save bridge transaction to backend
      try {
        await apiClient.saveBridgeTransaction({
          tx_hash: result.txHash,
          tracking_id: result.trackingId,
          source_chain: 'dydx',
          dest_chain: 'base',
          amount: parseFloat(amount),
          base_address: baseAddress,
        })
      } catch (err) {
        console.warn('Failed to save bridge transaction to backend:', err)
      }
      
      toast.success(`Bridge transaction submitted! Hash: ${result.txHash.slice(0, 10)}...`)
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bridge tokens from dYdX'
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [isDydxConnected, dydxAddress, getDydxBridgeInstance])

  // Unified bridge function that routes based on direction
  const bridge = useCallback(async (
    amount: string, 
    destinationAddress: string, 
    direction: BridgeDirection = 'base-to-dydx'
  ) => {
    if (direction === 'base-to-dydx') {
      return bridgeBaseToDydx(amount, destinationAddress)
    } else {
      return bridgeDydxToBase(amount, destinationAddress)
    }
  }, [bridgeBaseToDydx, bridgeDydxToBase])

  // Get route from Base to dYdX
  const getRouteBaseToDydx = useCallback(async (amount: string, dydxAddress: string) => {
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

  // Get route from dYdX to Base
  const getRouteDydxToBase = useCallback(async (amount: string, baseAddress: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const instance = getDydxBridgeInstance()
      if (!instance) {
        throw new Error('dYdX bridge instance not available')
      }

      const formattedAmount = DydxToBaseBridge.formatAmount(amount)
      const route = await instance.getRoute(formattedAmount, baseAddress)
      
      return route
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get route'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [getDydxBridgeInstance])

  // Unified getRoute function
  const getRoute = useCallback(async (
    amount: string, 
    destinationAddress: string, 
    direction: BridgeDirection = 'base-to-dydx'
  ) => {
    if (direction === 'base-to-dydx') {
      return getRouteBaseToDydx(amount, destinationAddress)
    } else {
      return getRouteDydxToBase(amount, destinationAddress)
    }
  }, [getRouteBaseToDydx, getRouteDydxToBase])

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
    bridgeBaseToDydx,
    bridgeDydxToBase,
    getRoute,
    getRouteBaseToDydx,
    getRouteDydxToBase,
    trackBridge,
    isLoading,
    error,
    bridgeInstance: bridgeInstance || getBridgeInstance(),
    dydxBridgeInstance: dydxBridgeInstance || getDydxBridgeInstance(),
  }
}

