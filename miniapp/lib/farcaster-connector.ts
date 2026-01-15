import { createConnector } from 'wagmi'
import { sdk } from '@farcaster/miniapp-sdk'

// Helper to get provider (handles both sync and async)
async function getProvider() {
  try {
    // Check if SDK is available
    if (!sdk || !sdk.wallet || typeof sdk.wallet.getEthereumProvider !== 'function') {
      console.debug('Farcaster SDK not available or wallet methods missing')
      return null
    }

    let provider: any
    try {
      provider = sdk.wallet.getEthereumProvider()
    } catch (sdkError) {
      console.debug('SDK getEthereumProvider threw error:', sdkError)
      return null
    }

    // Check if it's a Promise and await if needed
    if (provider && typeof (provider as any).then === 'function') {
      try {
        provider = await (provider as Promise<any>)
      } catch (promiseError) {
        console.debug('Provider promise rejected:', promiseError)
        return null
      }
    }

    // Validate provider exists and has request method
    if (!provider) {
      return null
    }

    if (typeof provider.request !== 'function') {
      console.debug('Provider does not have request method')
      return null
    }

    return provider
  } catch (error) {
    console.debug('Failed to get Farcaster provider:', error)
    return null
  }
}

// Helper to safely make provider requests
async function safeProviderRequest(provider: any, method: string, params?: any[]): Promise<any> {
  if (!provider || typeof provider.request !== 'function') {
    throw new Error('Provider not available or invalid')
  }
  
  try {
    return await provider.request({ method, params })
  } catch (error: unknown) {
    // Safely extract error message from various error structures
    let errorMessage = 'Provider request failed'
    let errorCode: number | undefined
    let errorData: any = undefined
    
    try {
      // Handle null/undefined
      if (error === null || error === undefined) {
        errorMessage = 'Provider request failed with null/undefined error'
      }
      // Handle string errors
      else if (typeof error === 'string') {
        errorMessage = error
      }
      // Handle Error instances
      else if (error instanceof Error) {
        errorMessage = error.message || 'Provider request failed'
        errorCode = (error as any).code
        errorData = (error as any).data
      }
      // Handle object errors (be very careful with property access)
      else if (typeof error === 'object') {
        const errObj = error as Record<string, any>
        
        // Safely get message
        if (typeof errObj.message === 'string') {
          errorMessage = errObj.message
        }
        // Safely check for nested error.error.message
        else if (errObj.error !== null && errObj.error !== undefined) {
          const nestedError = errObj.error
          if (typeof nestedError === 'object' && nestedError !== null) {
            if (typeof nestedError.message === 'string') {
              errorMessage = nestedError.message
            }
          }
        }
        // Try toString if available
        else if (typeof errObj.toString === 'function') {
          try {
            errorMessage = errObj.toString()
          } catch {
            // Ignore toString errors
          }
        }
        // Last resort: try JSON.stringify
        else {
          try {
            errorMessage = JSON.stringify(error)
          } catch {
            errorMessage = 'Provider request failed (unable to stringify error)'
          }
        }
        
        // Safely get code
        if (errObj.code !== undefined && errObj.code !== null) {
          errorCode = typeof errObj.code === 'number' ? errObj.code : undefined
        } else if (errObj.error && typeof errObj.error === 'object' && errObj.error !== null) {
          const nestedError = errObj.error as Record<string, any>
          if (nestedError.code !== undefined && nestedError.code !== null) {
            errorCode = typeof nestedError.code === 'number' ? nestedError.code : undefined
          }
        }
        
        // Safely get data
        if (errObj.data !== undefined) {
          errorData = errObj.data
        }
      }
      // Handle other types
      else {
        try {
          errorMessage = String(error)
        } catch {
          errorMessage = 'Provider request failed (unable to convert error to string)'
        }
      }
    } catch (extractionError) {
      // If we can't extract the error at all, use a safe fallback
      errorMessage = 'Provider request failed (error extraction failed)'
      console.debug('Error extraction failed:', extractionError)
    }
    
    // Create a more structured error
    const structuredError = new Error(errorMessage)
    if (errorCode !== undefined) {
      (structuredError as any).code = errorCode
    }
    if (errorData !== undefined) {
      (structuredError as any).data = errorData
    }
    
    throw structuredError
  }
}

// Helper to ensure address is typed correctly
function toAddress(address: string): `0x${string}` {
  if (address.startsWith('0x')) {
    return address as `0x${string}`
  }
  return `0x${address}` as `0x${string}`
}

