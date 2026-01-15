import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { SkipBridge } from "../typechain-types";

describe("SkipBridge", function () {
  let skipBridge: SkipBridge;
  let mockUSDC: any;
  let owner: SignerWithAddress;
  let relayer: SignerWithAddress;
  let user: SignerWithAddress;
  let treasury: SignerWithAddress;

  const MIN_BRIDGE_AMOUNT = ethers.parseUnits("1", 6); // 1 USDC
  const MAX_BRIDGE_AMOUNT = ethers.parseUnits("100000", 6); // 100k USDC
  const BRIDGE_FEE_BPS = 50; // 0.5%

  beforeEach(async function () {
    [owner, relayer, user, treasury] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint USDC to user
    await mockUSDC.mint(user.address, ethers.parseUnits("10000", 6));

    // Deploy SkipBridge
    const SkipBridge = await ethers.getContractFactory("SkipBridge");
    skipBridge = await SkipBridge.deploy(
      await mockUSDC.getAddress(),
      owner.address,
      relayer.address,
      MIN_BRIDGE_AMOUNT,
      MAX_BRIDGE_AMOUNT,
      BRIDGE_FEE_BPS
    );
    await skipBridge.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await skipBridge.owner()).to.equal(owner.address);
    });

    it("Should set the right relayer", async function () {
      expect(await skipBridge.skipRelayer()).to.equal(relayer.address);
    });

    it("Should set bridge limits correctly", async function () {
      expect(await skipBridge.minBridgeAmount()).to.equal(MIN_BRIDGE_AMOUNT);
      expect(await skipBridge.maxBridgeAmount()).to.equal(MAX_BRIDGE_AMOUNT);
    });

    it("Should set bridge fee correctly", async function () {
      expect(await skipBridge.bridgeFeeBps()).to.equal(BRIDGE_FEE_BPS);
    });
  });

  describe("Bridge Initiation", function () {
    it("Should allow user to initiate bridge", async function () {
      const amount = ethers.parseUnits("100", 6);
      const dydxAddress = "dydx1test123";

      // Approve USDC
      await mockUSDC.connect(user).approve(await skipBridge.getAddress(), amount);

      // Initiate bridge
      const tx = await skipBridge.connect(user).initiateBridge(amount, dydxAddress);
      const receipt = await tx.wait();
      
      // Check event
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "BridgeInitiated"
      );
      expect(event).to.not.be.undefined;
    });

    it("Should reject amounts below minimum", async function () {
      const amount = ethers.parseUnits("0.5", 6);
      const dydxAddress = "dydx1test123";

      await mockUSDC.connect(user).approve(await skipBridge.getAddress(), amount);

      await expect(
        skipBridge.connect(user).initiateBridge(amount, dydxAddress)
      ).to.be.revertedWith("SkipBridge: amount below minimum");
    });

    it("Should reject amounts above maximum", async function () {
      const amount = ethers.parseUnits("200000", 6);
      const dydxAddress = "dydx1test123";

      await mockUSDC.connect(user).approve(await skipBridge.getAddress(), amount);

      await expect(
        skipBridge.connect(user).initiateBridge(amount, dydxAddress)
      ).to.be.revertedWith("SkipBridge: amount above maximum");
    });

    it("Should calculate and collect fee correctly", async function () {
      const amount = ethers.parseUnits("100", 6);
      const dydxAddress = "dydx1test123";
      const expectedFee = (amount * BigInt(BRIDGE_FEE_BPS)) / BigInt(10000);

      await mockUSDC.connect(user).approve(await skipBridge.getAddress(), amount);

      const ownerBalanceBefore = await mockUSDC.balanceOf(owner.address);
      await skipBridge.connect(user).initiateBridge(amount, dydxAddress);
      const ownerBalanceAfter = await mockUSDC.balanceOf(owner.address);

      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedFee);
    });
  });

  describe("Bridge Processing", function () {
    let requestId: string;
    const dydxAddress = "dydx1test123";
    const amount = ethers.parseUnits("100", 6);

    beforeEach(async function () {
      await mockUSDC.connect(user).approve(await skipBridge.getAddress(), amount);
      const tx = await skipBridge.connect(user).initiateBridge(amount, dydxAddress);
      const receipt = await tx.wait();
      
      // Extract requestId from event
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "BridgeInitiated"
      );
      if (event && event.args) {
        requestId = event.args[0];
      }
    });

    it("Should allow relayer to process bridge", async function () {
      const trackingId = ethers.hexlify(ethers.randomBytes(32));
      const txHash = "0x1234567890abcdef";

      await skipBridge.connect(relayer).processBridge(requestId, trackingId, txHash);

      const request = await skipBridge.getBridgeRequest(requestId);
      expect(request.status).to.equal(1); // Processing
      expect(request.trackingId).to.equal(trackingId);
      expect(request.txHash).to.equal(txHash);
    });

    it("Should reject non-relayer from processing", async function () {
      const trackingId = ethers.hexlify(ethers.randomBytes(32));
      const txHash = "0x1234567890abcdef";

      await expect(
        skipBridge.connect(user).processBridge(requestId, trackingId, txHash)
      ).to.be.revertedWith("SkipBridge: not authorized relayer");
    });

    it("Should allow relayer to complete bridge", async function () {
      const trackingId = ethers.hexlify(ethers.randomBytes(32));
      const txHash = "0x1234567890abcdef";

      await skipBridge.connect(relayer).processBridge(requestId, trackingId, txHash);
      await skipBridge.connect(relayer).completeBridge(requestId);

      const request = await skipBridge.getBridgeRequest(requestId);
      expect(request.status).to.equal(2); // Completed
    });

    it("Should allow relayer to fail bridge and refund", async function () {
      const trackingId = ethers.hexlify(ethers.randomBytes(32));
      const txHash = "0x1234567890abcdef";
      const reason = "Bridge failed";

      const userBalanceBefore = await mockUSDC.balanceOf(user.address);
      await skipBridge.connect(relayer).failBridge(requestId, reason);
      const userBalanceAfter = await mockUSDC.balanceOf(user.address);

      const request = await skipBridge.getBridgeRequest(requestId);
      expect(request.status).to.equal(3); // Failed
      expect(userBalanceAfter - userBalanceBefore).to.equal(amount - ((amount * BigInt(BRIDGE_FEE_BPS)) / BigInt(10000)));
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update relayer", async function () {
      const newRelayer = ethers.Wallet.createRandom().address;
      await skipBridge.connect(owner).setRelayer(newRelayer);
      expect(await skipBridge.skipRelayer()).to.equal(newRelayer);
    });

    it("Should allow owner to update bridge limits", async function () {
      const newMin = ethers.parseUnits("2", 6);
      const newMax = ethers.parseUnits("200000", 6);
      await skipBridge.connect(owner).setBridgeLimits(newMin, newMax);
      expect(await skipBridge.minBridgeAmount()).to.equal(newMin);
      expect(await skipBridge.maxBridgeAmount()).to.equal(newMax);
    });

    it("Should allow owner to update bridge fee", async function () {
      const newFee = 75; // 0.75%
      await skipBridge.connect(owner).setBridgeFee(newFee);
      expect(await skipBridge.bridgeFeeBps()).to.equal(newFee);
    });
  });
});

