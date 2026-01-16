"use client"

import { useEffect, createContext, useContext, ReactNode, useState, useCallback } from 'react'
import { isKeplrInstalled, getKeplr, enableDydxChain, getDydxAddress, DYDX_CHAIN_INFO } from '@/lib/keplr-config'
import { toast } from 'sonner'

interface DydxWalletContextType {
  address: string | null
  isConnected: boolean
  isInstalled: boolean
  connect: () => Promise<void>
  disconnect: () => void
  signTransaction: (txBody: any, signDoc: any) => Promise<any>
  sendTransaction: (signedTx: Uint8Array) => Promise<string>
  getOfflineSigner: () => any
}

const DydxWalletContext = createContext<DydxWalletContextType | undefined>(undefined)

export function DydxWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [keplr, setKeplr] = useState<any>(null)

  // Check if Keplr is installed
  useEffect(() => {
    setIsInstalled(isKeplrInstalled())
    if (isKeplrInstalled()) {
      setKeplr(getKeplr())
    }
  }, [])

  // Try to reconnect on mount if previously connected
  useEffect(() => {
    if (isInstalled && typeof window !== 'undefined') {
      const savedAddress = localStorage.getItem('dydx_wallet_address')
      if (savedAddress) {
        // Verify address is still valid
        connect().catch(() => {
          // If connection fails, clear saved address
          localStorage.removeItem('dydx_wallet_address')
        })
      }
    }
  }, [isInstalled])

  const connect = useCallback(async () => {
    try {
      if (!isInstalled) {
        toast.error('Keplr wallet is not installed. Please install Keplr extension.')
        window.open('https://www.keplr.app/', '_blank')
        return
      }

      // Enable dYdX chain
      await enableDydxChain()

      // Get address
      const dydxAddress = await getDydxAddress()
      
      setAddress(dydxAddress)
      setIsConnected(true)
      localStorage.setItem('dydx_wallet_address', dydxAddress)
      
      toast.success('dYdX wallet connected!')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect dYdX wallet'
      toast.error(errorMessage)
      throw error
    }
  }, [isInstalled])

  const disconnect = useCallback(() => {
    setAddress(null)
    setIsConnected(false)
    localStorage.removeItem('dydx_wallet_address')
    toast.success('dYdX wallet disconnected')
  }, [])

  const signTransaction = useCallback(async (txBody: any, signDoc: any) => {
    if (!keplr || !address) {
      throw new Error('dYdX wallet not connected')
    }

    try {
      // Use Keplr's signDirect for Cosmos transactions
      const signResponse = await keplr.signDirect(
        DYDX_CHAIN_INFO.chainId,
        address,
        signDoc,
        {
          preferNoSetFee: false,
          preferNoSetMemo: true,
        }
      )

      return signResponse
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign transaction'
      toast.error(errorMessage)
      throw error
    }
  }, [keplr, address])

  const sendTransaction = useCallback(async (signedTx: Uint8Array | any): Promise<string> => {
    if (!keplr) {
      throw new Error('Keplr wallet not available')
    }

    try {
      // Broadcast transaction using Keplr
      // signedTx can be Uint8Array (raw bytes) or a sign response object
      let txBytes: Uint8Array
      
      if (signedTx instanceof Uint8Array) {
        txBytes = signedTx
      } else if (signedTx.signed) {
        // If it's a Keplr sign response, extract the signed bytes
        // Keplr's signDirect returns { signed: SignDoc, signature: { ... } }
        // We need to encode it properly
        const { TxRaw } = await import('@cosmjs/proto-signing')
        const txRaw = TxRaw.fromPartial({
          bodyBytes: signedTx.signed.bodyBytes,
          authInfoBytes: signedTx.signed.authInfoBytes,
          signatures: [signedTx.signature.signature],
        })
        txBytes = TxRaw.encode(txRaw).finish()
      } else {
        throw new Error('Invalid signed transaction format')
      }

      const result = await keplr.sendTx(
        DYDX_CHAIN_INFO.chainId,
        txBytes,
        'sync' // 'sync' | 'async' | 'block'
      )

      // Parse transaction hash from result
      // Keplr returns the transaction hash
      return result.transactionHash || result.txhash || result.toString()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send transaction'
      toast.error(errorMessage)
      throw error
    }
  }, [keplr])

  const getOfflineSigner = useCallback(() => {
    if (!keplr) {
      throw new Error('Keplr wallet not available')
    }

    // Get offline signer for Cosmos transactions
    return keplr.getOfflineSigner(DYDX_CHAIN_INFO.chainId)
  }, [keplr])

  return (
    <DydxWalletContext.Provider
      value={{
        address,
        isConnected,
        isInstalled,
        connect,
        disconnect,
        signTransaction,
        sendTransaction,
        getOfflineSigner,
      }}
    >
      {children}
    </DydxWalletContext.Provider>
  )
}

export function useDydxWallet() {
  const context = useContext(DydxWalletContext)
  if (context === undefined) {
    throw new Error('useDydxWallet must be used within a DydxWalletProvider')
  }
  return context
}
