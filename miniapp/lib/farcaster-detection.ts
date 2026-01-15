import { sdk } from '@farcaster/miniapp-sdk'

/**
 * Detects if the application is running inside Farcaster
 * @returns true if running inside Farcaster, false otherwise
 */
export function isFarcasterEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    // Check if Farcaster SDK is available and has a provider
    const provider = sdk.wallet.getEthereumProvider()
    if (provider) {
      return true
    }
  } catch (error) {
    // If SDK throws an error, we're not in Farcaster
    return false
  }

  // Additional check: look for Farcaster-specific user agent or window properties
  if (typeof window !== 'undefined') {
    // Check for Farcaster-specific indicators
    const userAgent = window.navigator?.userAgent || ''
    if (userAgent.includes('Farcaster') || userAgent.includes('farcaster')) {
      return true
    }

    // Check for Farcaster window properties
    if ((window as any).farcaster || (window as any).__FARCASTER__) {
      return true
    }
  }

  return false
}
