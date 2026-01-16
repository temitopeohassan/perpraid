const express = require('express');
const router = express.Router();
const firebaseClient = require('../config/firebase');
const StakingService = require('../services/staking-service');

// Initialize staking service
const stakingService = new StakingService();

// Middleware to validate wallet address
const validateAddress = (req, res, next) => {
  const address = req.headers['x-wallet-address'] || req.query.address;
  if (!address) {
    return res.status(400).json({ error: 'Wallet address required' });
  }
  
  // Basic address validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({ error: 'Invalid wallet address format' });
  }
  
  req.walletAddress = address;
  next();
};

router.use(validateAddress);

/**
 * GET /api/staking/data
 * Get user's staking data summary
 */
router.get('/data', async (req, res) => {
  try {
    // Try to get from contract first
    let stakingData;
    try {
      stakingData = await stakingService.getStakingData(req.walletAddress);
    } catch (error) {
      console.error('Error fetching from contract:', error);
      // Fallback to Firebase or return default
      stakingData = {
        trading_allowance: 0,
        total_accumulated: 0,
        active_stakes: 0,
        total_staked_value: 0,
        weekly_yield: 0,
        next_distribution: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    // Also try to get from Firebase cache
    try {
      const cachedData = await firebaseClient.getStakingData(req.walletAddress);
      if (cachedData) {
        // Merge cached data with contract data (contract data takes precedence)
        stakingData = {
          ...cachedData,
          ...stakingData,
        };
      }
    } catch (error) {
      console.warn('Error fetching cached staking data:', error);
    }

    res.json(stakingData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staking data', message: error.message });
  }
});

/**
 * GET /api/staking/history
 * Get user's staking transaction history
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // Get from Firebase
    const history = await firebaseClient.getStakingHistory(req.walletAddress, limit);
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staking history', message: error.message });
  }
});

/**
 * POST /api/staking/save
 * Save a staking transaction
 */
router.post('/save', async (req, res) => {
  try {
    const { tx_hash, token_id, action, amount } = req.body;

    if (!tx_hash || !token_id || !action) {
      return res.status(400).json({ error: 'Missing required fields: tx_hash, token_id, action' });
    }

    if (!['stake', 'unstake', 'claim'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be: stake, unstake, or claim' });
    }

    // Verify transaction on-chain
    const txData = await stakingService.verifyTransaction(tx_hash);
    if (!txData) {
      return res.status(400).json({ error: 'Transaction not found or invalid' });
    }

    // Generate stake ID
    const stakeId = `${req.walletAddress.toLowerCase()}_${tx_hash}`;

    // Save to Firebase
    const stakeData = {
      wallet_address: req.walletAddress.toLowerCase(),
      stake_id: stakeId,
      tx_hash,
      token_id: token_id.toString(),
      action,
      amount: amount || 0,
      status: txData.status,
      block_number: txData.blockNumber,
      timestamp: new Date(txData.timestamp * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    await firebaseClient.saveStakingTransaction(req.walletAddress, stakeId, stakeData);

    res.json({
      success: true,
      stake_id: stakeId,
      message: 'Staking transaction saved successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save staking transaction', message: error.message });
  }
});

/**
 * GET /api/staking/allowance-history
 * Get trading allowance distribution history
 */
router.get('/allowance-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // Get from Firebase
    const history = await firebaseClient.getTradingAllowanceHistory(req.walletAddress, limit);
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch allowance history', message: error.message });
  }
});

/**
 * GET /api/staking/stakes
 * Get user's active stakes with details
 */
router.get('/stakes', async (req, res) => {
  try {
    const stakes = await stakingService.getUserStakes(req.walletAddress);
    
    // Enrich with cached data from Firebase if available
    const enrichedStakes = await Promise.all(
      stakes.map(async (stake) => {
        try {
          // Could fetch additional data from Firebase here
          return stake;
        } catch (error) {
          return stake;
        }
      })
    );

    res.json(enrichedStakes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stakes', message: error.message });
  }
});

/**
 * GET /api/staking/pending-rewards
 * Get pending rewards for all active stakes
 */
router.get('/pending-rewards', async (req, res) => {
  try {
    const stakes = await stakingService.getUserStakes(req.walletAddress);
    const activeStakes = stakes.filter(s => s.is_active);

    // Note: To get pending rewards, we need the incentive key for each stake
    // This would typically be stored in Firebase or passed by the frontend
    // For now, we'll return a placeholder structure
    
    const pendingRewards = activeStakes.map((stake, index) => ({
      stake_index: index,
      token_id: stake.token_id,
      pending_reward: 0, // Would need incentive key to calculate
      note: 'Incentive key required to calculate pending reward',
    }));

    res.json(pendingRewards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending rewards', message: error.message });
  }
});

/**
 * POST /api/staking/verify-transaction
 * Verify a staking transaction on-chain
 */
router.post('/verify-transaction', async (req, res) => {
  try {
    const { tx_hash } = req.body;

    if (!tx_hash) {
      return res.status(400).json({ error: 'Transaction hash required' });
    }

    const txData = await stakingService.verifyTransaction(tx_hash);

    if (!txData) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction: txData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify transaction', message: error.message });
  }
});

module.exports = router;
