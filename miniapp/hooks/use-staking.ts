"use client"

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { base } from 'wagmi/chains'
import { parseUnits, formatUnits, Address, encodeFunctionData, decodeFunctionResult } from 'viem'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'

// Uniswap V3 Staker ABI (simplified - key functions)
const UNISWAP_V3_STAKER_ABI = [
  {
    name: 'stakeToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'rewardToken', type: 'address' },
          { name: 'pool', type: 'address' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'refundee', type: 'address' },
        ],
      },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'unstakeToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'rewardToken', type: 'address' },
          { name: 'pool', type: 'address' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'refundee', type: 'address' },
        ],
      },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'claimReward',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'rewardToken', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amountRequested', type: 'uint256' },
    ],
    outputs: [{ name: 'reward', type: 'uint256' }],
  },
  {
    name: 'getRewardInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'rewardToken', type: 'address' },
          { name: 'pool', type: 'address' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'refundee', type: 'address' },
        ],
      },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [
      { name: 'reward', type: 'uint256' },
      { name: 'secondsInsideX128', type: 'uint160' },
    ],
  },
] as const

// StakingAllowanceManager ABI
const STAKING_ALLOWANCE_MANAGER_ABI = [
  {
    name: 'stake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'rewardToken', type: 'address' },
          { name: 'pool', type: 'address' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'refundee', type: 'address' },
        ],
      },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'unstake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'stakeIndex', type: 'uint256' },
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'rewardToken', type: 'address' },
          { name: 'pool', type: 'address' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'refundee', type: 'address' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'claimRewards',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'stakeIndex', type: 'uint256' },
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'rewardToken', type: 'address' },
          { name: 'pool', type: 'address' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'refundee', type: 'address' },
        ],
      },
    ],
    outputs: [],
  },
  {
    name: 'distributeWeeklyAllowance',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [],
  },
  {
    name: 'getTradingAllowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getTotalAccumulated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getUserStakes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'incentiveKey', type: 'bytes32' },
          { name: 'stakedAt', type: 'uint256' },
          { name: 'lastClaimed', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getPendingReward',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'stakeIndex', type: 'uint256' },
      {
        name: 'key',
        type: 'tuple',
        components: [
          { name: 'rewardToken', type: 'address' },
          { name: 'pool', type: 'address' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'refundee', type: 'address' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Contract addresses (Base mainnet)
// These should be set via environment variables
const STAKING_ALLOWANCE_MANAGER_ADDRESS = (process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address
// Uniswap V3 Staker on Base: 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1
const UNISWAP_V3_STAKER_ADDRESS = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' as Address // Base mainnet
// Uniswap V3 NFT Position Manager on Base: 0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1
const NFT_POSITION_MANAGER_ADDRESS = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' as Address // Base mainnet

export interface IncentiveKey {
  rewardToken: Address
  pool: Address
  startTime: bigint
  endTime: bigint
  refundee: Address
}

export interface UserStake {
  tokenId: bigint
  incentiveKey: `0x${string}`
  stakedAt: bigint
  lastClaimed: bigint
  isActive: boolean
}

export interface StakingData {
  tradingAllowance: string
  totalAccumulated: string
  userStakes: UserStake[]
  pendingRewards: string[]
}

export function useStaking() {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [stakingData, setStakingData] = useState<StakingData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Read trading allowance
  const { data: tradingAllowance } = useReadContract({
    address: STAKING_ALLOWANCE_MANAGER_ADDRESS,
    abi: STAKING_ALLOWANCE_MANAGER_ABI,
    functionName: 'getTradingAllowance',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!STAKING_ALLOWANCE_MANAGER_ADDRESS,
    },
  })

  // Read total accumulated
  const { data: totalAccumulated } = useReadContract({
    address: STAKING_ALLOWANCE_MANAGER_ADDRESS,
    abi: STAKING_ALLOWANCE_MANAGER_ABI,
    functionName: 'getTotalAccumulated',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!STAKING_ALLOWANCE_MANAGER_ADDRESS,
    },
  })

  // Read user stakes
  const { data: userStakes } = useReadContract({
    address: STAKING_ALLOWANCE_MANAGER_ADDRESS,
    abi: STAKING_ALLOWANCE_MANAGER_ABI,
    functionName: 'getUserStakes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!STAKING_ALLOWANCE_MANAGER_ADDRESS,
    },
  })

  // Update staking data when contract data changes
  useEffect(() => {
    if (address && tradingAllowance !== undefined && totalAccumulated !== undefined) {
      setStakingData({
        tradingAllowance: formatUnits(tradingAllowance || 0n, 6), // USDC has 6 decimals
        totalAccumulated: formatUnits(totalAccumulated || 0n, 6),
        userStakes: (userStakes as UserStake[]) || [],
        pendingRewards: [], // Will be populated separately
      })
    }
  }, [address, tradingAllowance, totalAccumulated, userStakes])

  const stake = useCallback(
    async (tokenId: bigint, incentiveKey: IncentiveKey) => {
      if (!address || !STAKING_ALLOWANCE_MANAGER_ADDRESS) {
        toast.error('Please connect your wallet')
        return null
      }

      try {
        setIsLoading(true)
        
        // First, approve NFT to staking contract
        if (walletClient) {
          // Approve NFT
          const approveHash = await walletClient.writeContract({
            address: NFT_POSITION_MANAGER_ADDRESS,
            abi: [
              {
                name: 'approve',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [
                  { name: 'to', type: 'address' },
                  { name: 'tokenId', type: 'uint256' },
                ],
                outputs: [],
              },
            ],
            functionName: 'approve',
            args: [STAKING_ALLOWANCE_MANAGER_ADDRESS, tokenId],
          })

          await publicClient?.waitForTransactionReceipt({ hash: approveHash })
        }

        // Then stake
        writeContract({
          address: STAKING_ALLOWANCE_MANAGER_ADDRESS,
          abi: STAKING_ALLOWANCE_MANAGER_ABI,
          functionName: 'stake',
          args: [incentiveKey, tokenId],
        })

        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to stake'
        toast.error(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [address, walletClient, publicClient, writeContract]
  )

  const unstake = useCallback(
    async (stakeIndex: bigint, incentiveKey: IncentiveKey) => {
      if (!address || !STAKING_ALLOWANCE_MANAGER_ADDRESS) {
        toast.error('Please connect your wallet')
        return null
      }

      try {
        setIsLoading(true)
        writeContract({
          address: STAKING_ALLOWANCE_MANAGER_ADDRESS,
          abi: STAKING_ALLOWANCE_MANAGER_ABI,
          functionName: 'unstake',
          args: [stakeIndex, incentiveKey],
        })
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to unstake'
        toast.error(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [address, writeContract]
  )

  const claimRewards = useCallback(
    async (stakeIndex: bigint, incentiveKey: IncentiveKey) => {
      if (!address || !STAKING_ALLOWANCE_MANAGER_ADDRESS) {
        toast.error('Please connect your wallet')
        return null
      }

      try {
        setIsLoading(true)
        writeContract({
          address: STAKING_ALLOWANCE_MANAGER_ADDRESS,
          abi: STAKING_ALLOWANCE_MANAGER_ABI,
          functionName: 'claimRewards',
          args: [stakeIndex, incentiveKey],
        })
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to claim rewards'
        toast.error(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [address, writeContract]
  )

  const distributeWeeklyAllowance = useCallback(
    async (userAddress?: Address) => {
      if (!address || !STAKING_ALLOWANCE_MANAGER_ADDRESS) {
        toast.error('Please connect your wallet')
        return null
      }

      const targetUser = userAddress || address

      try {
        setIsLoading(true)
        writeContract({
          address: STAKING_ALLOWANCE_MANAGER_ADDRESS,
          abi: STAKING_ALLOWANCE_MANAGER_ABI,
          functionName: 'distributeWeeklyAllowance',
          args: [targetUser],
        })
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to distribute allowance'
        toast.error(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [address, writeContract]
  )

  // Handle transaction success
  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed!')
      // Refresh staking data
      if (address) {
        // Trigger refetch by updating a dependency
        setStakingData((prev) => ({ ...prev } as StakingData))
      }
    }
  }, [isSuccess, address])

  // Handle transaction errors
  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Transaction failed')
    }
  }, [error])

  return {
    stakingData,
    stake,
    unstake,
    claimRewards,
    distributeWeeklyAllowance,
    isLoading: isLoading || isPending || isConfirming,
    error: error?.message,
  }
}
