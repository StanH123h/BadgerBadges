# 完整设置指南

## 第一次设置（详细步骤）

### 步骤 1: 安装 pnpm 和依赖

```bash
# 安装 pnpm
npm install -g pnpm

# 在项目根目录
cd /path/to/badgerbadge
pnpm install
```

### 步骤 2: 生成密钥对

你需要两个私钥：

1. **DEPLOYER_KEY**: 用于部署合约
2. **BACKEND_SIGNER_KEY**: 用于后端签名（**这个非常重要！**）

**生成新密钥（推荐用于开发）：**

```bash
cd packages/contracts
node -e "const ethers = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

运行两次，分别得到两个密钥对。

**或使用 Hardhat 测试账户（仅本地开发）：**

启动 `pnpm dev:contracts` 后，会看到 10 个测试账户的私钥。

### 步骤 3: 配置环境变量

**packages/contracts/.env**

```bash
cd packages/contracts
cp .env.example .env
```

编辑 `.env`:

```env
# 部署账户私钥（有 ETH 的账户）
DEPLOYER_KEY=0x...

# 后端签名私钥（可以和 DEPLOYER_KEY 相同，也可以不同）
BACKEND_SIGNER_KEY=0x...

# Sepolia RPC（可选，仅部署到测试网时需要）
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**apps/web/.env.local**

```bash
cd apps/web
cp .env.local.example .env.local
```

编辑 `.env.local`:

```env
# 必须和 packages/contracts/.env 中的 BACKEND_SIGNER_KEY 一致！
BACKEND_SIGNER_KEY=0x...

# 网络（localhost 或 sepolia）
NEXT_PUBLIC_NETWORK=localhost

# 合约地址（部署后填写）
NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS=

# Sepolia RPC（可选）
NEXT_PUBLIC_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### 步骤 4: 编译合约

```bash
# 在项目根目录
pnpm build:contracts
```

应该看到：

```
Compiled 1 Solidity file successfully
```

### 步骤 5: 复制 ABI

```bash
pnpm --filter @badger/shared update-abi
```

应该看到：

```
✅ ABI updated successfully!
```

### 步骤 6: 启动本地节点

**打开新终端（终端 1）：**

```bash
cd /path/to/badgerbadge
pnpm dev:contracts
```

你会看到：

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

**保持这个终端运行！**

### 步骤 7: 部署合约

**打开新终端（终端 2）：**

```bash
cd /path/to/badgerbadge
pnpm deploy:local
```

你会看到：

```
🦡 Deploying BadgerBadge Achievements contract...

Deploying with account: 0x...
Backend signer address: 0x...

✅ Achievements contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**重要：复制合约地址！**

### 步骤 8: 更新合约地址

1. 编辑 `packages/shared/src/contracts.js`:

```javascript
localhost: {
  chainId: 31337,
  achievementsAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // 👈 粘贴这里
  rpcUrl: 'http://127.0.0.1:8545',
},
```

2. 编辑 `apps/web/.env.local`:

```env
NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 步骤 9: 启动前端

**打开新终端（终端 3）：**

```bash
cd /path/to/badgerbadge
pnpm dev:web
```

访问 http://localhost:3000

### 步骤 10: 配置 MetaMask

1. 打开 MetaMask
2. 点击网络下拉菜单 → "添加网络" → "手动添加网络"
3. 填写：
   - **网络名称**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **链 ID**: 31337
   - **货币符号**: ETH
4. 保存

5. 导入测试账户：
   - 点击账户图标 → "导入账户"
   - 粘贴终端 1 中显示的私钥（Account #0）
   - 导入

### 步骤 11: 测试认领成就

1. 刷新页面 http://localhost:3000
2. 点击 "Connect Wallet"
3. 授权 MetaMask 连接
4. 点击任意成就的 "Claim Achievement" 按钮
5. 允许浏览器获取你的位置（或使用模拟位置）
6. 等待后端验证
7. 确认 MetaMask 交易
8. 等待交易确认

成功！🎉

## 验证一切正常

### 检查后端配置

访问 http://localhost:3000/api/claim

应该看到：

```json
{
  "status": "ok",
  "signerConfigured": true,
  "signerAddress": "0x...",
  "contractAddress": "0x5FbDB...",
  "network": "localhost"
}
```

### 检查合约

在终端运行：

```bash
cd packages/contracts
npx hardhat console --network localhost
```

然后：

```javascript
const Achievements = await ethers.getContractFactory('Achievements');
const achievements = await Achievements.attach('0x5FbDB...');  // 你的合约地址
await achievements.signer();  // 应该返回 backend signer 地址
```

## 常见问题排查

### 问题 1: "Cannot find module '@badger/shared'"

**原因**: workspace 依赖未正确安装

**解决**:
```bash
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install
```

### 问题 2: "Invalid signature"

**原因**: 后端私钥与合约中的 signer 不一致

**检查**:

1. 查看部署日志中的 "Backend signer address"
2. 在合约中验证：`await achievements.signer()`
3. 检查 `apps/web/.env.local` 中的 `BACKEND_SIGNER_KEY`
4. 确保私钥对应的地址一致

**解决**: 重新部署合约或更新 `.env.local` 中的私钥

### 问题 3: MetaMask 显示错误的 nonce

**原因**: 本地节点重启后，MetaMask 的 nonce 缓存未更新

**解决**:
1. MetaMask 设置 → 高级 → 清除活动和 nonce 数据
2. 刷新页面

### 问题 4: ABI 相关错误

**原因**: ABI 未更新或损坏

**解决**:
```bash
pnpm build:contracts
pnpm --filter @badger/shared update-abi
# 重启 Next.js 服务器
```

### 问题 5: 交易总是失败

**检查清单**:

1. MetaMask 连接到正确的网络（Chain ID 31337）
2. 账户有足够的 ETH
3. 合约地址正确
4. 后端 API 返回了有效签名（检查浏览器控制台）
5. 签名未过期（5 分钟有效期）

## 部署到 Sepolia（可选）

### 1. 获取 Sepolia ETH

访问 https://sepoliafaucet.com/ 或 https://faucet.quicknode.com/ethereum/sepolia

### 2. 更新环境变量

`.env` 和 `.env.local`:

```env
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_NETWORK=sepolia
```

### 3. 部署

```bash
pnpm deploy:sepolia
```

### 4. 更新合约地址

同步骤 8，但更新 `sepolia.achievementsAddress`

### 5. 验证合约（可选）

```bash
cd packages/contracts
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS "BACKEND_SIGNER_ADDRESS" "https://api.badgerbadge.uw.edu/metadata/"
```

## 下一步

现在你的本地开发环境已经完全设置好了！

你可以：

1. 添加新的成就定义（`packages/shared/src/achievements.js`）
2. 实现真实的验证逻辑（`apps/web/app/api/claim/route.js`）
3. 自定义前端 UI（`apps/web/app/page.jsx`）
4. 扩展智能合约功能（`packages/contracts/contracts/Achievements.sol`）

祝编码愉快！🦡
