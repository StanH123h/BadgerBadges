# BadgerBadge - UW-Madison Campus Achievements

一个允许 UW-Madison 学生通过完成校园活动和里程碑来认领链上 NFT 成就徽章的系统。

## 项目结构

```
badgerbadge/
├── apps/
│   └── web/                    # Next.js 前端应用
│       ├── app/
│       │   ├── api/claim/     # 后端 API（验证和签名）
│       │   ├── layout.jsx     # 应用布局
│       │   └── page.jsx       # 首页
│       └── package.json
│
├── packages/
│   ├── contracts/             # Hardhat 智能合约项目
│   │   ├── contracts/
│   │   │   └── Achievements.sol  # 主合约
│   │   ├── scripts/
│   │   │   └── deploy.js      # 部署脚本
│   │   ├── test/              # 合约测试
│   │   └── hardhat.config.js
│   │
│   └── shared/                # 共享代码（成就定义、ABI等）
│       └── src/
│           ├── achievements.js
│           ├── contracts.js
│           └── abi/
│
├── package.json               # 根 package.json（workspace）
└── pnpm-workspace.yaml
```

## 快速开始

### 1. 安装依赖

```bash
# 安装 pnpm（如果还没有）
npm install -g pnpm

# 安装所有依赖
pnpm install
```

### 2. 配置环境变量

```bash
# 在 packages/contracts/ 创建 .env
cd packages/contracts
cp .env.example .env

# 编辑 .env，添加：
# - DEPLOYER_KEY: 部署账户私钥
# - BACKEND_SIGNER_KEY: 后端签名私钥（重要！）
# - SEPOLIA_RPC: Sepolia RPC URL（可选）

# 在 apps/web/ 创建 .env.local
cd ../../apps/web
cp .env.local.example .env.local

# 编辑 .env.local，添加相同的 BACKEND_SIGNER_KEY
```

### 3. 编译合约

```bash
pnpm build:contracts
```

### 4. 更新 ABI

编译完成后，将 ABI 复制到 shared 包：

```bash
pnpm --filter @badger/shared update-abi
```

### 5. 启动本地开发环境

**终端 1 - 启动 Hardhat 本地节点：**

```bash
pnpm dev:contracts
```

这会启动一个本地 EVM 节点在 http://127.0.0.1:8545

**终端 2 - 部署合约：**

```bash
pnpm deploy:local
```

记下输出的合约地址，然后：

1. 更新 `packages/shared/src/contracts.js` 中的 `localhost.achievementsAddress`
2. 更新 `apps/web/.env.local` 中的 `NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS`

**终端 3 - 启动 Next.js 开发服务器：**

```bash
pnpm dev:web
```

访问 http://localhost:3000

### 6. 连接 MetaMask

1. 在 MetaMask 中添加本地网络：
   - 网络名称: Localhost 8545
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - 货币符号: ETH

2. 导入 Hardhat 测试账户（从终端 1 的输出中获取私钥）

3. 刷新页面并连接钱包

## 运行测试

```bash
# 运行合约测试
pnpm test:contracts
```

## 部署到 Sepolia 测试网

1. 确保 `.env` 中配置了 `SEPOLIA_RPC` 和 `DEPLOYER_KEY`
2. 确保部署账户有 Sepolia ETH（从 [faucet](https://sepoliafaucet.com/) 获取）
3. 运行部署：

```bash
pnpm deploy:sepolia
```

4. 更新配置：
   - `packages/shared/src/contracts.js` 中的 `sepolia.achievementsAddress`
   - `apps/web/.env.local` 中设置 `NEXT_PUBLIC_NETWORK=sepolia`

## 可用成就

当前系统包含以下成就：

1. **Madison Rainy Day** 🌧️ - 在 Madison 下雨天访问校园
2. **First Snow** ❄️ - 见证 2025 年第一场雪
3. **Morgridge Hackathon** 💻 - 参加 Morgridge Hall 的 hackathon
4. **Late Night Hacker** 🌙 - 凌晨 2-5 点在 Morgridge Hall 编程

## 架构说明

### 智能合约 (Achievements.sol)

- 基于 ERC721 的 NFT 合约
- 每个用户每个成就只能铸造一次
- 使用链下签名验证（ECDSA）
- 防重放攻击保护（nonce + deadline + chainId）

### 后端验证 (apps/web/app/api/claim/route.js)

后端 API 负责：
1. 验证用户资格（天气、位置、时间、事件代码等）
2. 生成唯一 nonce
3. 签名授权消息
4. 返回签名给前端

### 前端 (apps/web/app/page.jsx)

- 连接 Web3 钱包（MetaMask）
- 显示可用成就
- 请求后端验证
- 调用合约铸造 NFT

## 🔴 安全警告

这是一个演示项目，包含多个**必须在生产环境修复**的安全问题：

### 1. Gas 费问题
- ❌ 学生需要 ETH 支付 gas
- ✅ **修复**: 实现 EIP-2771 meta-transactions 或后端代付

### 2. 位置欺骗
- ❌ 浏览器发送的 lat/lng 完全不可信
- ✅ **修复**: 使用 QR 码扫描、WiFi BSSID 验证或蓝牙信标

### 3. 天气验证
- ❌ 当前只是模拟验证
- ✅ **修复**: 集成真实天气 API（OpenWeatherMap、Weather.gov）

### 4. Nonce 存储
- ❌ 当前使用内存存储，服务器重启后丢失
- ✅ **修复**: 使用数据库（Redis、PostgreSQL）

### 5. 速率限制
- ❌ 没有速率限制
- ✅ **修复**: 按 IP/钱包地址限流

### 6. 元数据存储
- ❌ tokenURI 未实现
- ✅ **修复**: 使用 IPFS 或中心化 API 存储元数据

详细的安全注释见合约和 API 代码中的注释。

## 技术栈

- **智能合约**: Solidity ^0.8.24, Hardhat, OpenZeppelin
- **前端**: Next.js 15 (App Router), React 19, Ethers.js v6
- **后端**: Next.js API Routes
- **语言**: 纯 JavaScript（无 TypeScript）
- **包管理**: pnpm workspaces

## 常见问题

### 前端报错 "Contract address not configured"

确保：
1. 已部署合约
2. 已更新 `apps/web/.env.local` 中的 `NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS`
3. 已重启 Next.js 开发服务器

### 后端报错 "Backend signer not configured"

确保 `apps/web/.env.local` 中有 `BACKEND_SIGNER_KEY`，且该地址与合约中的 signer 地址一致。

### 交易失败 "Invalid signature"

检查：
1. 后端使用的私钥对应的地址是否与合约中的 signer 一致
2. 网络是否正确（localhost/sepolia）
3. 合约地址是否正确

### 如何查看我铸造的 NFT？

1. 在区块浏览器查看交易
2. 或调用合约的 `balanceOf(yourAddress)` 查看数量
3. 或调用 `hasAchievement(yourAddress, achievementId)` 查看特定成就

## 开发路线图

- [ ] 实现真实天气 API 集成
- [ ] 添加 QR 码验证系统
- [ ] 实现 gasless transactions（meta-transactions）
- [ ] 添加 IPFS 元数据存储
- [ ] 集成大学学生信息系统（学术成就）
- [ ] 添加成就展示页面
- [ ] 实现成就排行榜
- [ ] 移动端优化

## 贡献

欢迎贡献！请提交 Issue 或 Pull Request。

## 许可证

MIT License
