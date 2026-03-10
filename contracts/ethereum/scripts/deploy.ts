import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // USDC address on Base
  // Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  // Sepolia: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;
  const MIN_DEPOSIT = ethers.parseUnits("10", 6); // 10 USDC (6 decimals)

  // Deploy PerpRaidVault
  console.log("\nDeploying PerpRaidVault...");
  const Vault = await ethers.getContractFactory("PerpRaidVault");
  const vault = await Vault.deploy(USDC_ADDRESS, deployer.address, MIN_DEPOSIT);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("PerpRaidVault deployed to:", vaultAddress);

  // Deploy PositionRegistry
  console.log("\nDeploying PositionRegistry...");
  const Registry = await ethers.getContractFactory("PositionRegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("PositionRegistry deployed to:", registryAddress);

  // Deploy FeeManager
  console.log("\nDeploying FeeManager...");
  const FeeManager = await ethers.getContractFactory("FeeManager");
  const feeManager = await FeeManager.deploy(USDC_ADDRESS, TREASURY_ADDRESS, deployer.address);
  await feeManager.waitForDeployment();
  const feeManagerAddress = await feeManager.getAddress();
  console.log("FeeManager deployed to:", feeManagerAddress);

  // Deploy SkipBridge
  console.log("\nDeploying SkipBridge...");
  const SkipBridge = await ethers.getContractFactory("SkipBridge");
  const MIN_BRIDGE_AMOUNT = ethers.parseUnits("1", 6); // 1 USDC minimum
  const MAX_BRIDGE_AMOUNT = ethers.parseUnits("100000", 6); // 100k USDC maximum
  const BRIDGE_FEE_BPS = 50; // 0.5% bridge fee (50 basis points)
  const RELAYER_ADDRESS = process.env.RELAYER_ADDRESS || deployer.address;
  
  const skipBridge = await SkipBridge.deploy(
    USDC_ADDRESS,
    deployer.address,
    RELAYER_ADDRESS,
    MIN_BRIDGE_AMOUNT,
    MAX_BRIDGE_AMOUNT,
    BRIDGE_FEE_BPS
  );
  await skipBridge.waitForDeployment();
  const skipBridgeAddress = await skipBridge.getAddress();
  console.log("SkipBridge deployed to:", skipBridgeAddress);

  // Deploy StakingAllowanceManager
  console.log("\nDeploying StakingAllowanceManager...");
  const StakingAllowanceManager = await ethers.getContractFactory("StakingAllowanceManager");
  
  // Uniswap V3 contract addresses on Base mainnet
  // These are the official deployed contracts - DO NOT redeploy
  const UNISWAP_V3_STAKER = process.env.UNISWAP_V3_STAKER || "0x42bE4D6527829FeFA1493e1fb9F3676d2425C3C1"; // Base mainnet
  const NFT_POSITION_MANAGER = process.env.NFT_POSITION_MANAGER || "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1"; // Base mainnet
  const REWARD_TOKEN = process.env.REWARD_TOKEN || USDC_ADDRESS; // Default to USDC, can be changed
  
  const stakingManager = await StakingAllowanceManager.deploy(
    UNISWAP_V3_STAKER,
    NFT_POSITION_MANAGER,
    REWARD_TOKEN,
    USDC_ADDRESS
  );
  await stakingManager.waitForDeployment();
  const stakingManagerAddress = await stakingManager.getAddress();
  console.log("StakingAllowanceManager deployed to:", stakingManagerAddress);
  console.log("  - Uniswap V3 Staker:", UNISWAP_V3_STAKER);
  console.log("  - NFT Position Manager:", NFT_POSITION_MANAGER);
  console.log("  - Reward Token:", REWARD_TOKEN);
  console.log("  - USDC:", USDC_ADDRESS);

  // Store addresses for verification
  const stakingConstructorArgs = {
    uniswapV3Staker: UNISWAP_V3_STAKER,
    nftPositionManager: NFT_POSITION_MANAGER,
    rewardToken: REWARD_TOKEN,
    usdc: USDC_ADDRESS
  };

  console.log("\n=== Deployment Summary ===");
  console.log("PerpRaidVault:", vaultAddress);
  console.log("PositionRegistry:", registryAddress);
  console.log("FeeManager:", feeManagerAddress);
  console.log("SkipBridge:", skipBridgeAddress);
  console.log("StakingAllowanceManager:", stakingManagerAddress);
  console.log("\nSave these addresses for your backend configuration!");
  console.log("\n⚠️  IMPORTANT: Set STAKING_CONTRACT_ADDRESS=" + stakingManagerAddress + " in your backend .env file");

  // Verify contracts if on a testnet/mainnet
  if (process.env.VERIFY === "true") {
    console.log("\nWaiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log("Verifying contracts...");
    try {
      await hre.run("verify:verify", {
        address: vaultAddress,
        constructorArguments: [USDC_ADDRESS, deployer.address, MIN_DEPOSIT],
      });
    } catch (error) {
      console.log("Vault verification failed:", error);
    }
    
    try {
      await hre.run("verify:verify", {
        address: registryAddress,
        constructorArguments: [deployer.address],
      });
    } catch (error) {
      console.log("Registry verification failed:", error);
    }
    
    try {
      await hre.run("verify:verify", {
        address: feeManagerAddress,
        constructorArguments: [USDC_ADDRESS, TREASURY_ADDRESS, deployer.address],
      });
    } catch (error) {
      console.log("FeeManager verification failed:", error);
    }
    
    try {
      await hre.run("verify:verify", {
        address: skipBridgeAddress,
        constructorArguments: [
          USDC_ADDRESS,
          deployer.address,
          RELAYER_ADDRESS,
          MIN_BRIDGE_AMOUNT,
          MAX_BRIDGE_AMOUNT,
          BRIDGE_FEE_BPS
        ],
      });
    } catch (error) {
      console.log("SkipBridge verification failed:", error);
    }
    
    try {
      await hre.run("verify:verify", {
        address: stakingManagerAddress,
        constructorArguments: [
          stakingConstructorArgs.uniswapV3Staker,
          stakingConstructorArgs.nftPositionManager,
          stakingConstructorArgs.rewardToken,
          stakingConstructorArgs.usdc
        ],
      });
    } catch (error) {
      console.log("StakingAllowanceManager verification failed:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
