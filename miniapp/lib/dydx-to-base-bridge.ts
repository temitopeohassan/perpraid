import axios from 'axios'
import { getKeplr, DYDX_CHAIN_INFO } from './keplr-config'

// dYdX Chain Configuration
const DYDX_CHAIN_ID = 'dydx-mainnet-1'
const BASE_CHAIN_ID = '8453'
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const USDC_DYDX_DENOM = 'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5'
const SKIP_API_BASE_URL = 'https://api.skip.money'

// USDC has 6 decimals on both chains
const USDC_DECIMALS = 6


interface SkipRoute {
  source_asset_denom: string
  source_asset_chain_id: string
  dest_asset_denom: string
  dest_asset_chain_id: string
}

interface SkipRouteResponse {
  route: {
    source_asset_denom: string
    source_asset_chain_id: string
    dest_asset_denom: string
    dest_asset_chain_id: string
    amount_in: string
    amount_out: string
    operations: Array<{
      transfer?: {
        port: string
        channel: string
        chain_id: string
        pfm_enabled: boolean
        dest_denom: string
        supports_memo: boolean
      }
      swap?: unknown
      axelar?: unknown
      squid?: unknown
    }>
    chain_ids: string[]
    estimated_fees: Array<{
      chain_id: string
      denom: string
      amount: string
    }>
    estimated_time: number
    does_swap: boolean
  }
  txs_required: number
  txs: Array<{
    chain_id: string
    path: string[]
    tx_msg: string
  }>
  estimated_time: number
}

interface SkipMsgsResponse {
  msgs: Array<{
    chain_id: string
    path: string[]
    msg: string
  }>
}

interface BridgeTransaction {
  txHash: string
  trackingId: string
}

/**
 * DydxToBaseBridge
 * Handles bridging USDC from dYdX chain to Base
 * Note: This requires dYdX wallet connection (Cosmos-based chain via Keplr)
 */
export interface DydxWallet {
  address: string
  signTransaction: (txBody: any, signDoc: any) => Promise<any>
  sendTransaction: (signedTx: Uint8Array) => Promise<string>
}

export class DydxToBaseBridge {
  private skipApiBaseUrl: string
  private dydxWallet: DydxWallet | null

  constructor(dydxWallet?: DydxWallet, skipApiBaseUrl: string = SKIP_API_BASE_URL) {
    this.skipApiBaseUrl = skipApiBaseUrl
    this.dydxWallet = dydxWallet || null
  }

  setDydxWallet(wallet: DydxWallet) {
    this.dydxWallet = wallet
  }

