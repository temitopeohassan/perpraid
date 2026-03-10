// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title StakingAllowanceManager
 * @notice Manages staking with Uniswap V3 Staker and trading allowance distribution
 * @dev Handles staking/unstaking, yield accumulation, and weekly trading allowance deposits
 */
interface IUniswapV3Staker {
    struct IncentiveKey {
        IERC20 rewardToken;
        address pool;
        uint256 startTime;
        uint256 endTime;
        address refundee;
    }

    function stakeToken(IncentiveKey memory key, uint256 tokenId) external;
    function unstakeToken(IncentiveKey memory key, uint256 tokenId) external;
    function claimReward(
        address rewardToken,
        address to,
        uint256 amountRequested
    ) external returns (uint256 reward);
    function getRewardInfo(
        IncentiveKey memory key,
        uint256 tokenId
    ) external view returns (uint256 reward, uint160 secondsInsideX128);
    function incentives(bytes32 incentiveId) external view returns (
        uint256 totalRewardUnclaimed,
        uint160 totalSecondsClaimedX128,
        uint96 numberOfStakes
    );
    function deposits(uint256 tokenId) external view returns (address owner, uint48 numberOfStakes, int24 tickLower, int24 tickUpper);
}

contract StakingAllowanceManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Uniswap V3 Staker contract address (Base mainnet)
    IUniswapV3Staker public immutable uniswapV3Staker;
    
    // NFT Position Manager (for Uniswap V3 LP positions)
    IERC721 public immutable nftPositionManager;
    
    // Reward token (typically USDC or other token from incentives)
    IERC20 public immutable rewardToken;
    
    // USDC for bridging
    IERC20 public immutable usdc;
    
    // Weekly distribution period (1 week in seconds)
    uint256 public constant WEEK = 7 days;
    
    // User staking data
    struct UserStake {
        uint256 tokenId; // Uniswap V3 LP NFT token ID
        bytes32 incentiveKey; // Incentive key hash
        uint256 stakedAt; // Timestamp when staked
        uint256 lastClaimed; // Last time rewards were claimed
        bool isActive; // Whether stake is active
    }
    
    // Trading allowance data
    struct TradingAllowance {
        uint256 totalAccumulated; // Total yield accumulated
        uint256 weeklyAllowance; // Current weekly allowance available
        uint256 lastDistribution; // Last time allowance was distributed
        uint256 totalDistributed; // Total amount distributed to user
    }
    
    // Mapping from user to their stakes
    mapping(address => UserStake[]) public userStakes;
    
    // Mapping from user to trading allowance
    mapping(address => TradingAllowance) public tradingAllowances;
    
    // Mapping from tokenId to user stake index
    mapping(uint256 => mapping(address => uint256)) public tokenIdToStakeIndex;
    
    // Events
    event Staked(
        address indexed user,
        uint256 indexed tokenId,
        bytes32 indexed incentiveKey,
        uint256 timestamp
    );
    
    event Unstaked(
        address indexed user,
        uint256 indexed tokenId,
        bytes32 indexed incentiveKey,
        uint256 timestamp
    );
    
    event RewardClaimed(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event TradingAllowanceDeposited(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event TradingAllowanceBridged(
        address indexed user,
        uint256 amount,
        string dydxAddress,
        uint256 timestamp
    );

    constructor(
        address _uniswapV3Staker,
        address _nftPositionManager,
        address _rewardToken,
        address _usdc
    ) Ownable(msg.sender) {
        require(_uniswapV3Staker != address(0), "Invalid staker address");
        require(_nftPositionManager != address(0), "Invalid NFT manager address");
        require(_rewardToken != address(0), "Invalid reward token address");
        require(_usdc != address(0), "Invalid USDC address");
        
        uniswapV3Staker = IUniswapV3Staker(_uniswapV3Staker);
        nftPositionManager = IERC721(_nftPositionManager);
        rewardToken = IERC20(_rewardToken);
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Stake a Uniswap V3 LP NFT position
     * @param key The incentive key for the staking program
     * @param tokenId The NFT token ID to stake
     */
    function stake(
        IUniswapV3Staker.IncentiveKey memory key,
        uint256 tokenId
    ) external nonReentrant {
        require(nftPositionManager.ownerOf(tokenId) == msg.sender, "Not NFT owner");
        
        // Transfer NFT to this contract (must approve first)
        nftPositionManager.transferFrom(msg.sender, address(this), tokenId);
        
        // Approve staker to use NFT
        nftPositionManager.approve(address(uniswapV3Staker), tokenId);
        
        // Stake in Uniswap V3 Staker
        uniswapV3Staker.stakeToken(key, tokenId);
        
        // Calculate incentive key hash
        bytes32 incentiveKeyHash = keccak256(
            abi.encode(key.rewardToken, key.pool, key.startTime, key.endTime, key.refundee)
        );
        
        // Record stake
        UserStake memory newStake = UserStake({
            tokenId: tokenId,
            incentiveKey: incentiveKeyHash,
            stakedAt: block.timestamp,
            lastClaimed: block.timestamp,
            isActive: true
        });
        
        userStakes[msg.sender].push(newStake);
        tokenIdToStakeIndex[tokenId][msg.sender] = userStakes[msg.sender].length - 1;
        
        emit Staked(msg.sender, tokenId, incentiveKeyHash, block.timestamp);
    }

    /**
     * @notice Unstake a position
     * @param stakeIndex The index of the stake in user's stake array
     * @param key The incentive key
     */
    function unstake(
        uint256 stakeIndex,
        IUniswapV3Staker.IncentiveKey memory key
    ) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        UserStake storage stakeData = userStakes[msg.sender][stakeIndex];
        require(stakeData.isActive, "Stake not active");
        
        // Claim any pending rewards before unstaking
        _claimRewardsForStake(stakeIndex, key);
        
        // Unstake from Uniswap V3 Staker
        uniswapV3Staker.unstakeToken(key, stakeData.tokenId);
        
        // Transfer NFT back to user
        nftPositionManager.transferFrom(address(this), msg.sender, stakeData.tokenId);
        
        // Mark as inactive
        stakeData.isActive = false;
        
        emit Unstaked(msg.sender, stakeData.tokenId, stakeData.incentiveKey, block.timestamp);
    }

    /**
     * @notice Claim rewards for a specific stake and add to trading allowance
     * @param stakeIndex The index of the stake
     * @param key The incentive key
     */
    function claimRewards(
        uint256 stakeIndex,
        IUniswapV3Staker.IncentiveKey memory key
    ) external nonReentrant {
        _claimRewardsForStake(stakeIndex, key);
    }

    /**
     * @notice Internal function to claim rewards for a stake
     */
    function _claimRewardsForStake(
        uint256 stakeIndex,
        IUniswapV3Staker.IncentiveKey memory key
    ) internal {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        UserStake storage stakeData = userStakes[msg.sender][stakeIndex];
        require(stakeData.isActive, "Stake not active");
        
        // Get reward info
        (uint256 reward, ) = uniswapV3Staker.getRewardInfo(key, stakeData.tokenId);
        
        if (reward > 0) {
            // Claim reward
            uint256 claimed = uniswapV3Staker.claimReward(
                address(rewardToken),
                address(this),
                reward
            );
            
            // Add to trading allowance
            TradingAllowance storage allowance = tradingAllowances[msg.sender];
            allowance.totalAccumulated += claimed;
            allowance.weeklyAllowance += claimed;
            
            stakeData.lastClaimed = block.timestamp;
            
            emit RewardClaimed(msg.sender, claimed, block.timestamp);
        }
    }

    /**
     * @notice Distribute weekly trading allowance (can be called by anyone after a week)
     * @param user The user to distribute allowance for
     */
    function distributeWeeklyAllowance(address user) external {
        TradingAllowance storage allowance = tradingAllowances[user];
        
        require(
            block.timestamp >= allowance.lastDistribution + WEEK,
            "Too soon for next distribution"
        );
        
        require(allowance.weeklyAllowance > 0, "No allowance to distribute");
        
        uint256 amountToDistribute = allowance.weeklyAllowance;
        allowance.weeklyAllowance = 0;
        allowance.lastDistribution = block.timestamp;
        allowance.totalDistributed += amountToDistribute;
        
        // If reward token is not USDC, we would need to swap it
        // For simplicity, assuming reward token is USDC or already swapped
        if (address(rewardToken) != address(usdc)) {
            // In production, you'd swap rewardToken to USDC here
            // For now, we'll assume they're the same or already converted
            revert("Reward token must be USDC or already converted");
        }
        
        // Transfer USDC to user (they can then bridge it)
        usdc.safeTransfer(user, amountToDistribute);
        
        emit TradingAllowanceDeposited(user, amountToDistribute, block.timestamp);
    }

    /**
     * @notice Get user's current trading allowance
     * @param user The user address
     * @return The current weekly allowance available
     */
    function getTradingAllowance(address user) external view returns (uint256) {
        return tradingAllowances[user].weeklyAllowance;
    }

    /**
     * @notice Get user's total accumulated yield
     * @param user The user address
     * @return Total accumulated yield
     */
    function getTotalAccumulated(address user) external view returns (uint256) {
        return tradingAllowances[user].totalAccumulated;
    }

    /**
     * @notice Get user's active stakes
     * @param user The user address
     * @return Array of active stakes
     */
    function getUserStakes(address user) external view returns (UserStake[] memory) {
        return userStakes[user];
    }

    /**
     * @notice Get pending rewards for a stake
     * @param user The user address
     * @param stakeIndex The stake index
     * @param key The incentive key
     * @return Pending reward amount
     */
    function getPendingReward(
        address user,
        uint256 stakeIndex,
        IUniswapV3Staker.IncentiveKey memory key
    ) external view returns (uint256) {
        require(stakeIndex < userStakes[user].length, "Invalid stake index");
        UserStake memory stakeData = userStakes[user][stakeIndex];
        require(stakeData.isActive, "Stake not active");
        
        (uint256 reward, ) = uniswapV3Staker.getRewardInfo(key, stakeData.tokenId);
        return reward;
    }

    /**
     * @notice Emergency function to recover tokens (owner only)
     */
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
