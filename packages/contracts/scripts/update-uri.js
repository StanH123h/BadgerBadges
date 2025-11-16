const hre = require('hardhat');
const { ethers } = require('hardhat');

async function main() {
  console.log('🔄 Updating Base URI for Achievements contract...\n');

  const contractAddress = process.env.ACHIEVEMENTS_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const newBaseURI = 'http://localhost:3000/api/metadata/';

  console.log('Contract address:', contractAddress);
  console.log('New Base URI:', newBaseURI);

  // 连接到合约
  const Achievements = await ethers.getContractFactory('Achievements');
  const achievements = Achievements.attach(contractAddress);

  // 调用 setBaseURI
  console.log('\nUpdating...');
  const tx = await achievements.setBaseURI(newBaseURI);
  await tx.wait();

  console.log('✅ Base URI updated successfully!');
  console.log('Transaction hash:', tx.hash);

  // 验证
  console.log('\n🔍 Testing tokenURI for token #0...');
  try {
    const tokenURI = await achievements.tokenURI(0);
    console.log('Token URI:', tokenURI);
    console.log('\n✅ Perfect! Now visit this URL to see the metadata:');
    console.log(`   ${tokenURI}`);
  } catch (error) {
    console.log('⚠️  No token #0 minted yet');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
