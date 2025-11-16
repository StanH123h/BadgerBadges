import pkg from 'hardhat';
const { ethers } = pkg;

async function main() {
  console.log('🦡 Deploying BadgerBadge Achievements contract...\n');

  const [deployer] = await ethers.getSigners();

  console.log('Deploying with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH\n');

  // Load backend signer
  const backendSignerKey = process.env.BACKEND_SIGNER_KEY;
  if (!backendSignerKey) {
    throw new Error('❌ BACKEND_SIGNER_KEY not found in .env');
  }

  const backendWallet = new ethers.Wallet(backendSignerKey);
  const backendSignerAddress = backendWallet.address;

  console.log('Backend signer address:', backendSignerAddress);

  const baseURI = 'https://api.badgerbadge.uw.edu/metadata/';

  // Deploy contract
  const Achievements = await ethers.getContractFactory('Achievements');
  const achievements = await Achievements.deploy(backendSignerAddress, baseURI);
  await achievements.waitForDeployment();

  const contractAddress = await achievements.getAddress();

  console.log('\n✅ Achievements contract deployed to:', contractAddress);

  console.log('\n📝 Next steps:');
  console.log('1. Update .env with:');
  console.log(`   ACHIEVEMENTS_CONTRACT_ADDRESS=${contractAddress}`);
  console.log('2. Update packages/shared/src/contracts.js with the contract address');
  console.log('3. Copy ABI from artifacts to packages/shared/src/abi/');
  console.log('\n⚠️ IMPORTANT: Verify contract on block explorer:');
  console.log(
    `   npx hardhat verify --network sepolia ${contractAddress} "${backendSignerAddress}" "${baseURI}"`
  );

  return contractAddress;
}

main().catch((err) => {
  console.error('❌ Deployment failed:');
  console.error(err);
  process.exitCode = 1;
});
