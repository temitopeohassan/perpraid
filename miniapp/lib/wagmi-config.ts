import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { farcasterConnector } from './farcaster-connector'

// Get WalletConnect project ID from environment variable
// You can get a free project ID from https://cloud.walletconnect.com
// Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local file
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

// Create RainbowKit config (includes MetaMask, WalletConnect, Coinbase, Injected wallets)
const rainbowKitConfig = projectId
  ? getDefaultConfig({
      appName: 'PERP Raid',
      projectId: projectId,
      chains: [base],
      ssr: true, // Enable server-side rendering support
    })
  : null

// Create config that includes both RainbowKit connectors and Farcaster connector
// This allows the app to work both inside and outside Farcaster
export const wagmiConfig = rainbowKitConfig
  ? createConfig({
      ...rainbowKitConfig,
      // Add Farcaster connector to the list of connectors
      // This ensures it's available when inside Farcaster
      connectors: [
        farcasterConnector(), // Prioritize Farcaster connector
        ...rainbowKitConfig.connectors, // Include all RainbowKit connectors
      ],
    })
  : createConfig({
      chains: [base],
      transports: {
        [base.id]: http(),
      },
      connectors: [farcasterConnector()], // Fallback to Farcaster connector only if no project ID
    })

// Note: When project ID is set, the config includes:
// - Farcaster connector (prioritized for Farcaster environment)
// - MetaMask
// - WalletConnect
// - Coinbase Wallet
// - Injected wallets
// When inside Farcaster, the Farcaster connector will be used
// When outside Farcaster, users can choose from RainbowKit connectors
