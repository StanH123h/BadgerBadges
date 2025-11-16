#!/usr/bin/env node

/**
 * 自动生成开发环境配置文件
 * 运行: node setup-env.js
 *
 * 不需要任何依赖，使用 Node.js 内置模块
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🦡 BadgerBadge 环境配置工具\n');

// 使用 Hardhat 默认测试账户（本地开发最方便）
const HARDHAT_ACCOUNTS = {
  account0: {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  account1: {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
};

console.log('使用 Hardhat 默认测试账户配置开发环境\n');
console.log('💡 提示：这是公开的测试账户，只能用于本地开发！\n');

const deployerKey = HARDHAT_ACCOUNTS.account0.privateKey;
const signerKey = HARDHAT_ACCOUNTS.account0.privateKey; // 用同一个账户
const deployerAddress = HARDHAT_ACCOUNTS.account0.address;
const signerAddress = HARDHAT_ACCOUNTS.account0.address;

console.log('📋 账户信息：');
console.log(`   部署账户: ${deployerAddress}`);
console.log(`   签名账户: ${signerAddress}`);
console.log('');

// 生成 packages/contracts/.env
const contractsEnv = `# BadgerBadge 合约配置
# 自动生成于 ${new Date().toISOString()}

# 部署账户私钥
DEPLOYER_KEY=${deployerKey}

# 后端签名账户私钥（必须和 apps/web/.env.local 中的一致）
BACKEND_SIGNER_KEY=${signerKey}

# Sepolia 测试网 RPC（部署到测试网时需要）
# 获取免费 RPC: https://www.alchemy.com/ 或 https://infura.io/
SEPOLIA_RPC=

# 合约地址（部署后自动更新）
ACHIEVEMENTS_CONTRACT_ADDRESS=
`;

const contractsEnvPath = path.join(__dirname, 'packages/contracts/.env');
fs.writeFileSync(contractsEnvPath, contractsEnv);
console.log('✅ 已创建:', contractsEnvPath);

// 生成 apps/web/.env.local
const webEnv = `# BadgerBadge Web 应用配置
# 自动生成于 ${new Date().toISOString()}

# 后端签名私钥（必须和 packages/contracts/.env 中的 BACKEND_SIGNER_KEY 一致！）
BACKEND_SIGNER_KEY=${signerKey}

# 当前网络（localhost, sepolia, mainnet）
NEXT_PUBLIC_NETWORK=localhost

# 合约地址（部署后填写）
NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS=

# Sepolia RPC（可选）
NEXT_PUBLIC_SEPOLIA_RPC=
`;

const webEnvPath = path.join(__dirname, 'apps/web/.env.local');
fs.writeFileSync(webEnvPath, webEnv);
console.log('✅ 已创建:', webEnvPath);

console.log('\n🎉 配置完成！\n');
console.log('📝 下一步操作：\n');
console.log('1. 安装依赖（如果还没装）:');
console.log('   pnpm install\n');
console.log('2. 编译合约:');
console.log('   pnpm build:contracts\n');
console.log('3. 更新 ABI:');
console.log('   pnpm --filter @badger/shared update-abi\n');
console.log('4. 启动 Hardhat 节点（新终端 1）:');
console.log('   pnpm dev:contracts\n');
console.log('5. 部署合约（新终端 2）:');
console.log('   pnpm deploy:local\n');
console.log('6. 启动前端（新终端 3）:');
console.log('   pnpm dev:web\n');

console.log('⚠️  重要提醒：');
console.log('   - 你正在使用 Hardhat 测试账户（公开私钥）');
console.log('   - 这些账户只能用于本地开发，不要充值真钱！');
console.log('   - 本地节点会自动给这些账户 10000 ETH\n');
console.log('💡 部署到测试网？');
console.log('   需要生成新的私钥，参考 SETUP.md 中的"生成密钥对"部分\n');
