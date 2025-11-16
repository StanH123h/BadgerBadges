/**
 * Contract addresses and configurations
 *
 * TODO: Update these after deploying contracts
 */

export const CONTRACTS = {
  // Localhost (Hardhat node)
  localhost: {
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
  },

  // Sepolia testnet
  sepolia: {
    chainId: 11155111,
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC || 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
  },

  // Mainnet (for future)
  mainnet: {
    chainId: 1,
    rpcUrl: process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
  },
};

/**
 * Get contract config for a specific network
 */
export function getContractConfig(networkName = 'localhost') {
  // Allow override from NEXT_PUBLIC_NETWORK env var
  const network = process.env.NEXT_PUBLIC_NETWORK || networkName;
  return CONTRACTS[network];
}

/**
 * Get contract address for current network
 * Always reads from NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS env var
 */
export function getAchievementsAddress() {
  const address = process.env.NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error('NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS not set in environment');
  }
  return address;
}

// ABI is imported from the generated artifacts
// TODO: After compiling contracts, copy ABI here or import from artifacts
// For now, export a placeholder
export { default as AchievementsABI } from './abi/Achievements.json' assert { type: 'json' };
