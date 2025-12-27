import { createConnector } from 'wagmi'
import { sdk } from '@farcaster/miniapp-sdk'

export const farcasterConnector = () => {
  return createConnector((config) => ({
    id: 'farcaster-miniapp',
    name: 'Farcaster Mini App',
    type: 'injected',
    async connect() {
      const provider = sdk.wallet.getEthereumProvider()
      if (!provider) {
        throw new Error('Farcaster wallet provider not available')
      }

      const accounts = await provider.request({ method: 'eth_accounts' })
      const chainId = await provider.request({ method: 'eth_chainId' })

      return {
        accounts: accounts as string[],
        chainId: Number(chainId),
      }
    },
    async disconnect() {
      // Farcaster handles disconnection
    },
    async getAccounts() {
      const provider = sdk.wallet.getEthereumProvider()
      if (!provider) return []
      const accounts = await provider.request({ method: 'eth_accounts' })
      return accounts as string[]
    },
    async getChainId() {
      const provider = sdk.wallet.getEthereumProvider()
      if (!provider) return config.chains[0].id
      const chainId = await provider.request({ method: 'eth_chainId' })
      return Number(chainId)
    },
    async isAuthorized() {
      const provider = sdk.wallet.getEthereumProvider()
      if (!provider) return false
      const accounts = await provider.request({ method: 'eth_accounts' })
      return accounts.length > 0
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) {
        config.emitter.emit('disconnect')
      } else {
        config.emitter.emit('change', { accounts: accounts.map((a) => a as `0x${string}`) })
      }
    },
    onChainChanged(chainId) {
      config.emitter.emit('change', { chainId: Number(chainId) })
    },
    async switchChain({ chainId }) {
      const provider = sdk.wallet.getEthereumProvider()
      if (!provider) throw new Error('Provider not available')
      
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
      
      return config.chains.find((c) => c.id === chainId) || config.chains[0]
    },
  }))
}
