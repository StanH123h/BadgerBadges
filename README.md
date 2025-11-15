# BadgerBadge - UW-Madison Campus Achievements

A system that allows UW-Madison students to claim on-chain NFT achievement badges by completing campus activities and milestones.

## Project Structure

```
badgerbadge/
├── apps/
│   └── web/                    # Next.js frontend application
│       ├── app/
│       │   ├── api/claim/     # Backend API (validation and signing)
│       │   ├── layout.jsx     # App layout
│       │   └── page.jsx       # Home page
│       └── package.json
│
├── packages/
│   ├── contracts/             # Hardhat smart contract project
│   │   ├── contracts/
│   │   │   └── Achievements.sol  # Main contract
│   │   ├── scripts/
│   │   │   └── deploy.js      # Deployment script
│   │   ├── test/              # Contract tests
│   │   └── hardhat.config.js
│   │
│   └── shared/                # Shared code (achievement definitions, ABI, etc.)
│       └── src/
│           ├── achievements.js
│           ├── contracts.js
│           └── abi/
│
├── package.json               # Root package.json (workspace)
└── pnpm-workspace.yaml
```

## Quick Start

### 1. Install Dependencies

```bash
# Install pnpm (if not already installed)
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 2. Configure Environment Variables

```bash
# Create .env in packages/contracts/
cd packages/contracts
cp .env.example .env

# Edit .env and add:
# - DEPLOYER_KEY: Deployer account private key
# - BACKEND_SIGNER_KEY: Backend signer private key (important!)
# - SEPOLIA_RPC: Sepolia RPC URL (optional)

# Create .env.local in apps/web/
cd ../../apps/web
cp .env.local.example .env.local

# Edit .env.local and add the same BACKEND_SIGNER_KEY
```

### 3. Compile Contracts

```bash
pnpm build:contracts
```

### 4. Update ABI

After compilation, copy the ABI to the shared package:

```bash
pnpm --filter @badger/shared update-abi
```

### 5. Start Local Development Environment

**Terminal 1 - Start Hardhat local node:**

```bash
pnpm dev:contracts
```

This will start a local EVM node at http://127.0.0.1:8545

**Terminal 2 - Deploy contracts:**

```bash
pnpm deploy:local
```

Note the contract address from the output, then:

1. Update `localhost.achievementsAddress` in `packages/shared/src/contracts.js`
2. Update `NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS` in `apps/web/.env.local`

**Terminal 3 - Start Next.js development server:**

```bash
pnpm dev:web
```

Visit http://localhost:3000

### 6. Connect MetaMask

1. Add local network in MetaMask:
   - Network Name: Localhost 8545
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

2. Import Hardhat test account (get private key from Terminal 1 output)

3. Refresh the page and connect wallet

## Running Tests

```bash
# Run contract tests
pnpm test:contracts
```

## Deploy to Sepolia Testnet

1. Ensure `SEPOLIA_RPC` and `DEPLOYER_KEY` are configured in `.env`
2. Ensure the deployer account has Sepolia ETH (get from [faucet](https://sepoliafaucet.com/))
3. Run deployment:

```bash
pnpm deploy:sepolia
```

4. Update configuration:
   - `sepolia.achievementsAddress` in `packages/shared/src/contracts.js`
   - Set `NEXT_PUBLIC_NETWORK=sepolia` in `apps/web/.env.local`

## Available Achievements

The current system includes the following achievements:

1. **Madison Rainy Day** 🌧️ - Visit campus on a rainy day in Madison
2. **First Snow** ❄️ - Witness the first snowfall of 2025
3. **Morgridge Hackathon** 💻 - Participate in a hackathon at Morgridge Hall
4. **Late Night Hacker** 🌙 - Code at Morgridge Hall between 2-5 AM

## Architecture Overview

### Smart Contract (Achievements.sol)

- ERC721-based NFT contract
- Each user can only mint each achievement once
- Uses off-chain signature verification (ECDSA)
- Replay attack protection (nonce + deadline + chainId)

### Backend Validation (apps/web/app/api/claim/route.js)

The backend API is responsible for:
1. Validating user eligibility (weather, location, time, event codes, etc.)
2. Generating unique nonces
3. Signing authorization messages
4. Returning signatures to the frontend

### Frontend (apps/web/app/page.jsx)

- Connect Web3 wallet (MetaMask)
- Display available achievements
- Request backend validation
- Call contract to mint NFT

## 🔴 Security Warnings

This is a demo project containing several security issues that **must be fixed before production**:

### 1. Gas Fees
- ❌ Students need ETH to pay for gas
- ✅ **Fix**: Implement EIP-2771 meta-transactions or backend gas relay

### 2. Location Spoofing
- ❌ Browser-sent lat/lng is completely untrustworthy
- ✅ **Fix**: Use QR code scanning, WiFi BSSID verification, or Bluetooth beacons

### 3. Weather Validation
- ❌ Currently only mock validation
- ✅ **Fix**: Integrate real weather API (OpenWeatherMap, Weather.gov)

### 4. Nonce Storage
- ❌ Currently using in-memory storage, lost on server restart
- ✅ **Fix**: Use database (Redis, PostgreSQL)

### 5. Rate Limiting
- ❌ No rate limiting
- ✅ **Fix**: Implement rate limiting per IP/wallet address

### 6. Metadata Storage
- ❌ tokenURI not implemented
- ✅ **Fix**: Use IPFS or centralized API for metadata storage

Detailed security notes can be found in comments within the contract and API code.

## Tech Stack

- **Smart Contracts**: Solidity ^0.8.24, Hardhat, OpenZeppelin
- **Frontend**: Next.js 15 (App Router), React 19, Ethers.js v6
- **Backend**: Next.js API Routes
- **Language**: Pure JavaScript (no TypeScript)
- **Package Management**: pnpm workspaces

## Common Issues

### Frontend Error "Contract address not configured"

Ensure:
1. Contract has been deployed
2. `NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS` in `apps/web/.env.local` has been updated
3. Next.js development server has been restarted

### Backend Error "Backend signer not configured"

Ensure `BACKEND_SIGNER_KEY` exists in `apps/web/.env.local` and the address matches the signer address in the contract.

### Transaction Failed "Invalid signature"

Check:
1. Whether the address corresponding to the private key used by the backend matches the signer in the contract
2. Whether the network is correct (localhost/sepolia)
3. Whether the contract address is correct

### How to View My Minted NFTs?

1. View transactions on a block explorer
2. Or call the contract's `balanceOf(yourAddress)` to check the count
3. Or call `hasAchievement(yourAddress, achievementId)` to check specific achievements

## Development Roadmap

- [ ] Implement real weather API integration
- [ ] Add QR code verification system
- [ ] Implement gasless transactions (meta-transactions)
- [ ] Add IPFS metadata storage
- [ ] Integrate university student information system (academic achievements)
- [ ] Add achievement showcase page
- [ ] Implement achievement leaderboard
- [ ] Mobile optimization

## Contributing

Contributions are welcome! Please submit an Issue or Pull Request.

## License

MIT License
