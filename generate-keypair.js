/**
 * 生成Solana密钥对（用于backend signer）
 * 运行：node generate-keypair.js
 */

const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

// 生成新密钥对
const keypair = Keypair.generate();

console.log('='.repeat(60));
console.log('🔑 Backend Signer密钥已生成');
console.log('='.repeat(60));
console.log('\n📍 公钥（Public Key）:');
console.log(keypair.publicKey.toString());
console.log('\n🔐 私钥（Private Key - Base58格式）:');
console.log(bs58.encode(keypair.secretKey));
console.log('\n📋 私钥（数组格式，用于JSON文件）:');
console.log(JSON.stringify(Array.from(keypair.secretKey)));
console.log('\n');
console.log('⚠️  请妥善保管私钥！不要分享给任何人！');
console.log('='.repeat(60));
console.log('\n✅ 下一步：');
console.log('1. 复制Base58私钥到 apps/web/.env.local 的 BACKEND_SIGNER_KEY');
console.log('2. 复制公钥，初始化Solana程序时使用');
console.log('\n');
