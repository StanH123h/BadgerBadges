# 🚀 Solana版本快速启动

## 一键安装所有依赖

```bash
# 1. 安装Solana工具
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 2. 安装Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# 3. 安装Node.js依赖
pnpm install
```

## 生成密钥

```bash
# 生成部署钱包
solana-keygen new --outfile ~/.config/solana/id.json

# 生成backend signer
solana-keygen new --outfile ~/.config/solana/backend-signer.json

# 查看backend signer公钥（记下来，待会用）
solana-keygen pubkey ~/.config/solana/backend-signer.json
```

## 获取测试SOL

```bash
solana config set --url devnet
solana airdrop 2
solana balance  # 确认余额
```

## 编译和部署

```bash
# 构建Solana程序
pnpm solana:build

# 获取Program ID
solana address -k packages/solana-program/target/deploy/achievements-keypair.json

# 复制这个ID，更新以下文件：
# - packages/solana-program/Anchor.toml
# - packages/solana-program/programs/achievements/src/lib.rs (第8行)
# - packages/shared/src/solana-client.js

# 重新构建
pnpm solana:build

# 部署到Devnet
pnpm solana:deploy
```

## 初始化程序

创建文件 `packages/solana-program/migrations/initialize.js`:

```javascript
const anchor = require('@coral-xyz/anchor');
const { PublicKey } = require('@solana/web3.js');

module.exports = async function (provider) {
  anchor.setProvider(provider);

  const program = anchor.workspace.Achievements;

  // Backend signer公钥（替换为你的）
  const backendSigner = new PublicKey('YOUR_BACKEND_SIGNER_PUBKEY');

  const [achievementStatePda] = await PublicKey.findProgramAddress(
    [Buffer.from('achievement_state')],
    program.programId
  );

  try {
    await program.methods
      .initialize(backendSigner)
      .accounts({
        achievementState: achievementStatePda,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Program initialized!');
    console.log('Achievement State PDA:', achievementStatePda.toString());
  } catch (error) {
    console.error('Initialization failed:', error);
  }
};
```

运行：

```bash
cd packages/solana-program
anchor run initialize
```

## 配置前端

编辑 `apps/web/.env.local`:

```env
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID

# Backend signer私钥（Base58格式）
# 需要转换 ~/.config/solana/backend-signer.json 为Base58
BACKEND_SIGNER_KEY=YOUR_BASE58_PRIVATE_KEY
```

**获取Base58私钥：**

```bash
# 安装bs58-cli
npm install -g bs58-cli

# 转换
cat ~/.config/solana/backend-signer.json | jq -r '.[0:32] | @json' | bs58-cli encode
```

或用这个Node.js脚本：

```javascript
// convert-key.js
const bs58 = require('bs58');
const fs = require('fs');

const keypairFile = process.env.HOME + '/.config/solana/backend-signer.json';
const keypair = JSON.parse(fs.readFileSync(keypairFile));
const secretKey = Uint8Array.from(keypair);

console.log('Base58 Private Key:');
console.log(bs58.encode(secretKey));
```

运行：

```bash
node convert-key.js
```

## 启动前端

```bash
pnpm dev:web
```

访问 http://localhost:3000

## 安装Phantom钱包

1. 访问 https://phantom.app/
2. 安装浏览器扩展
3. 创建钱包
4. **重要**：切换到Devnet
   - 设置 → Developer Settings → Testnet Mode → Devnet
5. 获取测试SOL（钱包里点"Airdrop"）

## 测试

1. 打开 http://localhost:3000
2. 点击"连接Phantom钱包"
3. 选择一个成就，点击"领取"
4. 允许位置权限
5. 确认Phantom交易
6. 等待几秒
7. 在Phantom的"Collectibles"标签查看NFT ✅

---

## 🎬 Hackathon Demo准备

### Before Demo:
- [ ] 确保有2+ SOL在部署钱包
- [ ] 确保backend signer配置正确
- [ ] 测试完整流程至少3次
- [ ] 准备好演示用的Phantom钱包（有0.1 SOL）
- [ ] 录制备份demo视频

### Demo话术（30秒版）：

> "传统NFT系统的问题是gas费太高，学生无法承担。我们用Solana重写了整个系统，现在mint一个NFT只需要0.0001美元，几乎免费！
>
> 【演示连接Phantom】→ 【领取成就】→ 【展示NFT】
>
> 整个过程不到5秒，交易费用不到1美分。未来可以扩展到学分认证、毕业证明等更多校园场景。"

### 常见评委问题准备：

**Q: 为什么选择Solana而不是以太坊？**
A: Transaction fee！Solana是$0.0001 vs 以太坊$1-50。对于校园成就这种高频小额场景，Solana更合适。

**Q: 如何防止位置伪造？**
A: 目前使用GPS + 后端验证。生产环境可以用WiFi BSSID验证或二维码扫描。

**Q: NFT图片存哪里？**
A: 现在动态生成SVG。下一步会用Arweave（Solana生态的永久存储）。

**Q: Solana不是经常宕机吗？**
A: 2023年后稳定性大幅提升。而且我们可以部署到多个RPC节点做failover。

---

## 🐛 快速排错

### "insufficient funds for rent"
```bash
solana airdrop 2
```

### "Program ID mismatch"
重新检查并统一所有文件的Program ID，然后：
```bash
pnpm solana:build
pnpm solana:deploy
```

### "Account not found"
程序未初始化：
```bash
cd packages/solana-program
anchor run initialize
```

### 前端无法连接Phantom
1. 确认Phantom已切换到Devnet
2. 检查 `.env.local` 的 `NEXT_PUBLIC_NETWORK=devnet`
3. 硬刷新页面（Cmd+Shift+R）

---

## 📞 获取帮助

- Solana Discord: https://discord.gg/solana
- Anchor Discord: https://discord.gg/anchorlang
- Stack Exchange: https://solana.stackexchange.com/

Good luck! 🦡🚀
