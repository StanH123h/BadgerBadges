/**
 * BadgerBadge - Solana Version (Real NFT Minting)
 * UW-Madison Campus Achievement System
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Connection, PublicKey, SystemProgram, TransactionInstruction, Transaction, Keypair } from '@solana/web3.js';
import { ACHIEVEMENTS } from '../lib/shared';
import { uploadNFTAssets } from '../lib/uploadImage';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import Tilt from 'react-parallax-tilt';
import NFTBadge from '../components/NFTBadge';
import CustomToast from '../components/CustomToast';
import EmojiConfetti from '../components/EmojiConfetti';

// Solana Configuration
const PROGRAM_ID = new PublicKey('GcqYVPhMUUdqpBxVNcLK8otKGzWbxqWiMft2mcDvr7dZ');
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const RPC_URL = 'https://api.devnet.solana.com';

export default function SolanaAchievementsPage() {
  const [wallet, setWallet] = useState(null);
  const [claiming, setClaiming] = useState({});
  const [claimedStatus, setClaimedStatus] = useState({}); // Track which achievements are claimed
  const [mintedNFTs, setMintedNFTs] = useState([]); // Store minted NFTs for display
  const [particles, setParticles] = useState([]); // Particle animation data
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '', details: '', confettiEmoji: '' });
  const [confetti, setConfetti] = useState({ show: false, emoji: '' });
  const connection = useMemo(() => new Connection(RPC_URL, 'confirmed'), []);
  const headerRef = useRef(null);

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
        setToast({
          show: true,
          type: 'error',
          title: '未安装 Phantom 钱包',
          message: '请先安装 Phantom 钱包扩展',
          details: 'https://phantom.app/'
        });
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
      setToast({
        show: true,
        type: 'error',
        title: '连接钱包失败',
        message: '无法连接到 Phantom 钱包',
        details: error.message
      });
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
      setToast({
        show: true,
        type: 'error',
        title: '请先连接钱包',
        message: '铸造 NFT 前需要先连接 Phantom 钱包',
        details: ''
      });
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

      // Add to minted NFTs for display
      setMintedNFTs(prev => [...prev, {
        achievement,
        mintNumber,
        imageUrl,
        signature,
        mint: mintKeypair.publicKey.toString(),
        timestamp: Date.now(),
      }]);

      // Show success toast (confetti will trigger when user closes it)
      setToast({
        show: true,
        type: 'success',
        title: `🎉 成就 "${achievement.name}" 铸造成功！`,
        message: `你已成功铸造 ${achievement.icon} NFT，快去 Phantom 钱包的"收藏品"标签查看吧！`,
        details: `交易签名: ${signature.slice(0, 20)}...${signature.slice(-20)}`,
        confettiEmoji: achievement.icon // Store emoji for confetti
      });

    } catch (error) {
      console.error('❌ Mint failed:', error);

      let errorMessage = error.message;
      let errorTitle = '铸造失败';

      // Parse error
      if (error.message.includes('0x0')) {
        errorTitle = '成就已被领取';
        errorMessage = '你已经领取过这个成就了，无法重复铸造';
      } else if (error.message.includes('insufficient')) {
        errorTitle = 'SOL 余额不足';
        errorMessage = '你的钱包余额不足以支付交易费用，请先获取一些测试 SOL';
      } else if (error.message.includes('User rejected')) {
        errorTitle = '交易已取消';
        errorMessage = '你取消了交易签名';
      } else if (error.message.includes('already in use')) {
        errorTitle = '成就已被领取';
        errorMessage = '你已经领取过这个成就了，无法重复铸造';
      } else if (error.logs) {
        console.log('Transaction logs:', error.logs);
        const errorLog = error.logs.find(log => log.includes('Error'));
        if (errorLog) errorMessage = errorLog;
      }

      setToast({
        show: true,
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        details: `详细错误信息请查看控制台`
      });
    } finally {
      setClaiming(prev => ({ ...prev, [achievementId]: false }));
    }
  };

  // Header animation and particle generation
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }
      );
    }

    // Generate particles on client side only
    const generatedParticles = [...Array(20)].map((_, i) => ({
      id: i,
      width: Math.random() * 4 + 2,
      height: Math.random() * 4 + 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }));
    setParticles(generatedParticles);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #c5050c 0%, #9b0000 50%, #7a0000 100%)',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background particles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        pointerEvents: 'none',
      }}>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            style={{
              position: 'absolute',
              width: particle.width + 'px',
              height: particle.height + 'px',
              background: 'white',
              borderRadius: '50%',
              left: particle.left + '%',
              top: particle.top + '%',
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.header
          ref={headerRef}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ textAlign: 'center', marginBottom: '3rem' }}
        >
          <motion.h1
            style={{
              fontSize: '3.5rem',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '1rem',
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
            animate={{
              textShadow: [
                '0 4px 20px rgba(255,255,255,0.2)',
                '0 4px 30px rgba(255,255,255,0.4)',
                '0 4px 20px rgba(255,255,255,0.2)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <img src="/logo.png" alt="BadgerBadge" style={{ height: '3.5rem', width: 'auto' }} />
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: '1.25rem',
              color: '#fee',
              marginBottom: '1rem',
            }}
          >
            UW-Madison Campus Achievement System (Solana Version - Real NFT)
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              fontSize: '0.875rem',
              color: '#fcc',
              flexWrap: 'wrap',
            }}
          >
            <motion.span
              whileHover={{ scale: 1.1, color: '#fff' }}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                cursor: 'default',
              }}
            >
              🌐 Network: Devnet
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.1, color: '#fff' }}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                cursor: 'default',
              }}
            >
              ⚡ Fee: ~$0.0001
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.1, color: '#fff' }}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                cursor: 'default',
              }}
            >
              🔗 On-Chain NFT
            </motion.span>
          </motion.div>
        </motion.header>

        {/* Wallet Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          style={{
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: '1.5rem',
            marginBottom: '3rem',
            border: '2px solid rgba(197, 5, 12, 0.1)',
          }}
        >
          {!wallet ? (
            <motion.button
              onClick={connectWallet}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 20px rgba(147, 51, 234, 0.3)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                color: 'white',
                fontWeight: 'bold',
                padding: '1rem 1.5rem',
                borderRadius: '0.75rem',
                fontSize: '1.125rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.3s',
              }}
            >
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                👻
              </motion.span>
              <span>Connect Phantom Wallet</span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}>
                <div>
                  <motion.p
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}
                  >
                    ✅ Connected to Phantom (Devnet)
                  </motion.p>
                  <motion.p
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      fontWeight: '600',
                      border: '1px solid #d1d5db',
                    }}
                  >
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                  </motion.p>
                </div>
                <motion.button
                  onClick={disconnectWallet}
                  whileHover={{ scale: 1.05, background: '#d1d5db' }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    background: '#e5e7eb',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                  }}
                >
                  Disconnect
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Achievements Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem',
        }}>
          {ACHIEVEMENTS.map((achievement, index) => {
            const isClaiming = claiming[achievement.id] || false;
            const isClaimed = claimedStatus[achievement.id] || false;

            return (
              <Tilt
                key={achievement.id}
                tiltMaxAngleX={15}
                tiltMaxAngleY={15}
                scale={1.02}
                transitionSpeed={400}
                glareEnable={true}
                glareMaxOpacity={0.3}
                glareColor="#ffffff"
                glarePosition="all"
                style={{ borderRadius: '1rem', overflow: 'hidden' }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                  whileHover={{
                    boxShadow: '0 20px 40px rgba(197, 5, 12, 0.2)',
                    transition: { duration: 0.2 }
                  }}
                  style={{
                    background: 'white',
                    borderRadius: '1rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isClaimed ? '2px solid #10b981' : '2px solid transparent',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                {/* Claimed badge */}
                {isClaimed && (
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: '#10b981',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    ✅ Claimed
                  </motion.div>
                )}

                {/* Shimmer effect */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 3s infinite',
                  }}
                />

                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ fontSize: '4rem', marginBottom: '0.5rem' }}
                  >
                    {achievement.icon}
                  </motion.div>
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

                <motion.button
                  onClick={() => handleClaim(achievement.id)}
                  disabled={isClaiming || !wallet || isClaimed}
                  whileHover={!isClaiming && wallet && !isClaimed ? { scale: 1.05, boxShadow: '0 8px 16px rgba(220, 38, 38, 0.3)' } : {}}
                  whileTap={!isClaiming && wallet && !isClaimed ? { scale: 0.95 } : {}}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    fontWeight: 'bold',
                    color: 'white',
                    border: 'none',
                    cursor: isClaiming || !wallet || isClaimed ? 'not-allowed' : 'pointer',
                    background: isClaimed
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : (isClaiming || !wallet
                        ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                        : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'),
                    boxShadow: isClaimed ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s',
                  }}
                >
                  {isClaimed ? '✅ Claimed' : (isClaiming ? '⏳ Minting...' : (wallet ? '🎨 Mint NFT' : '🔒 Connect wallet first'))}
                </motion.button>
              </motion.div>
              </Tilt>
            );
          })}
        </div>

        {/* Info Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          style={{
            textAlign: 'center',
            color: 'white',
            fontSize: '0.875rem',
            marginTop: '3rem',
          }}
        >
          <p style={{ marginBottom: '0.5rem' }}>
            💡 <strong>This is a real Solana NFT！</strong> After minting, view in Phantom wallet "Collectibles" tab
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.75, marginBottom: '0.5rem' }}>
            Program ID: {PROGRAM_ID.toString()}
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.75 }}>
            View transaction: <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer" style={{ color: '#fcc', textDecoration: 'underline' }}>Solana Explorer (Devnet)</a>
          </p>
        </motion.footer>
      </div>

      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 200%;
          }
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        * {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Custom Toast Notification */}
      <CustomToast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        details={toast.details}
        onClose={() => {
          // Trigger confetti when closing success toast
          if (toast.type === 'success' && toast.confettiEmoji) {
            setConfetti({ show: true, emoji: toast.confettiEmoji });
          }
          setToast({ show: false, type: 'success', title: '', message: '', details: '', confettiEmoji: '' });
        }}
      />

      {/* Emoji Confetti Animation */}
      <EmojiConfetti
        show={confetti.show}
        emoji={confetti.emoji}
        onComplete={() => setConfetti({ show: false, emoji: '' })}
      />
    </div>
  );
}
