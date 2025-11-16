/**
 * Contract addresses and configurations
 *
 * TODO: Update these after deploying contracts
 */

export const CONTRACTS = {
  // Localhost (Hardhat node)
  localhost: {
    chainId: 31337,
    achievementsAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    rpcUrl: 'http://127.0.0.1:8545',
  },

  // Sepolia testnet
  sepolia: {
    chainId: 11155111,
    achievementsAddress: '', // Fill after deploying to Sepolia
    rpcUrl: process.env.SEPOLIA_RPC || 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
  },

  // Mainnet (for future)
  mainnet: {
    chainId: 1,
    achievementsAddress: '',
    rpcUrl: process.env.MAINNET_RPC || 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
  },
};

/**
 * Get contract config for a specific network
 */
export function getContractConfig(networkName = 'localhost') {
  return CONTRACTS[networkName];
}

/**
 * Get contract address for current network
 */
export function getAchievementsAddress(networkName = 'localhost') {
  const config = getContractConfig(networkName);
  if (!config || !config.achievementsAddress) {
    throw new Error(`Achievements contract not deployed on ${networkName}`);
  }
  return config.achievementsAddress;
}

// ABI is imported from the generated artifacts
import AchievementsABIData from './abi/Achievements.json' with { type: 'json' };
export const AchievementsABI = AchievementsABIData;