  /**
   * Get the optimal route for bridging USDC from dYdX to Base
   */
  async getRoute(amount: string, baseAddress: string): Promise<SkipRouteResponse> {
    const routeParams: SkipRoute = {
      source_asset_denom: USDC_DYDX_DENOM,
      source_asset_chain_id: DYDX_CHAIN_ID,
      dest_asset_denom: USDC_BASE,
      dest_asset_chain_id: BASE_CHAIN_ID,
    }

    const params = new URLSearchParams({
      ...routeParams,
      amount_in: amount,
      allow_unsafe: 'true',
      accumulated_affiliate_fee_bps: '0',
      estimated_affiliate_fee_amount: '0',
      estimated_affiliate_fee_denom: routeParams.source_asset_denom,
    })

    try {
      const response = await axios.get<SkipRouteResponse>(
        `${this.skipApiBaseUrl}/v2/fungible/route`,
        { params }
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get route: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Generate the messages for bridging from dYdX to Base
   */
  async generateMsgs(
    amount: string,
    baseAddress: string,
    dydxAddress: string,
    route?: SkipRouteResponse
  ): Promise<SkipMsgsResponse> {
    if (!route) {
      route = await this.getRoute(amount, baseAddress)
    }

    const params = new URLSearchParams({
      source_asset_denom: USDC_DYDX_DENOM,
      source_asset_chain_id: DYDX_CHAIN_ID,
      dest_asset_denom: USDC_BASE,
      dest_asset_chain_id: BASE_CHAIN_ID,
      amount_in: amount,
      address_list: `${dydxAddress},${baseAddress}`,
      operation_identifier: route.txs[0].path.join(':'),
      estimated_fees: JSON.stringify(route.route.estimated_fees),
    })

    try {
      const response = await axios.get<SkipMsgsResponse>(
        `${this.skipApiBaseUrl}/v2/fungible/msgs`,
        { params }
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to generate messages: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Execute the bridge transaction from dYdX to Base
   * This requires a dYdX wallet (Cosmos wallet) to sign the transaction
   */
  async bridge(amount: string, baseAddress: string): Promise<BridgeTransaction> {
    if (!this.dydxWallet) {
      throw new Error('dYdX wallet not initialized. Please connect your dYdX wallet first.')
    }

    // Get dYdX address from wallet
    const dydxAddress = this.dydxWallet.address
    if (!dydxAddress) {
      throw new Error('No dYdX address found in wallet')
    }

    // Get route
    const route = await this.getRoute(amount, baseAddress)
    
    // Generate messages
    const msgs = await this.generateMsgs(amount, baseAddress, dydxAddress, route)

    if (msgs.msgs.length === 0) {
      throw new Error('No messages generated for bridge transaction')
    }

    // Find dYdX chain message (Cosmos transaction)
    const dydxMsg = msgs.msgs.find(msg => msg.chain_id === DYDX_CHAIN_ID)
    if (!dydxMsg) {
      throw new Error('No dYdX chain message found')
    }

    try {
      // Skip API returns Cosmos transaction messages that need to be signed
      // The message format from Skip API is typically a Cosmos SDK transaction
      // We need to parse it and convert it to SignDoc format for Keplr
      
      let txData: any
      try {
        txData = JSON.parse(dydxMsg.msg)
      } catch {
        // If not JSON, try base64 decode
        try {
          const decoded = atob(dydxMsg.msg)
          txData = JSON.parse(decoded)
        } catch {
          throw new Error('Failed to parse dYdX transaction message')
        }
      }

      // Skip API returns transactions in Cosmos SDK format
      // We need to create a SignDoc for Keplr to sign
      // The transaction should have body, authInfo, and chainId
      
      // Skip API returns transaction in Cosmos format
      // We need to convert it to SignDoc format for Keplr
      // The Skip API message should contain the transaction structure
      
      // Get account info for account number
      const keplr = getKeplr()
      const offlineSigner = keplr.getOfflineSigner(DYDX_CHAIN_INFO.chainId)
      const accounts = await offlineSigner.getAccounts()
      const account = accounts[0]
      
      // Parse transaction from Skip API
      // Skip API may return the transaction in different formats
      // We need to extract bodyBytes and authInfoBytes
      let bodyBytes: Uint8Array
      let authInfoBytes: Uint8Array
      let accountNumber: string | bigint = account.accountNumber?.toString() || '0'
      
      if (txData.bodyBytes && txData.authInfoBytes) {
        // If Skip API provides bytes directly
        bodyBytes = Uint8Array.from(atob(txData.bodyBytes).split('').map(c => c.charCodeAt(0)))
        authInfoBytes = Uint8Array.from(atob(txData.authInfoBytes).split('').map(c => c.charCodeAt(0)))
        accountNumber = txData.accountNumber || accountNumber
      } else if (txData.body && txData.authInfo) {
        // If Skip API provides structured data, we need to encode it
        // For now, we'll use the message as-is and let Keplr handle it
        // Skip API typically returns ready-to-sign transactions
        throw new Error('Transaction encoding from structured format not yet implemented. Skip API should provide bytes.')
      } else {
        // Try to use the message directly - Skip API might return a ready transaction
        // Convert string to bytes if needed
        if (typeof dydxMsg.msg === 'string') {
          // Try base64 decode
          try {
            const decoded = Uint8Array.from(atob(dydxMsg.msg).split('').map(c => c.charCodeAt(0)))
            // This might be the full transaction bytes
            // We'll pass it to Keplr's sendTx which can handle it
            const txHash = await keplr.sendTx(DYDX_CHAIN_INFO.chainId, decoded, 'sync')
            const trackingId = route.txs[0].path.join(':')
            return {
              txHash: txHash.transactionHash || txHash.txhash || txHash.toString(),
              trackingId,
            }
          } catch {
            throw new Error('Failed to parse transaction message from Skip API')
          }
        }
        throw new Error('Unsupported transaction format from Skip API')
      }

      // Create SignDoc for Keplr
      const signDoc = {
        bodyBytes,
        authInfoBytes,
        chainId: DYDX_CHAIN_INFO.chainId,
        accountNumber: typeof accountNumber === 'string' ? BigInt(accountNumber) : accountNumber,
      }

      // Sign the transaction
      const signResponse = await this.dydxWallet.signTransaction(signDoc, signDoc)

      // Broadcast the signed transaction
      // The sendTransaction method will handle encoding the signed response
      const txHash = await this.dydxWallet.sendTransaction(signResponse)
      
      // Extract tracking ID from route
      const trackingId = route.txs[0].path.join(':')

      return {
        txHash,
        trackingId,
      }
    } catch (error) {
      throw new Error(`Failed to execute bridge transaction: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Track bridge status
   */
  async trackBridge(trackingId: string): Promise<{
    status: string
    txHash?: string
    completed: boolean
  }> {
    try {
      const response = await axios.get(
        `${this.skipApiBaseUrl}/v2/tracking/${trackingId}`
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to track bridge: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Convert USDC amount to smallest unit (6 decimals)
   */
  static formatAmount(amount: string): string {
    // Parse amount and convert to smallest unit
    const amountNum = parseFloat(amount)
    return Math.floor(amountNum * 1_000_000).toString()
  }

  /**
   * Convert smallest unit to USDC amount (6 decimals)
   */
  static parseAmount(amount: string): string {
    const amountNum = BigInt(amount)
    return (Number(amountNum) / 1_000_000).toFixed(6)
  }
}
