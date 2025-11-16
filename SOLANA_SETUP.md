# BadgerBadge - Solana版本设置指南

## 🚀 快速开始

这是BadgerBadge项目的Solana版本。相比以太坊版本：

### ✅ 优势：
- **Transaction fee极低** - 约$0.0001 vs 以太坊的$1-50
- **确认速度快** - 400ms vs 以太坊的15秒
- **更适合高频小额交易** - 学生claim成就不需要大量资金
- **Hackathon友好** - Solana生态对开发者支持好

### ⚠️ 需要学习的新技术：
- Rust编程语言
- Anchor框架
- Solana账户模型
- Phantom钱包

---

## 📦 第一步：安装开发工具

### 1. 安装Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 添加到PATH（重启终端后生效）
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 验证安装
solana --version  # 应该显示 1.18.x+
```

### 2. 安装Anchor框架

```bash
# 安装avm (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# 安装最新版Anchor
avm install latest
avm use latest

# 验证
anchor --version  # 应该显示 0.30.x+
```

### 3. 安装前端依赖

```bash
cd packages/shared
pnpm add @solana/web3.js @coral-xyz/anchor @solana/spl-token bs58 tweetnacl

cd ../../apps/web
pnpm add @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-phantom
```

---

## 🔑 第二步：生成密钥

### 1. 生成Solana钱包（部署用）

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

这会生成：
- 公钥（地址）：显示在终端
- 私钥：保存在 `~/.config/solana/id.json`

### 2. 生成Backend Signer密钥

```bash
solana-keygen new --outfile ~/.config/solana/backend-signer.json
```

记下公钥，待会初始化程序时需要用到。

### 3. 获取测试SOL

```bash
# 切换到Devnet
solana config set --url devnet

# 查看余额
solana balance

# 获取测试SOL（可以多次执行）
solana airdrop 2
```

如果airdrop失败，访问：https://faucet.solana.com/

---

## 🏗️ 第三步：编译和部署智能合约

### 1. 编译Anchor程序

```bash
cd packages/solana-program

# 构建程序
anchor build
```

第一次编译会下载依赖，需要等待几分钟。

### 2. 获取Program ID

```bash
# 构建后会生成Program ID
solana address -k target/deploy/achievements-keypair.json
```

复制这个Program ID。

### 3. 更新Program ID

编辑以下文件，将 `YOUR_PROGRAM_ID` 替换为刚才的ID：

- `packages/solana-program/Anchor.toml`
- `packages/solana-program/programs/achievements/src/lib.rs` (第8行的 `declare_id!`)
- `packages/shared/src/solana-client.js`

### 4. 重新编译

```bash
# 更新Program ID后需要重新编译
anchor build
```

### 5. 部署到Devnet

```bash
# 确保在Devnet
solana config set --url devnet

# 部署
anchor deploy

# 验证部署
solana program show YOUR_PROGRAM_ID
```

---

## 🎬 第四步：初始化程序

部署后需要初始化程序状态：

```bash
cd packages/solana-program

# 运行初始化测试
anchor test --skip-deploy
```

或者手动初始化：

```bash
# 使用Anchor CLI
anchor run initialize
```

初始化时需要传入backend signer的公钥：

```bash
# 查看backend signer公钥
solana-keygen pubkey ~/.config/solana/backend-signer.json
```

---

## 🌐 第五步：配置前端

### 1. 配置环境变量

编辑 `apps/web/.env.local`：

```env
# Solana配置
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID

# Backend Signer私钥（Base58格式）
BACKEND_SIGNER_KEY=从~/.config/solana/backend-signer.json读取的私钥数组
```

**获取Backend Signer私钥：**

```bash
cat ~/.config/solana/backend-signer.json
# 输出是一个数字数组，需要转换为Base58

# 或者用这个命令直接获取Base58格式：
solana-keygen pubkey ~/.config/solana/backend-signer.json --outfile /dev/null
```

### 2. 更新前端页面

将 `apps/web/app/solana-example.jsx` 重命名或复制为主页面：

```bash
cd apps/web
cp app/solana-example.jsx app/page.jsx
```

### 3. 启动前端

```bash
pnpm dev:web
```

访问 http://localhost:3000

---

## 🦊 第六步：安装Phantom钱包

1. 访问 https://phantom.app/
2. 下载浏览器扩展
3. 创建钱包
4. 切换到Devnet：设置 → Developer Settings → Testnet Mode → Devnet
5. 获取测试SOL：点击钱包里的"Airdrop"按钮

---

## 🧪 第七步：测试完整流程

### 1. 连接Phantom钱包

打开 http://localhost:3000，点击"连接Phantom钱包"

### 2. 获取测试SOL

点击"领取测试SOL"按钮（Devnet airdrop）

### 3. Claim成就

选择一个成就，点击"领取成就"：

1. 浏览器会请求位置权限（允许）
2. 后端验证资格并返回签名
3. Phantom钱包弹出交易确认
4. 确认后等待几秒
5. 成功！🎉

### 4. 查看NFT

在Phantom钱包的"Collectibles"标签页可以看到你的成就NFT。

---

## 📝 常用命令

### Solana CLI

```bash
# 查看当前配置
solana config get

