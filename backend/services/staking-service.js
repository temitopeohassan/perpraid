const { ethers } = require('ethers');
const axios = require('axios');

/**
 * StakingService
 * Handles interactions with the StakingAllowanceManager smart contract on Base
 */
class StakingService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.initialized = false;
  }

  /**
   * Initialize the service with Base network provider
   */
  async initialize() {
    try {
      // Base mainnet RPC URL
      const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
      this.provider = new ethers.JsonRpcProvider(baseRpcUrl);

      // StakingAllowanceManager contract address
      const contractAddress = process.env.STAKING_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('STAKING_CONTRACT_ADDRESS environment variable not set');
      }

      // Contract ABI (simplified - key functions)
      const contractABI = [
        'function getTradingAllowance(address user) view returns (uint256)',
        'function getTotalAccumulated(address user) view returns (uint256)',
        'function getUserStakes(address user) view returns (tuple(uint256 tokenId, bytes32 incentiveKey, uint256 stakedAt, uint256 lastClaimed, bool isActive)[])',
        'function getPendingReward(address user, uint256 stakeIndex, tuple(address rewardToken, address pool, uint256 startTime, uint256 endTime, address refundee) key) view returns (uint256)',
        'event Staked(address indexed user, uint256 indexed tokenId, bytes32 indexed incentiveKey, uint256 timestamp)',
        'event Unstaked(address indexed user, uint256 indexed tokenId, bytes32 indexed incentiveKey, uint256 timestamp)',
        'event RewardClaimed(address indexed user, uint256 amount, uint256 timestamp)',
        'event TradingAllowanceDeposited(address indexed user, uint256 amount, uint256 timestamp)',
      ];

      this.contract = new ethers.Contract(contractAddress, contractABI, this.provider);
      this.initialized = true;
      
      return true;
    } catch (error) {
      console.error('Failed to initialize StakingService:', error);
      throw error;
    }
  }

  /**
   * Get trading allowance for a user
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<number>} Trading allowance in USDC (6 decimals)
   */
  async getTradingAllowance(walletAddress) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const allowance = await this.contract.getTradingAllowance(walletAddress);
      // Convert from wei (6 decimals for USDC) to human-readable
      return parseFloat(ethers.formatUnits(allowance, 6));
    } catch (error) {
      console.error('Error getting trading allowance:', error);
      return 0;
    }
  }

  /**
   * Get total accumulated yield for a user
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<number>} Total accumulated yield in USDC
   */
  async getTotalAccumulated(walletAddress) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const accumulated = await this.contract.getTotalAccumulated(walletAddress);
      return parseFloat(ethers.formatUnits(accumulated, 6));
    } catch (error) {
      console.error('Error getting total accumulated:', error);
      return 0;
    }
  }

  /**
   * Get user's active stakes
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<Array>} Array of stake objects
   */
  async getUserStakes(walletAddress) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const stakes = await this.contract.getUserStakes(walletAddress);
      return stakes.map((stake, index) => ({
        stake_index: index,
        token_id: stake.tokenId.toString(),
        incentive_key: stake.incentiveKey,
        staked_at: new Date(Number(stake.stakedAt) * 1000).toISOString(),
        last_claimed: new Date(Number(stake.lastClaimed) * 1000).toISOString(),
        is_active: stake.isActive,
      }));
    } catch (error) {
      console.error('Error getting user stakes:', error);
      return [];
    }
  }

  /**
   * Get pending reward for a specific stake
   * @param {string} walletAddress - User's wallet address
   * @param {number} stakeIndex - Index of the stake
   * @param {Object} incentiveKey - Incentive key object
   * @returns {Promise<number>} Pending reward amount
   */
  async getPendingReward(walletAddress, stakeIndex, incentiveKey) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Format incentive key for contract call
      const key = [
        incentiveKey.rewardToken,
        incentiveKey.pool,
        BigInt(incentiveKey.startTime),
        BigInt(incentiveKey.endTime),
        incentiveKey.refundee,
      ];

      const reward = await this.contract.getPendingReward(walletAddress, stakeIndex, key);
      return parseFloat(ethers.formatUnits(reward, 6));
    } catch (error) {
      console.error('Error getting pending reward:', error);
      return 0;
    }
  }

  /**
   * Get staking data summary for a user
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<Object>} Staking data object
   */
  async getStakingData(walletAddress) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const [tradingAllowance, totalAccumulated, stakes] = await Promise.all([
        this.getTradingAllowance(walletAddress),
        this.getTotalAccumulated(walletAddress),
        this.getUserStakes(walletAddress),
      ]);

      const activeStakes = stakes.filter(s => s.is_active);
      
      // Calculate total staked value (would need to query NFT position values)
      // For now, we'll use a placeholder
      const totalStakedValue = 0; // TODO: Calculate from LP positions

      // Calculate weekly yield (estimate based on total accumulated)
      const weeklyYield = totalAccumulated > 0 ? totalAccumulated / Math.max(1, Math.floor((Date.now() / 1000 - (activeStakes[0]?.staked_at ? new Date(activeStakes[0].staked_at).getTime() / 1000 : Date.now() / 1000)) / (7 * 24 * 60 * 60))) : 0;

      // Calculate next distribution time (1 week from last distribution or from now)
      const nextDistribution = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      return {
        trading_allowance: tradingAllowance,
        total_accumulated: totalAccumulated,
        active_stakes: activeStakes.length,
        total_staked_value: totalStakedValue,
        weekly_yield: weeklyYield,
        next_distribution: nextDistribution,
      };
    } catch (error) {
      console.error('Error getting staking data:', error);
      throw error;
    }
  }

  /**
   * Verify a staking transaction on-chain
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction receipt data
   */
  async verifyTransaction(txHash) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        return null;
      }

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
        timestamp: (await this.provider.getBlock(receipt.blockNumber)).timestamp,
      };
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return null;
    }
  }
}

module.exports = StakingService;
