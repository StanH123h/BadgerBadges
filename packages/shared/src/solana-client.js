/**
 * Solana客户端工具
 * 用于与Solana区块链和Achievements程序交互
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  Program,
  AnchorProvider,
  web3,
  BN,
} from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { ethers } from 'ethers';

// ========== CONFIGURATION ==========

export const SOLANA_CONFIG = {
  localnet: {
    rpcUrl: 'http://127.0.0.1:8899',
    programId: '6LonwXhpVy4feWGj1pc1ucKTkpmpbzYUsx46NExdMXdg',
  },
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    programId: '6LonwXhpVy4feWGj1pc1ucKTkpmpbzYUsx46NExdMXdg',
  },
  mainnet: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    programId: '6LonwXhpVy4feWGj1pc1ucKTkpmpbzYUsx46NExdMXdg',
  },
};

// Metaplex Metadata Program ID (固定)
export const METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

// ========== CLIENT SETUP ==========

/**
 * 创建Solana连接
 */
export function createConnection(network = 'devnet') {
  const config = SOLANA_CONFIG[network];
  return new Connection(config.rpcUrl, 'confirmed');
}

/**
 * 获取Program ID
 */
export function getProgramId(network = 'devnet') {
  return new PublicKey(SOLANA_CONFIG[network].programId);
}

/**
 * 获取Achievement State PDA
 */
export async function getAchievementStatePda(programId) {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from('achievement_state')],
    programId
  );
  return pda;
}

/**
 * 获取User Achievement PDA
 */
export async function getUserAchievementPda(
  userPubkey,
  achievementId,
  programId
) {
  const [pda] = await PublicKey.findProgramAddress(
    [
      Buffer.from('user_achievement'),
      userPubkey.toBuffer(),
      Buffer.from(achievementId, 'hex'),
    ],
    programId
  );
  return pda;
}

// ========== PROGRAM INTERACTIONS ==========

/**
 * 初始化Achievements程序
 */
