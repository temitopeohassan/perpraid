// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ISkipBridge
 * @notice Interface for SkipBridge contract
 */
interface ISkipBridge {
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
    
    function initiateBridge(
        uint256 amount,
        string calldata dydxAddress
    ) external returns (bytes32 requestId);
    
    function processBridge(
        bytes32 requestId,
        bytes32 trackingId,
        string calldata txHash
    ) external;
    
    function completeBridge(bytes32 requestId) external;
    
    function failBridge(
        bytes32 requestId,
        string calldata reason
    ) external;
    
    function getBridgeRequest(bytes32 requestId)
        external
        view
        returns (BridgeRequest memory);
    
    function getUserBridgeRequests(address user)
        external
        view
        returns (bytes32[] memory);
    
    function calculateFee(uint256 amount) external view returns (uint256);
    
    function minBridgeAmount() external view returns (uint256);
    function maxBridgeAmount() external view returns (uint256);
    function bridgeFeeBps() external view returns (uint256);
}

