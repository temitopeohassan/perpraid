// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SkipBridge
 * @notice Smart contract for bridging USDC from Base to dYdX using Skip Go API
 * @dev This contract handles the on-chain portion while Skip Go API handles routing
 */
contract SkipBridge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Base USDC address on Base mainnet
    IERC20 public immutable usdc;
    
    // Bridge configuration
    address public skipRelayer; // Authorized relayer that executes Skip Go API calls
    uint256 public minBridgeAmount;
    uint256 public maxBridgeAmount;
    uint256 public bridgeFeeBps; // Bridge fee in basis points
    
    // Bridge transaction tracking
    struct BridgeRequest {
        address user;
        uint256 amount;
        string dydxAddress;
        uint256 timestamp;
        bytes32 trackingId;
        BridgeStatus status;
        string txHash;
    }
    
    enum BridgeStatus {
        Pending,
        Processing,
        Completed,
        Failed
    }
    
    // Mapping from request ID to bridge request
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    
    // Mapping from user to their bridge requests
    mapping(address => bytes32[]) public userBridgeRequests;
    
    // Tracking IDs for monitoring
    mapping(bytes32 => bytes32) public trackingIdToRequestId;
    
    // Events
    event BridgeInitiated(
        bytes32 indexed requestId,
        address indexed user,
        uint256 amount,
        string dydxAddress,
        uint256 timestamp
    );
    
    event BridgeProcessed(
        bytes32 indexed requestId,
        bytes32 indexed trackingId,
        string txHash,
        uint256 timestamp
    );
    
    event BridgeCompleted(
        bytes32 indexed requestId,
        bytes32 indexed trackingId,
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event BridgeFailed(
        bytes32 indexed requestId,
        bytes32 indexed trackingId,
        address indexed user,
        string reason
    );
    
    event RelayerUpdated(address oldRelayer, address newRelayer);
    event BridgeLimitsUpdated(uint256 minAmount, uint256 maxAmount);
    event BridgeFeeUpdated(uint256 oldFee, uint256 newFee);
    event FundsWithdrawn(address token, address to, uint256 amount);
    
    // Modifiers
    modifier onlyRelayer() {
        require(msg.sender == skipRelayer, "SkipBridge: not authorized relayer");
        _;
    }
    
    modifier validAmount(uint256 amount) {
        require(amount >= minBridgeAmount, "SkipBridge: amount below minimum");
        require(amount <= maxBridgeAmount, "SkipBridge: amount above maximum");
        _;
    }
    
    /**
     * @notice Constructor
     * @param _usdc USDC token address on Base
     * @param _owner Contract owner address
     * @param _relayer Initial relayer address (can be updated later)
     * @param _minBridgeAmount Minimum bridge amount
     * @param _maxBridgeAmount Maximum bridge amount
     * @param _bridgeFeeBps Bridge fee in basis points
     */
    constructor(
        address _usdc,
        address _owner,
        address _relayer,
        uint256 _minBridgeAmount,
        uint256 _maxBridgeAmount,
        uint256 _bridgeFeeBps
    ) Ownable(_owner) {
        require(_usdc != address(0), "SkipBridge: invalid USDC address");
        require(_relayer != address(0), "SkipBridge: invalid relayer address");
        require(_minBridgeAmount > 0, "SkipBridge: invalid min amount");
        require(_maxBridgeAmount > _minBridgeAmount, "SkipBridge: invalid max amount");
        require(_bridgeFeeBps <= 1000, "SkipBridge: fee too high"); // Max 10%
        
        usdc = IERC20(_usdc);
        skipRelayer = _relayer;
        minBridgeAmount = _minBridgeAmount;
        maxBridgeAmount = _maxBridgeAmount;
        bridgeFeeBps = _bridgeFeeBps;
    }
    
    /**
     * @notice Initiate a bridge request
     * @param amount Amount of USDC to bridge (in USDC decimals, 6)
     * @param dydxAddress Destination dYdX address
     * @return requestId Unique request identifier
     */
    function initiateBridge(
        uint256 amount,
        string calldata dydxAddress
    ) external nonReentrant validAmount(amount) returns (bytes32 requestId) {
        require(bytes(dydxAddress).length > 0, "SkipBridge: invalid dYdX address");
        
        // Calculate bridge fee
        uint256 fee = (amount * bridgeFeeBps) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        // If there's a fee, send it to owner/treasury
        if (fee > 0) {
            usdc.safeTransfer(owner(), fee);
        }
        
        // Generate request ID
        requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                dydxAddress,
                block.timestamp,
                block.number,
                blockhash(block.number - 1)
            )
        );
        
        // Create bridge request
        bridgeRequests[requestId] = BridgeRequest({
            user: msg.sender,
            amount: amountAfterFee,
            dydxAddress: dydxAddress,
            timestamp: block.timestamp,
            trackingId: bytes32(0),
            status: BridgeStatus.Pending,
            txHash: ""
        });
        
        // Track user's bridge requests
        userBridgeRequests[msg.sender].push(requestId);
        
        emit BridgeInitiated(requestId, msg.sender, amountAfterFee, dydxAddress, block.timestamp);
        
        return requestId;
    }
    
    /**
     * @notice Process bridge request (called by relayer after Skip Go API execution)
     * @param requestId Bridge request ID
     * @param trackingId Skip Go API tracking ID
     * @param txHash Transaction hash from the bridge execution
     */
    function processBridge(
        bytes32 requestId,
        bytes32 trackingId,
        string calldata txHash
    ) external onlyRelayer {
        BridgeRequest storage request = bridgeRequests[requestId];
        require(request.status == BridgeStatus.Pending, "SkipBridge: invalid request status");
        require(bytes(txHash).length > 0, "SkipBridge: invalid tx hash");
        
        request.trackingId = trackingId;
        request.txHash = txHash;
        request.status = BridgeStatus.Processing;
        
        // Map tracking ID to request ID for monitoring
        trackingIdToRequestId[trackingId] = requestId;
        
        emit BridgeProcessed(requestId, trackingId, txHash, block.timestamp);
    }
    
    /**
     * @notice Mark bridge as completed (called by relayer after confirmation)
     * @param requestId Bridge request ID
     */
    function completeBridge(bytes32 requestId) external onlyRelayer {
        BridgeRequest storage request = bridgeRequests[requestId];
        require(request.status == BridgeStatus.Processing, "SkipBridge: invalid request status");
        
        request.status = BridgeStatus.Completed;
        
        // Release USDC - in production, this would be handled by the bridge
        // For Skip Go API, tokens are sent off-chain, so we just mark as complete
        usdc.safeTransfer(skipRelayer, request.amount);
        
        emit BridgeCompleted(
            requestId,
            request.trackingId,
            request.user,
            request.amount,
            block.timestamp
        );
    }
    
    /**
     * @notice Mark bridge as failed and refund user
     * @param requestId Bridge request ID
     * @param reason Failure reason
     */
    function failBridge(
        bytes32 requestId,
        string calldata reason
    ) external onlyRelayer {
        BridgeRequest storage request = bridgeRequests[requestId];
        require(
            request.status == BridgeStatus.Pending || request.status == BridgeStatus.Processing,
            "SkipBridge: invalid request status"
        );
        
        request.status = BridgeStatus.Failed;
        
        // Refund user
        usdc.safeTransfer(request.user, request.amount);
        
        emit BridgeFailed(requestId, request.trackingId, request.user, reason);
    }
    
    /**
     * @notice Get bridge request details
     * @param requestId Bridge request ID
     * @return Bridge request details
     */
    function getBridgeRequest(bytes32 requestId)
        external
        view
        returns (BridgeRequest memory)
    {
        return bridgeRequests[requestId];
    }
    
    /**
     * @notice Get user's bridge requests
     * @param user User address
     * @return Array of request IDs
     */
    function getUserBridgeRequests(address user)
        external
        view
        returns (bytes32[] memory)
    {
        return userBridgeRequests[user];
    }
    
    /**
     * @notice Get request ID from tracking ID
     * @param trackingId Skip Go API tracking ID
     * @return Request ID
     */
    function getRequestIdFromTrackingId(bytes32 trackingId)
        external
        view
        returns (bytes32)
    {
        return trackingIdToRequestId[trackingId];
    }
    
    /**
     * @notice Update relayer address
     * @param newRelayer New relayer address
     */
    function setRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "SkipBridge: invalid relayer address");
        address oldRelayer = skipRelayer;
        skipRelayer = newRelayer;
        emit RelayerUpdated(oldRelayer, newRelayer);
    }
    
    /**
     * @notice Update bridge amount limits
     * @param newMinAmount New minimum bridge amount
     * @param newMaxAmount New maximum bridge amount
     */
    function setBridgeLimits(uint256 newMinAmount, uint256 newMaxAmount) external onlyOwner {
        require(newMinAmount > 0, "SkipBridge: invalid min amount");
        require(newMaxAmount > newMinAmount, "SkipBridge: invalid max amount");
        
        minBridgeAmount = newMinAmount;
        maxBridgeAmount = newMaxAmount;
        
        emit BridgeLimitsUpdated(newMinAmount, newMaxAmount);
    }
    
    /**
     * @notice Update bridge fee
     * @param newBridgeFeeBps New bridge fee in basis points
     */
    function setBridgeFee(uint256 newBridgeFeeBps) external onlyOwner {
        require(newBridgeFeeBps <= 1000, "SkipBridge: fee too high"); // Max 10%
        uint256 oldFee = bridgeFeeBps;
        bridgeFeeBps = newBridgeFeeBps;
        emit BridgeFeeUpdated(oldFee, newBridgeFeeBps);
    }
    
    /**
     * @notice Withdraw funds (emergency only)
     * @param token Token address to withdraw
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawFunds(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "SkipBridge: invalid recipient");
        IERC20(token).safeTransfer(to, amount);
        emit FundsWithdrawn(token, to, amount);
    }
    
    /**
     * @notice Get contract balance of USDC
     * @return USDC balance
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
    
    /**
     * @notice Calculate bridge fee for an amount
     * @param amount Bridge amount
     * @return Fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * bridgeFeeBps) / 10000;
    }
}

