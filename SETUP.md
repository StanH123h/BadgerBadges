# Complete Setup Guide

## First Time Setup (Detailed Steps)

### Step 1: Install pnpm and Dependencies

```bash
# Install pnpm
npm install -g pnpm

# In project root directory
cd /path/to/badgerbadge
pnpm install
```

### Step 2: Generate Key Pairs

You need two private keys:

1. **DEPLOYER_KEY**: For deploying contracts
2. **BACKEND_SIGNER_KEY**: For backend signing (**This is very important!**)

**Generate new keys (recommended for development):**

```bash
cd packages/contracts
node -e "const ethers = require('ethers'); const wallet = ethers.Wallet.createRandom(); console.log('Address:', wallet.address); console.log('Private Key:', wallet.privateKey);"
```

Run this twice to get two key pairs.

**Or use Hardhat test accounts (local development only):**

After starting `pnpm dev:contracts`, you'll see private keys for 10 test accounts.

### Step 3: Configure Environment Variables

**packages/contracts/.env**

```bash
cd packages/contracts
cp .env.example .env
```

Edit `.env`:

```env
# Deployer account private key (account with ETH)
DEPLOYER_KEY=0x...

# Backend signer private key (can be same as DEPLOYER_KEY or different)
BACKEND_SIGNER_KEY=0x...

# Sepolia RPC (optional, only needed when deploying to testnet)
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**apps/web/.env.local**

```bash
cd apps/web
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Must match BACKEND_SIGNER_KEY in packages/contracts/.env!
BACKEND_SIGNER_KEY=0x...

# Network (localhost or sepolia)
NEXT_PUBLIC_NETWORK=localhost

# Contract address (fill in after deployment)
NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS=

# Sepolia RPC (optional)
NEXT_PUBLIC_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

### Step 4: Compile Contracts

```bash
# In project root directory
pnpm build:contracts
```

You should see:

```
Compiled 1 Solidity file successfully
```

### Step 5: Copy ABI

```bash
pnpm --filter @badger/shared update-abi
```

You should see:

```
✅ ABI updated successfully!
```

### Step 6: Start Local Node

**Open a new terminal (Terminal 1):**

```bash
cd /path/to/badgerbadge
pnpm dev:contracts
```

You'll see:

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

**Keep this terminal running!**

### Step 7: Deploy Contracts

**Open a new terminal (Terminal 2):**

```bash
cd /path/to/badgerbadge
pnpm deploy:local
```

You'll see:

```
🦡 Deploying BadgerBadge Achievements contract...

Deploying with account: 0x...
Backend signer address: 0x...

✅ Achievements contract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Important: Copy the contract address!**

### Step 8: Update Contract Address

1. Edit `packages/shared/src/contracts.js`:

```javascript
localhost: {
  chainId: 31337,
  achievementsAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // 👈 Paste here
  rpcUrl: 'http://127.0.0.1:8545',
},
```

2. Edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Step 9: Start Frontend

**Open a new terminal (Terminal 3):**

```bash
cd /path/to/badgerbadge
pnpm dev:web
```

Visit http://localhost:3000

### Step 10: Configure MetaMask

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add Network Manually"
3. Fill in:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH
4. Save

5. Import test account:
   - Click account icon → "Import Account"
   - Paste the private key shown in Terminal 1 (Account #0)
   - Import

### Step 11: Test Claiming Achievement

1. Refresh page http://localhost:3000
2. Click "Connect Wallet"
3. Authorize MetaMask connection
4. Click "Claim Achievement" button on any achievement
5. Allow browser to get your location (or use simulated location)
6. Wait for backend validation
7. Confirm MetaMask transaction
8. Wait for transaction confirmation

Success! 🎉

## Verify Everything Works

### Check Backend Configuration

Visit http://localhost:3000/api/claim

You should see:

```json
{
  "status": "ok",
  "signerConfigured": true,
  "signerAddress": "0x...",
  "contractAddress": "0x5FbDB...",
  "network": "localhost"
}
```

### Check Contract

Run in terminal:

```bash
cd packages/contracts
npx hardhat console --network localhost
```

Then:

```javascript
const Achievements = await ethers.getContractFactory('Achievements');
const achievements = await Achievements.attach('0x5FbDB...');  // Your contract address
await achievements.signer();  // Should return backend signer address
```

## Troubleshooting Common Issues

### Issue 1: "Cannot find module '@badger/shared'"

**Cause**: Workspace dependencies not properly installed

**Solution**:
```bash
rm -rf node_modules packages/*/node_modules apps/*/node_modules
pnpm install
```

### Issue 2: "Invalid signature"

**Cause**: Backend private key doesn't match signer in contract

**Check**:

1. Check "Backend signer address" in deployment logs
2. Verify in contract: `await achievements.signer()`
3. Check `BACKEND_SIGNER_KEY` in `apps/web/.env.local`
4. Ensure addresses corresponding to private keys match

**Solution**: Redeploy contract or update private key in `.env.local`

### Issue 3: MetaMask shows wrong nonce

**Cause**: MetaMask nonce cache not updated after local node restart

**Solution**:
1. MetaMask Settings → Advanced → Clear Activity & Nonce Data
2. Refresh page

### Issue 4: ABI-related errors

**Cause**: ABI not updated or corrupted

**Solution**:
```bash
pnpm build:contracts
pnpm --filter @badger/shared update-abi
# Restart Next.js server
```

### Issue 5: Transactions always fail

**Checklist**:

1. MetaMask connected to correct network (Chain ID 31337)
2. Account has sufficient ETH
3. Contract address is correct
4. Backend API returned valid signature (check browser console)
5. Signature not expired (5 minute validity)

## Deploy to Sepolia (Optional)

### 1. Get Sepolia ETH

Visit https://sepoliafaucet.com/ or https://faucet.quicknode.com/ethereum/sepolia

### 2. Update Environment Variables

`.env` and `.env.local`:

```env
SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_NETWORK=sepolia
```

### 3. Deploy

```bash
pnpm deploy:sepolia
```

### 4. Update Contract Address

Same as Step 8, but update `sepolia.achievementsAddress`

### 5. Verify Contract (Optional)

```bash
cd packages/contracts
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS "BACKEND_SIGNER_ADDRESS" "https://api.badgerbadge.uw.edu/metadata/"
```

## Next Steps

Your local development environment is now fully set up!

You can:

1. Add new achievement definitions (`packages/shared/src/achievements.js`)
2. Implement real validation logic (`apps/web/app/api/claim/route.js`)
3. Customize frontend UI (`apps/web/app/page.jsx`)
4. Extend smart contract functionality (`packages/contracts/contracts/Achievements.sol`)

Happy coding! 🦡
