import { expect } from 'chai';
import { ethers } from 'hardhat';
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
        .withArgs(user1.address, 0, ACHIEVEMENT_ID);

      // Verify ownership
      expect(await achievements.ownerOf(0)).to.equal(user1.address);
      expect(await achievements.hasAchievement(user1.address, ACHIEVEMENT_ID)).to.be.true;
      expect(await achievements.getAchievementId(0)).to.equal(ACHIEVEMENT_ID);
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
