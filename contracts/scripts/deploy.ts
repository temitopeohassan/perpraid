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

  console.log("\n=== Deployment Summary ===");
  console.log("PerpRaidVault:", vaultAddress);
  console.log("PositionRegistry:", registryAddress);
  console.log("FeeManager:", feeManagerAddress);
  console.log("\nSave these addresses for your backend configuration!");

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
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
