/**
 * BadgerBadge - Solana Version (Real NFT Minting)
 * UW-Madison Campus Achievement System
 */

'use client';

import { useState, useMemo } from 'react';
import { Connection, PublicKey, SystemProgram, TransactionInstruction, Transaction, Keypair } from '@solana/web3.js';
import { ACHIEVEMENTS } from '../lib/shared';
import { uploadNFTAssets } from '../lib/uploadImage';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

// Solana Configuration
const PROGRAM_ID = new PublicKey('GcqYVPhMUUdqpBxVNcLK8otKGzWbxqWiMft2mcDvr7dZ');
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const RPC_URL = 'https://api.devnet.solana.com';

export default function SolanaAchievementsPage() {
  const [wallet, setWallet] = useState(null);
  const [claiming, setClaiming] = useState({});
  const [claimedStatus, setClaimedStatus] = useState({}); // Track which achievements are claimed
  const connection = useMemo(() => new Connection(RPC_URL, 'confirmed'), []);

  // Check user claimed achievements
  const checkClaimedAchievements = async (userPublicKey) => {
    const status = {};
    for (const achievement of ACHIEVEMENTS) {
      try {
        const pda = await getUserAchievementPDA(userPublicKey, achievement.id);
        const accountInfo = await connection.getAccountInfo(pda);
        status[achievement.id] = accountInfo !== null; // Account exists = claimed
      } catch (error) {
        status[achievement.id] = false;
      }
    }
    setClaimedStatus(status);
    console.log('📋 Claimed status:', status);
  };

  // Connect Phantom Wallet
  const connectWallet = async () => {
    try {
      const { solana } = window;

      if (!solana?.isPhantom) {
        alert('Please install Phantom Wallet!\nVisit:https://phantom.app/');
        return;
      }

      const response = await solana.connect();
      console.log('✅ Wallet connected:', response.publicKey.toString());

      const walletData = {
        publicKey: response.publicKey,
        address: response.publicKey.toString(),
      };

      setWallet(walletData);

      // Check claimed achievements
      await checkClaimedAchievements(response.publicKey);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet：' + error.message);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    if (window.solana) {
      window.solana.disconnect();
    }
    setWallet(null);
  };

  // Calculate Achievement State PDA
  const getAchievementStatePDA = async () => {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('achievement_state')],
      PROGRAM_ID
    );
    return pda;
  };

  // Calculate User Achievement PDA
  const getUserAchievementPDA = async (userPubkey, achievementId) => {
    const [pda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('user_achievement'),
        userPubkey.toBuffer(),
        Buffer.from(achievementId),
      ],
      PROGRAM_ID
    );
    return pda;
  };

  // Calculate Metadata PDA (Metaplex Standard)
  const getMetadataPDA = async (mint) => {
    const [pda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );
    return pda;
  };

  // Serialize string (Anchor format)
  const serializeString = (str) => {
    const stringBytes = Buffer.from(str, 'utf-8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(stringBytes.length, 0);
    return Buffer.concat([lengthBuffer, stringBytes]);
  };

  // Mint NFT Achievement
  const handleClaim = async (achievementId) => {
    if (!wallet) {
      alert('Please connect Phantom wallet first!');
      return;
    }

    setClaiming(prev => ({ ...prev, [achievementId]: true }));

    try {
      console.log('🎯 Start minting NFT:', achievementId);
      console.log('💼 Wallet address:', wallet.address);

      // Get achievement info
      const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (!achievement) {
        throw new Error('Achievement not found');
      }

      // Read current total_minted, predict next number
      const achievementStatePDA = await getAchievementStatePDA();
      let mintNumber = 1; // Default value
      try {
        const accountInfo = await connection.getAccountInfo(achievementStatePDA);
        if (accountInfo) {
          // AchievementState structure: discriminator(8) + authority(32) + total_minted(8)
          const totalMinted = Number(accountInfo.data.readBigUInt64LE(40));
          mintNumber = totalMinted + 1;
          console.log('📊 Currently minted:', totalMinted, '→ Next number:', mintNumber);
        }
      } catch (error) {
        console.warn('⚠️ Cannot read total_minted, using default number #1');
      }

      // 1. Upload image and metadata JSON to Supabase
      console.log('📤 Uploading assets to Supabase...');
      const { imageUrl, metadataUrl } = await uploadNFTAssets(achievementId, achievement, mintNumber);
      console.log('✅ Image URL:', imageUrl);
      console.log('✅ Metadata URL:', metadataUrl);
      console.log('🖼️ Metadata URI length:', metadataUrl.length);
      console.log('🎨 NFT Number:', mintNumber);

      // Use Supabase metadata URL
      const metadataUri = metadataUrl;

      // Generate new mint keypair
      const mintKeypair = Keypair.generate();
      console.log('🪙 Mint address:', mintKeypair.publicKey.toString());

      // Calculate other PDAs
      const userAchievementPDA = await getUserAchievementPDA(wallet.publicKey, achievementId);
      const metadataPDA = await getMetadataPDA(mintKeypair.publicKey);
      const tokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        wallet.publicKey
      );

      console.log('📍 Achievement State PDA:', achievementStatePDA.toString());
      console.log('📍 User Achievement PDA:', userAchievementPDA.toString());
      console.log('📍 Metadata PDA:', metadataPDA.toString());
      console.log('📍 Token Account:', tokenAccount.toString());

      // Build instruction data
      // mint_achievement discriminator + parameters
      const discriminator = Buffer.from([0xdf, 0x73, 0xf9, 0xc1, 0x65, 0x41, 0xeb, 0x88]);
      const achievementIdData = serializeString(achievementId);
      const nameData = serializeString(achievement.name);
      const symbolData = serializeString('BADGE');
      const uriData = serializeString(metadataUri);

      const instructionData = Buffer.concat([
        discriminator,
        achievementIdData,
        nameData,
        symbolData,
        uriData,
      ]);

      console.log('📦 Instruction data length:', instructionData.length);

      // Create instruction
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: achievementStatePDA, isSigner: false, isWritable: true },
          { pubkey: userAchievementPDA, isSigner: false, isWritable: true },
          { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: tokenAccount, isSigner: false, isWritable: true },
          { pubkey: metadataPDA, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: instructionData,
      });

      // Create transaction
      const transaction = new Transaction().add(instruction);
      transaction.feePayer = wallet.publicKey;

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Partial sign mint keypair
      transaction.partialSign(mintKeypair);

      console.log('📤 Send transaction to Phantom for signing...');

      // Sign and send with Phantom
      const signedTx = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      console.log('⏳ Waiting for transaction confirmation...');
      await connection.confirmTransaction(signature);

      console.log('✅ NFT Minted successfully！');
      console.log('🔗 Transaction signature:', signature);
      console.log('🪙 NFT Mint:', mintKeypair.publicKey.toString());

      // Update claimed status
      setClaimedStatus(prev => ({ ...prev, [achievementId]: true }));

      alert(`🎉 Achievement NFT "${achievement.name}" claimed successfully!\n\n${achievement.icon}\n\nTransaction signature:\n${signature}\n\nNFT Mint:\n${mintKeypair.publicKey.toString()}\n\nView on Solana Explorer:\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet\n\nCheck your NFT in Phantom wallet "Collectibles" tab!`);

    } catch (error) {
      console.error('❌ Mint failed:', error);

      let errorMessage = error.message;

      // Parse error
      if (error.message.includes('0x0')) {
        errorMessage = 'Achievement already claimed!';
      } else if (error.message.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance! Please get test SOL first.';
      } else if (error.message.includes('User rejected')) {
        errorMessage = 'Transaction cancelled';
      } else if (error.message.includes('already in use')) {
        errorMessage = 'Achievement already claimed!';
      } else if (error.logs) {
        console.log('Transaction logs:', error.logs);
        const errorLog = error.logs.find(log => log.includes('Error'));
        if (errorLog) errorMessage = errorLog;
      }

      alert(`❌ Mint failed: ${errorMessage}\n\nSee console for details`);
    } finally {
      setClaiming(prev => ({ ...prev, [achievementId]: false }));
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #c5050c, #9b0000)',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '1rem',
          }}>
            🦡 BadgerBadge Achievements
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#fee',
            marginBottom: '1rem',
          }}>
            UW-Madison Campus Achievement System (Solana Version - Real NFT)
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            fontSize: '0.875rem',
            color: '#fcc',
            flexWrap: 'wrap',
          }}>
            <span>🌐 Network: Devnet</span>
            <span>⚡ Fee: ~$0.0001</span>
            <span>🔗 On-Chain NFT</span>
          </div>
        </header>

        {/* Wallet Section */}
        <div style={{
          background: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          {!wallet ? (
            <button
              onClick={connectWallet}
              style={{
                width: '100%',
                background: '#9333ea',
                color: 'white',
                fontWeight: 'bold',
                padding: '1rem 1.5rem',
                borderRadius: '0.5rem',
                fontSize: '1.125rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onMouseOver={(e) => e.target.style.background = '#7e22ce'}
              onMouseOut={(e) => e.target.style.background = '#9333ea'}
            >
              <span>👻</span>
              <span>Connect Phantom Wallet</span>
            </button>
          ) : (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                    ✅ Connected to Phantom (Devnet)
                  </p>
                  <p style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    background: '#f3f4f6',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.25rem',
                  }}>
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  style={{
                    background: '#e5e7eb',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => e.target.style.background = '#d1d5db'}
                  onMouseOut={(e) => e.target.style.background = '#e5e7eb'}
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Achievements Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem',
        }}>
          {ACHIEVEMENTS.map((achievement) => {
            const isClaiming = claiming[achievement.id] || false;
            const isClaimed = claimedStatus[achievement.id] || false;

            return (
              <div
                key={achievement.id}
                style={{
                  background: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
                  padding: '1.5rem',
                  transition: 'box-shadow 0.3s',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 20px 25px rgba(0,0,0,0.15)'}
                onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)'}
              >
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>
                    {achievement.icon}
                  </div>
                  <h3 style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    marginBottom: '0.5rem',
                  }}>
                    {achievement.name}
                  </h3>
                  <p style={{ color: '#6b7280', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    {achievement.description}
                  </p>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    background: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                  }}>
                    {achievement.category}
                  </span>
                </div>

                <button
                  onClick={() => handleClaim(achievement.id)}
                  disabled={isClaiming || !wallet || isClaimed}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    fontWeight: 'bold',
                    color: 'white',
                    border: 'none',
                    cursor: isClaiming || !wallet || isClaimed ? 'not-allowed' : 'pointer',
                    background: isClaimed ? '#10b981' : (isClaiming || !wallet ? '#9ca3af' : '#dc2626'),
                    transition: 'background 0.3s',
                  }}
                  onMouseOver={(e) => {
                    if (!isClaiming && wallet && !isClaimed) e.target.style.background = '#b91c1c';
                  }}
                  onMouseOut={(e) => {
                    if (!isClaiming && wallet && !isClaimed) e.target.style.background = '#dc2626';
                  }}
                >
                  {isClaimed ? '✅ Claimed' : (isClaiming ? '⏳ Minting...' : (wallet ? '🎨 Mint NFT' : '🔒 Connect wallet first'))}
                </button>
              </div>
            );
          })}
        </div>

        {/* Info Footer */}
        <footer style={{
          textAlign: 'center',
          color: 'white',
          fontSize: '0.875rem',
        }}>
          <p style={{ marginBottom: '0.5rem' }}>
            💡 <strong>This is a real Solana NFT！</strong> After minting, view in Phantom wallet "Collectibles" tab
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.75, marginBottom: '0.5rem' }}>
            Program ID: {PROGRAM_ID.toString()}
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.75 }}>
            View transaction: <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer" style={{ color: '#fcc', textDecoration: 'underline' }}>Solana Explorer (Devnet)</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
