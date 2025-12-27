import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterConnector } from './farcaster-connector'

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterConnector()
  ]
})
