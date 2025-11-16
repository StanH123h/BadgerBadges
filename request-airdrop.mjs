import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const walletAddress = process.argv[2];

if (!walletAddress) {
  console.log('❌ 请提供钱包地址！');
  console.log('用法: node request-airdrop.mjs YOUR_WALLET_ADDRESS');
  process.exit(1);
}

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

console.log('🌧️  正在请求Devnet airdrop...');
console.log('钱包地址:', walletAddress);

try {
  const pubkey = new PublicKey(walletAddress);
  const signature = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
  
  console.log('⏳ 等待确认...');
  await connection.confirmTransaction(signature);
  
  const balance = await connection.getBalance(pubkey);
  console.log('✅ Airdrop成功！');
  console.log('当前余额:', balance / LAMPORTS_PER_SOL, 'SOL');
} catch (error) {
  console.error('❌ Airdrop失败:', error.message);
  console.log('\n💡 提示：如果失败，访问 https://faucet.solana.com/ 手动请求');
}
