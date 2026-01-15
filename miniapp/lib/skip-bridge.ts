import { createPublicClient, createWalletClient, custom, http, Address, parseUnits, formatUnits } from 'viem'
import { base } from 'viem/chains'
import axios from 'axios'

// Base Mainnet Configuration
const BASE_CHAIN_ID = '8453'
const DYDX_CHAIN_ID = 'dydx-mainnet-1'
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address
const USDC_DYDX_DENOM = 'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5'
const SKIP_API_BASE_URL = 'https://api.skip.money'

// USDC has 6 decimals on Base
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
      swap?: {
        swap_in?: {
          swap_venue: {
            name: string
            chain_id: string
            swap_address: string
          }
          swap_operations: Array<{
            pool: string
            denom_in: string
            denom_out: string
          }>
          swap_amount_in: string
          price_impact_percent: string
        }
        swap_out?: {
          swap_venue: {
            name: string
            chain_id: string
            swap_address: string
          }
          swap_operations: Array<{
            pool: string
            denom_in: string
            denom_out: string
          }>
          swap_amount_out: string
          price_impact_percent: string
        }
      }
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

export class BaseToDydxBridge {
  private publicClient: ReturnType<typeof createPublicClient>
  private walletClient: ReturnType<typeof createWalletClient> | null = null
  private skipApiBaseUrl: string

  constructor(provider?: any, skipApiBaseUrl: string = SKIP_API_BASE_URL) {
    this.skipApiBaseUrl = skipApiBaseUrl
    
    // Create public client for Base
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(),
    })

    // Create wallet client if provider is provided
    if (provider) {
      this.setProvider(provider)
    }
  }

  setProvider(provider: any) {
    // Handle both EIP-1193 providers and viem wallet clients
    if (provider && typeof provider === 'object') {
      // If it's already a wallet client-like object, use it directly
      if ('account' in provider && 'sendTransaction' in provider) {
        this.walletClient = provider as ReturnType<typeof createWalletClient>
      } else {
        // Create wallet client from EIP-1193 provider
        this.walletClient = createWalletClient({
          chain: base,
          transport: custom(provider),
        })
      }
    }
  }

  /**
   * Get the optimal route for bridging USDC from Base to dYdX
   */
  async getRoute(amount: string, dydxAddress: string): Promise<SkipRouteResponse> {
    const routeParams: SkipRoute = {
      source_asset_denom: USDC_BASE,
      source_asset_chain_id: BASE_CHAIN_ID,
      dest_asset_denom: USDC_DYDX_DENOM,
      dest_asset_chain_id: DYDX_CHAIN_ID,
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
   * Generate the messages for bridging
   */
  async generateMsgs(
    amount: string,
    dydxAddress: string,
    sourceAddress: string,
    route?: SkipRouteResponse
  ): Promise<SkipMsgsResponse> {
    if (!route) {
      route = await this.getRoute(amount, dydxAddress)
    }

    const params = new URLSearchParams({
      source_asset_denom: USDC_BASE,
      source_asset_chain_id: BASE_CHAIN_ID,
      dest_asset_denom: USDC_DYDX_DENOM,
      dest_asset_chain_id: DYDX_CHAIN_ID,
      amount_in: amount,
      address_list: `${sourceAddress},${dydxAddress}`,
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
   * Execute the bridge transaction
   */
  async bridge(amount: string, dydxAddress: string): Promise<BridgeTransaction> {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized. Please provide a provider or call setProvider()')
    }

    // Get accounts from wallet
    const [account] = await this.walletClient.getAddresses()
    if (!account) {
      throw new Error('No account found in wallet')
    }

    // Get route
    const route = await this.getRoute(amount, dydxAddress)
    
    // Generate messages
    const msgs = await this.generateMsgs(amount, dydxAddress, account, route)

    if (msgs.msgs.length === 0) {
      throw new Error('No messages generated for bridge transaction')
    }

    // Parse and execute the first message (Base transaction)
    const baseMsg = msgs.msgs.find(msg => msg.chain_id === BASE_CHAIN_ID)
    if (!baseMsg) {
      throw new Error('No Base chain message found')
    }

    try {
      // Parse the message - Skip API returns transaction data
      let txData: any
      try {
        // Try parsing as JSON first
        txData = JSON.parse(baseMsg.msg)
      } catch {
        // If not JSON, it might be base64 encoded or hex
        try {
          // Check if it's hex (starts with 0x)
          if (baseMsg.msg.startsWith('0x')) {
            txData = { data: baseMsg.msg as `0x${string}` }
          } else {
            // Try base64 decode
            const decoded = atob(baseMsg.msg)
            txData = JSON.parse(decoded)
          }
        } catch {
          // If still not parseable, the msg itself might be the data
          txData = baseMsg.msg.startsWith('0x') 
            ? { data: baseMsg.msg as `0x${string}` }
            : { data: `0x${baseMsg.msg}` as `0x${string}` }
        }
      }

      // Extract transaction parameters
      // Skip API typically returns: { to, data, value, gas, etc. }
      const to = (txData.to || txData.contract_address || txData.target) as Address | undefined
      const data = (txData.data || txData.input || txData.msg || '0x') as `0x${string}`
      const value = txData.value ? BigInt(txData.value) : 0n
      const gas = txData.gas ? BigInt(txData.gas) : undefined
      const gasPrice = txData.gasPrice ? BigInt(txData.gasPrice) : undefined

      if (!to) {
        throw new Error('No recipient address found in bridge message')
      }

      // Execute the transaction
      const hash = await this.walletClient.sendTransaction({
        account,
        to,
        data,
        value,
        gas,
        gasPrice,
      })

      // Wait for transaction receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

      // Extract tracking ID from events or route
      const trackingId = route.txs[0].path.join(':')

      return {
        txHash: hash,
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
   * Convert USDC amount to wei (6 decimals)
   */
  static formatAmount(amount: string): string {
    return parseUnits(amount, USDC_DECIMALS).toString()
  }

  /**
   * Convert wei to USDC amount (6 decimals)
   */
  static parseAmount(amount: string): string {
    return formatUnits(BigInt(amount), USDC_DECIMALS)
  }
}

