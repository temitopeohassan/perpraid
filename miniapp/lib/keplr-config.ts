/**
 * Keplr Wallet Configuration for dYdX Chain
 */

// dYdX Chain configuration
export const DYDX_CHAIN_INFO = {
  chainId: 'dydx-mainnet-1',
  chainName: 'dYdX Protocol',
  rpc: 'https://dydx-dao-rpc.polkachu.com',
  rest: 'https://dydx-dao-api.polkachu.com',
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'dydx',
    bech32PrefixAccPub: 'dydxpub',
    bech32PrefixValAddr: 'dydxvaloper',
    bech32PrefixValPub: 'dydxvaloperpub',
    bech32PrefixConsAddr: 'dydxvalcons',
    bech32PrefixConsPub: 'dydxvalconspub',
  },
  currencies: [
    {
      coinDenom: 'USDC',
      coinMinimalDenom: 'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5',
      coinDecimals: 6,
      coinGeckoId: 'usd-coin',
    },
    {
      coinDenom: 'DYDX',
      coinMinimalDenom: 'adydx',
      coinDecimals: 18,
      coinGeckoId: 'dydx-chain',
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'USDC',
      coinMinimalDenom: 'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5',
      coinDecimals: 6,
      coinGeckoId: 'usd-coin',
    },
  ],
  stakeCurrency: {
    coinDenom: 'DYDX',
    coinMinimalDenom: 'adydx',
    coinDecimals: 18,
    coinGeckoId: 'dydx-chain',
  },
  coinType: 118,
  gasPriceStep: {
    low: 0.01,
    average: 0.025,
    high: 0.04,
  },
  features: ['ibc-transfer', 'ibc-go'],
}

/**
 * Check if Keplr wallet is installed
 */
export function isKeplrInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return typeof window.keplr !== 'undefined'
}

/**
 * Get Keplr wallet instance
 */
export function getKeplr(): any {
  if (typeof window === 'undefined') {
    throw new Error('Keplr can only be accessed in browser environment')
  }
  if (!window.keplr) {
    throw new Error('Keplr wallet is not installed. Please install Keplr extension.')
  }
  return window.keplr
}

/**
 * Suggest dYdX chain to Keplr if not already added
 */
export async function suggestDydxChain(): Promise<void> {
  const keplr = getKeplr()
  try {
    await keplr.experimentalSuggestChain(DYDX_CHAIN_INFO)
  } catch (error) {
    // Chain might already be added, ignore error
    console.log('Chain suggestion result:', error)
  }
}

/**
 * Enable dYdX chain in Keplr
 */
export async function enableDydxChain(): Promise<void> {
  const keplr = getKeplr()
  await suggestDydxChain()
  await keplr.enable(DYDX_CHAIN_INFO.chainId)
}

/**
 * Get dYdX address from Keplr
 */
export async function getDydxAddress(): Promise<string> {
  const keplr = getKeplr()
  await enableDydxChain()
  const key = await keplr.getKey(DYDX_CHAIN_INFO.chainId)
  return key.bech32Address
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    keplr?: any
  }
}
