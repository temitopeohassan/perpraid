import { createConnector } from 'wagmi'
import { sdk } from '@farcaster/miniapp-sdk'

// Helper to get provider (handles both sync and async)
async function getProvider() {
  const provider = sdk.wallet.getEthereumProvider()
  // Check if it's a Promise and await if needed
  if (provider && typeof (provider as any).then === 'function') {
    return await (provider as Promise<any>)
  }
  return provider
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
      const provider = await getProvider()
      if (!provider) {
        throw new Error('Farcaster wallet provider not available')
      }

      try {
        // Use eth_requestAccounts to request connection
        const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
        const chainId = await provider.request({ method: 'eth_chainId' }) as string

        const formattedAccounts = accounts.map(toAddress) as readonly `0x${string}`[]

        // Return with proper type assertion to satisfy generic constraint
        return {
          accounts: formattedAccounts,
          chainId: Number(chainId),
        } as any
      } catch (error) {
        console.error('Connect error:', error)
        throw error
      }
    },
    async disconnect() {
      // Farcaster handles disconnection
    },
    async getAccounts() {
      const provider = await getProvider()
      if (!provider) return [] as readonly `0x${string}`[]
      try {
        const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
        return accounts.map(toAddress) as readonly `0x${string}`[]
      } catch (error) {
        console.error('Get accounts error:', error)
        return [] as readonly `0x${string}`[]
      }
    },
    async getChainId() {
      const provider = await getProvider()
      if (!provider) return config.chains[0].id
      try {
        const chainId = await provider.request({ method: 'eth_chainId' }) as string
        return Number(chainId)
      } catch (error) {
        console.error('Get chainId error:', error)
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
        const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
        return accounts && accounts.length > 0
      } catch (error) {
        console.error('Is authorized error:', error)
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
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        })
      } catch (error: any) {
        // If chain doesn't exist, add it
        if (error.code === 4902) {
          const chain = config.chains.find((c) => c.id === chainId)
          if (chain) {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${chainId.toString(16)}`,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: [chain.rpcUrls.default.http[0]],
                blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : [],
              }],
            })
          }
        } else {
          throw error
        }
      }
      
      return config.chains.find((c) => c.id === chainId) || config.chains[0]
    },
  }))
}