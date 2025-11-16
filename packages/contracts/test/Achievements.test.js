import { expect } from 'chai';
import hre from 'hardhat';
const { ethers } = hre;
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers.js';

describe('Achievements Contract', function () {
  let achievements;
  let owner;
  let backendSigner;
  let user1;
  let user2;

  const ACHIEVEMENT_ID = ethers.id('RAINY_DAY_2025'); // Convert string to bytes32

  beforeEach(async function () {
    [owner, backendSigner, user1, user2] = await ethers.getSigners();

    const Achievements = await ethers.getContractFactory('Achievements');
    achievements = await Achievements.deploy(
      backendSigner.address,
      'https://api.example.com/metadata/'
    );
  });

  describe('Deployment', function () {
    it('Should set the correct signer', async function () {
      expect(await achievements.signer()).to.equal(backendSigner.address);
    });

    it('Should set the correct owner', async function () {
      expect(await achievements.owner()).to.equal(owner.address);
    });
  });

  describe('Minting', function () {
    it('Should mint achievement with valid signature', async function () {
      const nonce = ethers.randomBytes(32);
      const deadline = (await time.latest()) + 3600; // 1 hour from now
      const chainId = (await ethers.provider.getNetwork()).chainId;

      // Create message hash (same as in contract)
      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
        [user1.address, ACHIEVEMENT_ID, nonce, deadline, chainId, await achievements.getAddress()]
      );

      // Sign with backend signer
      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      const tokenId = BigInt(ACHIEVEMENT_ID);

      // Mint
      await expect(
        achievements.connect(user1).mintAchievement(
          user1.address,
          ACHIEVEMENT_ID,
          nonce,
          deadline,
          signature
        )
      )
        .to.emit(achievements, 'AchievementMinted')
        .withArgs(user1.address, tokenId, ACHIEVEMENT_ID);

      // Verify ownership (ERC1155 uses balanceOf)
      expect(await achievements.balanceOf(user1.address, tokenId)).to.equal(1);
      expect(await achievements.hasAchievement(user1.address, ACHIEVEMENT_ID)).to.be.true;
      expect(await achievements.getAchievementId(tokenId)).to.equal(ACHIEVEMENT_ID);
    });

    it('Should reject expired signature', async function () {
      const nonce = ethers.randomBytes(32);
      const deadline = (await time.latest()) - 1; // Already expired
      const chainId = (await ethers.provider.getNetwork()).chainId;

      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
        [user1.address, ACHIEVEMENT_ID, nonce, deadline, chainId, await achievements.getAddress()]
      );

      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      await expect(
        achievements.connect(user1).mintAchievement(
          user1.address,
          ACHIEVEMENT_ID,
          nonce,
          deadline,
          signature
        )
      ).to.be.revertedWith('Signature expired');
    });

    it('Should reject invalid signature', async function () {
      const nonce = ethers.randomBytes(32);
      const deadline = (await time.latest()) + 3600;
      const chainId = (await ethers.provider.getNetwork()).chainId;

      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
        [user1.address, ACHIEVEMENT_ID, nonce, deadline, chainId, await achievements.getAddress()]
      );

      // Sign with wrong signer (user2 instead of backendSigner)
      const signature = await user2.signMessage(ethers.getBytes(messageHash));

      await expect(
        achievements.connect(user1).mintAchievement(
          user1.address,
          ACHIEVEMENT_ID,
          nonce,
          deadline,
          signature
        )
      ).to.be.revertedWith('Invalid signature');
    });

    it('Should prevent double claiming same achievement', async function () {
      const nonce = ethers.randomBytes(32);
      const deadline = (await time.latest()) + 3600;
      const chainId = (await ethers.provider.getNetwork()).chainId;

      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
        [user1.address, ACHIEVEMENT_ID, nonce, deadline, chainId, await achievements.getAddress()]
      );

      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      // First mint succeeds
      await achievements.connect(user1).mintAchievement(
        user1.address,
        ACHIEVEMENT_ID,
        nonce,
        deadline,
        signature
      );

      // Try to mint again with different nonce
      const nonce2 = ethers.randomBytes(32);
      const messageHash2 = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
        [user1.address, ACHIEVEMENT_ID, nonce2, deadline, chainId, await achievements.getAddress()]
      );
      const signature2 = await backendSigner.signMessage(ethers.getBytes(messageHash2));

      await expect(
        achievements.connect(user1).mintAchievement(
          user1.address,
          ACHIEVEMENT_ID,
          nonce2,
          deadline,
          signature2
        )
      ).to.be.revertedWith('Already claimed this achievement');
    });

    it('Should prevent nonce reuse (replay attack)', async function () {
      const nonce = ethers.randomBytes(32);
      const deadline = (await time.latest()) + 3600;
      const chainId = (await ethers.provider.getNetwork()).chainId;

      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
        [user1.address, ACHIEVEMENT_ID, nonce, deadline, chainId, await achievements.getAddress()]
      );

      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      // First mint succeeds
      await achievements.connect(user1).mintAchievement(
        user1.address,
        ACHIEVEMENT_ID,
        nonce,
        deadline,
        signature
      );

      // Try to use same signature for different user (should fail even if nonce is same)
      await expect(
        achievements.connect(user2).mintAchievement(
          user1.address, // Same parameters
          ACHIEVEMENT_ID,
          nonce, // Same nonce
          deadline,
          signature
        )
      ).to.be.revertedWith('Nonce already used');
    });
  });

  describe('Test NFT Minting', function () {
    it('Should mint test NFT with valid signature', async function () {
      const nonce = ethers.randomBytes(32);
      const deadline = (await time.latest()) + 3600;
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const testNFTMarker = ethers.id('TEST_NFT');

      // Create message hash for test NFT
      const messageHash = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
        [user1.address, testNFTMarker, nonce, deadline, chainId, await achievements.getAddress()]
      );

      const signature = await backendSigner.signMessage(ethers.getBytes(messageHash));

      // Mint test NFT
      await expect(
        achievements.connect(user1).mintTestNFT(
          user1.address,
          nonce,
          deadline,
          signature
        )
      )
        .to.emit(achievements, 'TestNFTMinted')
        .withArgs(user1.address, 10000);

      // Verify ownership
      expect(await achievements.balanceOf(user1.address, 10000)).to.equal(1);
      expect(await achievements.isTestNFT(10000)).to.be.true;
      expect(await achievements.testNFTsMinted()).to.equal(1);
    });

    it('Should allow same user to mint multiple test NFTs', async function () {
      const chainId = (await ethers.provider.getNetwork()).chainId;
      const testNFTMarker = ethers.id('TEST_NFT');

      // Mint first test NFT
      const nonce1 = ethers.randomBytes(32);
      const deadline1 = (await time.latest()) + 3600;
      const messageHash1 = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
        [user1.address, testNFTMarker, nonce1, deadline1, chainId, await achievements.getAddress()]
      );
      const signature1 = await backendSigner.signMessage(ethers.getBytes(messageHash1));

      await achievements.connect(user1).mintTestNFT(
        user1.address,
        nonce1,
        deadline1,
        signature1
      );

      // Mint second test NFT
      const nonce2 = ethers.randomBytes(32);
      const deadline2 = (await time.latest()) + 3600;
      const messageHash2 = ethers.solidityPackedKeccak256(
        ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
        [user1.address, testNFTMarker, nonce2, deadline2, chainId, await achievements.getAddress()]
      );
      const signature2 = await backendSigner.signMessage(ethers.getBytes(messageHash2));

      await achievements.connect(user1).mintTestNFT(
        user1.address,
        nonce2,
        deadline2,
        signature2
      );

      // Verify both NFTs are owned
      expect(await achievements.balanceOf(user1.address, 10000)).to.equal(1);
      expect(await achievements.balanceOf(user1.address, 10001)).to.equal(1);
      expect(await achievements.testNFTsMinted()).to.equal(2);
      expect(await achievements.testNFTsOwnedBy(user1.address)).to.equal(2);
    });

    it('Should check isTestNFT correctly', async function () {
      expect(await achievements.isTestNFT(9999)).to.be.false;
      expect(await achievements.isTestNFT(10000)).to.be.true;
      expect(await achievements.isTestNFT(15000)).to.be.true;
      expect(await achievements.isTestNFT(19999)).to.be.true;
      expect(await achievements.isTestNFT(20000)).to.be.false;
    });
  });

  describe('Admin Functions', function () {
    it('Should allow owner to update signer', async function () {
      await expect(achievements.connect(owner).updateSigner(user1.address))
        .to.emit(achievements, 'SignerUpdated')
        .withArgs(backendSigner.address, user1.address);

      expect(await achievements.signer()).to.equal(user1.address);
    });

    it('Should prevent non-owner from updating signer', async function () {
      await expect(
        achievements.connect(user1).updateSigner(user2.address)
      ).to.be.reverted;
    });

    it('Should allow owner to update base URI', async function () {
      const newURI = 'ipfs://QmNewHash/';
      await expect(achievements.connect(owner).setBaseURI(newURI))
        .to.emit(achievements, 'BaseURIUpdated')
        .withArgs(newURI);
    });
  });
});