export const farcasterConnector = () => {
  return createConnector((config) => ({
    id: 'farcaster-miniapp',
    name: 'Farcaster Mini App',
    type: 'injected',
    async connect(parameters?) {
      try {
        const provider = await getProvider()
        if (!provider) {
          throw new Error('Farcaster wallet provider not available')
        }

        // Validate provider has request method
        if (typeof provider.request !== 'function') {
          throw new Error('Provider does not have request method')
        }

        // Use eth_requestAccounts to request connection
        let accounts: string[]
        let chainId: string
        
        try {
          accounts = await safeProviderRequest(provider, 'eth_requestAccounts') as string[]
        } catch (accountsError: any) {
          const msg = accountsError instanceof Error ? accountsError.message : String(accountsError)
          throw new Error(`Failed to request accounts: ${msg}`)
        }

        try {
          chainId = await safeProviderRequest(provider, 'eth_chainId') as string
        } catch (chainError: any) {
          const msg = chainError instanceof Error ? chainError.message : String(chainError)
          throw new Error(`Failed to get chain ID: ${msg}`)
        }

        if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
          throw new Error('No accounts returned from provider')
        }

        if (!chainId) {
          throw new Error('No chain ID returned from provider')
        }

        const formattedAccounts = accounts.map(toAddress) as readonly `0x${string}`[]

        // Return with proper type assertion to satisfy generic constraint
        return {
          accounts: formattedAccounts,
          chainId: Number(chainId),
        } as any
      } catch (error: unknown) {
        // Safely extract error message for logging - be very defensive
        let errorMsg = 'Connection failed'
        let errorToThrow: Error
        
        try {
          if (error instanceof Error) {
            errorMsg = error.message || 'Connection failed'
            errorToThrow = error
          } else if (typeof error === 'string') {
            errorMsg = error
            errorToThrow = new Error(error)
          } else if (error && typeof error === 'object') {
            // Very careful property access
            const errObj = error as Record<string, any>
            errorMsg = errObj.message || 
                      (errObj.toString && typeof errObj.toString === 'function' ? errObj.toString() : String(error)) ||
                      'Connection failed'
            errorToThrow = new Error(errorMsg)
            // Preserve code if it exists
            if (errObj.code !== undefined) {
              (errorToThrow as any).code = errObj.code
            }
          } else {
            errorMsg = String(error || 'Connection failed')
            errorToThrow = new Error(errorMsg)
          }
        } catch (extractionError) {
          // If we can't extract the error at all, use a safe fallback
          errorMsg = 'Connection failed - unable to parse error'
          errorToThrow = new Error(errorMsg)
          console.debug('Error extraction failed:', extractionError)
        }
        
        // Only log if we successfully extracted a message
        if (errorMsg !== 'Connection failed - unable to parse error') {
          console.error('Connect error:', errorMsg)
        } else {
          console.error('Connect error: [unable to parse error details]')
        }
        
        throw errorToThrow
      }
    },
    async disconnect() {
      // Farcaster handles disconnection
    },
    async getAccounts() {
      const provider = await getProvider()
      if (!provider) return [] as readonly `0x${string}`[]
      try {
        const accounts = await safeProviderRequest(provider, 'eth_accounts') as string[]
        if (!accounts || !Array.isArray(accounts)) {
          return [] as readonly `0x${string}`[]
        }
        return accounts.map(toAddress) as readonly `0x${string}`[]
      } catch (error: any) {
        console.debug('Get accounts error:', error?.message || error)
        return [] as readonly `0x${string}`[]
      }
    },
    async getChainId() {
      const provider = await getProvider()
      if (!provider) return config.chains[0].id
      try {
        const chainId = await safeProviderRequest(provider, 'eth_chainId') as string
        return Number(chainId)
      } catch (error: any) {
        console.debug('Get chainId error:', error?.message || error)
        return config.chains[0].id
      }
    },
    async getProvider(parameters?) {
      return await getProvider()
    },
    async isAuthorized() {
      const provider = await getProvider()
      if (!provider) return false
      try {
        const accounts = await safeProviderRequest(provider, 'eth_accounts') as string[]
        return Array.isArray(accounts) && accounts.length > 0
      } catch (error: any) {
        console.debug('Is authorized error:', error?.message || error)
        return false
      }
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        config.emitter.emit('disconnect')
      } else {
        config.emitter.emit('change', { 
          accounts: accounts.map((a) => {
            const addr = typeof a === 'string' ? a : (a as any).address || String(a)
            return toAddress(addr)
          }) as readonly `0x${string}`[]
        })
      }
    },
    onChainChanged(chainId) {
      config.emitter.emit('change', { chainId: Number(chainId) })
    },
    onDisconnect(error?) {
      config.emitter.emit('disconnect')
    },
    async switchChain({ chainId }) {
      const provider = await getProvider()
      if (!provider) throw new Error('Provider not available')
      
      try {
        await safeProviderRequest(provider, 'wallet_switchEthereumChain', [{ chainId: `0x${chainId.toString(16)}` }])
      } catch (error: any) {
        // If chain doesn't exist, add it
        if (error.code === 4902 || error?.code === 4902) {
          const chain = config.chains.find((c) => c.id === chainId)
          if (chain) {
            await safeProviderRequest(provider, 'wallet_addEthereumChain', [{
              chainId: `0x${chainId.toString(16)}`,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [chain.rpcUrls.default.http[0]],
              blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : [],
            }])
          }
        } else {
          throw error instanceof Error ? error : new Error(String(error))
        }
      }
      
      return config.chains.find((c) => c.id === chainId) || config.chains[0]
    },
  }))
}