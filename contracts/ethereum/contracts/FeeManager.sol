// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FeeManager
 * @notice Manages trading fees and fee distribution
 * @dev Collects fees from trades and distributes to treasury/referrers
 */
contract FeeManager is Ownable {
    using SafeERC20 for IERC20;
    
    IERC20 public immutable usdc;
    
    // Fee rates in basis points (1 basis point = 0.01%)
    uint256 public makerFeeBps = 2; // 0.02%
    uint256 public takerFeeBps = 5; // 0.05%
    
    // Fee recipient addresses
    address public treasury;
    address public feeRecipient;
    
    // Fee collection tracking
    mapping(address => uint256) public traderFeesPaid;
    uint256 public totalFeesCollected;
    
    // Events
    event FeeCollected(
        address indexed trader,
        uint256 amount,
        string feeType,
        uint256 timestamp
    );
    
    event FeeRatesUpdated(uint256 makerFeeBps, uint256 takerFeeBps);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    
    constructor(
        address _usdc,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_treasury != address(0), "Invalid treasury address");
        usdc = IERC20(_usdc);
        treasury = _treasury;
        feeRecipient = _treasury;
    }
    
    /**
     * @notice Calculate fee for a trade
     * @param amount Trade amount
     * @param isMaker Whether this is a maker order
     * @return Fee amount
     */
    function calculateFee(uint256 amount, bool isMaker) external view returns (uint256) {
        uint256 feeBps = isMaker ? makerFeeBps : takerFeeBps;
        return (amount * feeBps) / 10000;
    }
    
    /**
     * @notice Collect fee from a trade
     * @param trader Trader address
     * @param amount Trade amount
     * @param isMaker Whether this is a maker order
     */
    function collectFee(
        address trader,
        uint256 amount,
        bool isMaker
    ) external onlyOwner returns (uint256) {
        uint256 fee = this.calculateFee(amount, isMaker);
        
        if (fee > 0) {
            traderFeesPaid[trader] += fee;
            totalFeesCollected += fee;
            
            // Transfer fee to recipient
            usdc.safeTransferFrom(msg.sender, feeRecipient, fee);
            
            emit FeeCollected(trader, fee, isMaker ? "maker" : "taker", block.timestamp);
        }
        
        return fee;
    }
    
    /**
     * @notice Update fee rates
     * @param newMakerFeeBps New maker fee in basis points
     * @param newTakerFeeBps New taker fee in basis points
     */
    function setFeeRates(uint256 newMakerFeeBps, uint256 newTakerFeeBps) external onlyOwner {
        require(newMakerFeeBps <= 100, "Maker fee too high"); // Max 1%
        require(newTakerFeeBps <= 100, "Taker fee too high"); // Max 1%
        
        makerFeeBps = newMakerFeeBps;
        takerFeeBps = newTakerFeeBps;
        
        emit FeeRatesUpdated(newMakerFeeBps, newTakerFeeBps);
    }
    
    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @notice Update fee recipient address
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient address");
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }
    
    /**
     * @notice Get total fees paid by a trader
     * @param trader Trader address
     * @return Total fees paid
     */
    function getTraderFees(address trader) external view returns (uint256) {
        return traderFeesPaid[trader];
    }
}