# 查看余额
solana balance

# 查看账户信息
solana account YOUR_PUBKEY

# 查看程序信息
solana program show YOUR_PROGRAM_ID

# 切换网络
solana config set --url devnet      # Devnet
solana config set --url mainnet-beta  # Mainnet
solana config set --url localhost    # 本地测试网
```

### Anchor

```bash
# 编译程序
anchor build

# 部署程序
anchor deploy

# 运行测试
anchor test

# 生成IDL
anchor idl init --filepath target/idl/achievements.json YOUR_PROGRAM_ID
```

### 本地测试网（可选）

如果想在本地测试：

```bash
# Terminal 1: 启动本地验证节点
solana-test-validator

# Terminal 2: 切换到localhost
solana config set --url localhost

# Terminal 3: 部署
anchor deploy

# Terminal 4: 前端
pnpm dev:web
```

---

## 🐛 常见问题

### 1. "insufficient funds"

**原因**：钱包SOL不足

**解决**：
```bash
solana airdrop 2
# 或访问 https://faucet.solana.com/
```

### 2. "Program ID mismatch"

**原因**：Anchor.toml、lib.rs、前端的Program ID不一致

**解决**：确保所有地方的Program ID相同，然后重新编译部署

### 3. "Account not found"

**原因**：程序未初始化

**解决**：运行初始化脚本

### 4. "Invalid signature"

**原因**：Backend signer密钥不匹配

**解决**：
1. 检查 `.env.local` 的 `BACKEND_SIGNER_KEY`
2. 检查程序初始化时传入的backend signer公钥
3. 确保两者对应同一个密钥对

### 5. Phantom钱包连接不上

**原因**：网络配置错误

**解决**：
1. 确保Phantom切换到Devnet
2. 检查前端的 `NEXT_PUBLIC_NETWORK` 配置
3. 刷新页面

---

## 📊 Solana vs 以太坊对比

| 特性 | Solana | 以太坊 |
|------|--------|--------|
| **Transaction Fee** | ~$0.0001 | $1-50 |
| **确认时间** | 400ms | 15秒-5分钟 |
| **编程语言** | Rust | Solidity |
| **框架** | Anchor | Hardhat |
| **钱包** | Phantom | MetaMask |
| **NFT标准** | Metaplex | ERC721 |
| **账户模型** | Account-based | Account-based |
| **学习难度** | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 后续优化建议

### 1. 实现真实验证

- 集成GPS位置验证（防止位置伪造）
- 接入天气API（OpenWeatherMap）
- 实现二维码扫描验证

### 2. NFT Metadata优化

- 使用Arweave永久存储（Solana生态推荐）
- 或使用Shadow Drive（Solana原生存储）
- 实现动态metadata更新

### 3. 用户体验优化

- 实现gasless transactions（用Session Keys）
- 添加成就展示页面
- 实现成就排行榜

### 4. 安全加固

- 实现rate limiting
- 添加bot检测
- 使用数据库存储nonce（替代内存）

---

## 📚 学习资源

### Solana官方文档
- https://docs.solana.com/
- https://solana.com/developers

### Anchor教程
- https://www.anchor-lang.com/
- https://book.anchor-lang.com/

### Metaplex NFT
- https://docs.metaplex.com/

### Hackathon资源
- Solana Cookbook: https://solanacookbook.com/
- Solana Stack Exchange: https://solana.stackexchange.com/

---

## 🏆 准备Hackathon Demo

### Demo Checklist：

- [ ] 程序部署到Devnet
- [ ] 前端可以连接Phantom
- [ ] 至少2个成就可以claim
- [ ] NFT显示在Phantom钱包
- [ ] 准备好演示账户（有SOL）
- [ ] 录制Demo视频（备用）
- [ ] 准备Pitch deck

### Demo话术：

1. **问题**："校园成就系统需要学生有加密货币？太贵了！"
2. **解决方案**："我们用Solana，transaction fee只要$0.0001，几乎免费！"
3. **演示**：现场claim一个成就，展示整个流程
4. **未来**："可以扩展到学分认证、毕业证明等更多场景"

---

Good luck with your hackathon! 🦡🚀