export async function initializeProgram(
  connection,
  wallet,
  backendSigner,
  programId
) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  // 这里需要加载IDL (Interface Definition Language)
  // 实际使用时需要从anchor build生成的IDL
  const program = new Program(IDL, programId, provider);

  const achievementStatePda = await getAchievementStatePda(programId);

  const tx = await program.methods
    .initialize(new PublicKey(backendSigner))
    .accounts({
      achievementState: achievementStatePda,
      authority: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { transaction: tx, achievementState: achievementStatePda };
}

/**
 * Mint成就NFT
 */
export async function mintAchievement(
  connection,
  wallet,
  achievementId,
  nonce,
  deadline,
  signature,
  programId
) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  const program = new Program(IDL, programId, provider);

  // 生成新的mint账户
  const mintKeypair = web3.Keypair.generate();

  // 获取PDAs
  const achievementStatePda = await getAchievementStatePda(programId);
  const userAchievementPda = await getUserAchievementPda(
    wallet.publicKey,
    achievementId,
    programId
  );

  // 获取associated token账户
  const tokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    wallet.publicKey
  );

  // 将achievementId从字符串转为bytes32
  const achievementIdBytes = ethers.utils.arrayify(
    ethers.utils.id(achievementId)
  );
  const nonceBytes = ethers.utils.arrayify('0x' + nonce);
  const signatureBytes = ethers.utils.arrayify('0x' + signature);

  const tx = await program.methods
    .mintAchievement(
      Array.from(achievementIdBytes),
      Array.from(nonceBytes),
      new BN(deadline),
      Array.from(signatureBytes)
    )
    .accounts({
      achievementState: achievementStatePda,
      userAchievement: userAchievementPda,
      mint: mintKeypair.publicKey,
      tokenAccount,
      user: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([mintKeypair])
    .rpc();

  return {
    transaction: tx,
    mint: mintKeypair.publicKey.toString(),
    tokenAccount: tokenAccount.toString(),
  };
}

/**
 * 创建NFT metadata
 */
export async function createMetadata(
  connection,
  wallet,
  mint,
  achievementName,
  symbol,
  uri,
  programId
) {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
  });

  const program = new Program(IDL, programId, provider);

  const achievementStatePda = await getAchievementStatePda(programId);

  // 获取metadata PDA (Metaplex标准)
  const [metadataPda] = await PublicKey.findProgramAddress(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      new PublicKey(mint).toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  const tx = await program.methods
    .createAchievementMetadata(achievementName, symbol, uri)
    .accounts({
      achievementState: achievementStatePda,
      mint: new PublicKey(mint),
      metadata: metadataPda,
      authority: wallet.publicKey,
      payer: wallet.publicKey,
      metadataProgram: METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  return { transaction: tx, metadata: metadataPda.toString() };
}

/**
 * 检查用户是否已经claim某个成就
 */
export async function hasUserClaimed(
  connection,
  userPubkey,
  achievementId,
  programId
) {
  try {
    const userAchievementPda = await getUserAchievementPda(
      userPubkey,
      achievementId,
      programId
    );

    const accountInfo = await connection.getAccountInfo(userAchievementPda);

    if (!accountInfo) {
      return false;
    }

    // 解析账户数据检查is_claimed字段
    // (这里简化处理，实际应该用Program.account.userAchievement.fetch)
    return accountInfo.data.length > 0;
  } catch (error) {
    console.error('Error checking claim status:', error);
    return false;
  }
}

/**
 * 获取用户的所有成就NFT
 */
export async function getUserAchievements(
  connection,
  userPubkey,
  programId
) {
  const provider = new AnchorProvider(
    connection,
    { publicKey: userPubkey },
    { commitment: 'confirmed' }
  );

  const program = new Program(IDL, programId, provider);

  // 获取所有UserAchievement账户
  const achievements = await program.account.userAchievement.all([
    {
      memcmp: {
        offset: 8, // 跳过discriminator
        bytes: userPubkey.toBase58(),
      },
    },
  ]);

  return achievements.map((a) => ({
    achievementId: Buffer.from(a.account.achievementId).toString('hex'),
    isClaimed: a.account.isClaimed,
    mintTimestamp: a.account.mintTimestamp.toNumber(),
    mintNumber: a.account.mintNumber.toNumber(),
  }));
}

// ========== PLACEHOLDER IDL ==========
// 实际IDL需要从 anchor build 后的 target/idl/achievements.json 获取

const IDL = {
  version: '0.1.0',
  name: 'achievements',
  instructions: [
    {
      name: 'initialize',
      accounts: [
        { name: 'achievementState', isMut: true, isSigner: false },
        { name: 'authority', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'backendSigner', type: 'publicKey' }],
    },
    {
      name: 'mintAchievement',
      accounts: [
        { name: 'achievementState', isMut: true, isSigner: false },
        { name: 'userAchievement', isMut: true, isSigner: false },
        { name: 'mint', isMut: true, isSigner: true },
        { name: 'tokenAccount', isMut: true, isSigner: false },
        { name: 'user', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'associatedTokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'rent', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'achievementId', type: { array: ['u8', 32] } },
        { name: 'nonce', type: { array: ['u8', 32] } },
        { name: 'deadline', type: 'i64' },
        { name: 'signature', type: { array: ['u8', 64] } },
      ],
    },
  ],
  accounts: [
    {
      name: 'AchievementState',
      type: {
        kind: 'struct',
        fields: [
          { name: 'authority', type: 'publicKey' },
          { name: 'backendSigner', type: 'publicKey' },
          { name: 'totalMinted', type: 'u64' },
        ],
      },
    },
    {
      name: 'UserAchievement',
      type: {
        kind: 'struct',
        fields: [
          { name: 'user', type: 'publicKey' },
          { name: 'achievementId', type: { array: ['u8', 32] } },
          { name: 'isClaimed', type: 'bool' },
          { name: 'mintTimestamp', type: 'i64' },
          { name: 'mintNumber', type: 'u64' },
        ],
      },
    },
  ],
};
