/**
 * BadgerBadge - Solana版本（真实NFT领取）
 * UW-Madison校园成就系统
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

// Solana配置
const PROGRAM_ID = new PublicKey('GcqYVPhMUUdqpBxVNcLK8otKGzWbxqWiMft2mcDvr7dZ');
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const RPC_URL = 'https://api.devnet.solana.com';

export default function SolanaAchievementsPage() {
  const [wallet, setWallet] = useState(null);
  const [claiming, setClaiming] = useState({});
  const [claimedStatus, setClaimedStatus] = useState({}); // 记录哪些成就已领取
  const connection = useMemo(() => new Connection(RPC_URL, 'confirmed'), []);

  // 检查用户已领取的成就
  const checkClaimedAchievements = async (userPublicKey) => {
    const status = {};
    for (const achievement of ACHIEVEMENTS) {
      try {
        const pda = await getUserAchievementPDA(userPublicKey, achievement.id);
        const accountInfo = await connection.getAccountInfo(pda);
        status[achievement.id] = accountInfo !== null; // 账户存在 = 已领取
      } catch (error) {
        status[achievement.id] = false;
      }
    }
    setClaimedStatus(status);
    console.log('📋 已领取状态:', status);
  };

  // 连接Phantom钱包
  const connectWallet = async () => {
    try {
      const { solana } = window;

      if (!solana?.isPhantom) {
        alert('请安装Phantom钱包！\n访问：https://phantom.app/');
        return;
      }

      const response = await solana.connect();
      console.log('✅ 已连接钱包:', response.publicKey.toString());

      const walletData = {
        publicKey: response.publicKey,
        address: response.publicKey.toString(),
      };

      setWallet(walletData);

      // 检查已领取的成就
      await checkClaimedAchievements(response.publicKey);
    } catch (error) {
      console.error('连接钱包失败:', error);
      alert('连接钱包失败：' + error.message);
    }
  };

  // 断开钱包
  const disconnectWallet = () => {
    if (window.solana) {
      window.solana.disconnect();
    }
    setWallet(null);
  };

  // 计算 Achievement State PDA
  const getAchievementStatePDA = async () => {
    const [pda] = await PublicKey.findProgramAddress(
      [Buffer.from('achievement_state')],
      PROGRAM_ID
    );
    return pda;
  };

  // 计算User Achievement PDA
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

  // 计算 Metadata PDA (Metaplex 标准)
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

  // 序列化字符串（Anchor格式）
  const serializeString = (str) => {
    const stringBytes = Buffer.from(str, 'utf-8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(stringBytes.length, 0);
    return Buffer.concat([lengthBuffer, stringBytes]);
  };

  // Mint NFT Achievement
  const handleClaim = async (achievementId) => {
    if (!wallet) {
      alert('请先连接Phantom钱包！');
      return;
    }

    setClaiming(prev => ({ ...prev, [achievementId]: true }));

    try {
      console.log('🎯 开始mint NFT:', achievementId);
      console.log('💼 钱包地址:', wallet.address);

      // 获取成就信息
      const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (!achievement) {
        throw new Error('Achievement not found');
      }

      // 读取当前的 total_minted，预测下一个编号
      const achievementStatePDA = await getAchievementStatePDA();
      let mintNumber = 1; // 默认值
      try {
        const accountInfo = await connection.getAccountInfo(achievementStatePDA);
        if (accountInfo) {
          // AchievementState 结构: discriminator(8) + authority(32) + total_minted(8)
          const totalMinted = Number(accountInfo.data.readBigUInt64LE(40));
          mintNumber = totalMinted + 1;
          console.log('📊 当前已铸造:', totalMinted, '→ 下一个编号:', mintNumber);
        }
      } catch (error) {
        console.warn('⚠️ 无法读取 total_minted，使用默认编号 #1');
      }

      // 1. 上传图片和 metadata JSON 到 Supabase
      console.log('📤 正在上传资源到 Supabase...');
      const { imageUrl, metadataUrl } = await uploadNFTAssets(achievementId, achievement, mintNumber);
      console.log('✅ 图片 URL:', imageUrl);
      console.log('✅ Metadata URL:', metadataUrl);
      console.log('🖼️ Metadata URI length:', metadataUrl.length);
      console.log('🎨 NFT 编号:', mintNumber);

      // 使用 Supabase 的 metadata URL
      const metadataUri = metadataUrl;

      // 生成新的 mint keypair
      const mintKeypair = Keypair.generate();
      console.log('🪙 Mint address:', mintKeypair.publicKey.toString());

      // 计算其他 PDAs
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

      // 构建指令数据
      // mint_achievement discriminator + 参数
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

      console.log('📦 指令数据长度:', instructionData.length);

      // 创建指令
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

      // 创建交易
      const transaction = new Transaction().add(instruction);
      transaction.feePayer = wallet.publicKey;

      // 获取最新的blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // 部分签名 mint keypair
      transaction.partialSign(mintKeypair);

      console.log('📤 发送交易到Phantom签名...');

      // 使用Phantom签名并发送
      const signedTx = await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      console.log('⏳ 等待交易确认...');
      await connection.confirmTransaction(signature);

      console.log('✅ NFT Mint成功！');
      console.log('🔗 交易签名:', signature);
      console.log('🪙 NFT Mint:', mintKeypair.publicKey.toString());

      // 更新已领取状态
      setClaimedStatus(prev => ({ ...prev, [achievementId]: true }));

      alert(`🎉 成就 NFT "${achievement.name}" 领取成功！\n\n${achievement.icon}\n\n交易签名：\n${signature}\n\nNFT Mint:\n${mintKeypair.publicKey.toString()}\n\n在Solana Explorer查看：\nhttps://explorer.solana.com/tx/${signature}?cluster=devnet\n\n在Phantom钱包的"Collectibles"标签页查看你的NFT！`);

    } catch (error) {
      console.error('❌ Mint失败:', error);

      let errorMessage = error.message;

      // 解析错误
      if (error.message.includes('0x0')) {
        errorMessage = '成就已经被领取过了！';
      } else if (error.message.includes('insufficient')) {
        errorMessage = 'SOL余额不足！请先获取测试SOL。';
      } else if (error.message.includes('User rejected')) {
        errorMessage = '交易被取消';
      } else if (error.message.includes('already in use')) {
        errorMessage = '成就已被领取！';
      } else if (error.logs) {
        console.log('交易日志:', error.logs);
        const errorLog = error.logs.find(log => log.includes('Error'));
        if (errorLog) errorMessage = errorLog;
      }

      alert(`❌ Mint失败：${errorMessage}\n\n详细信息请查看控制台`);
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
            UW-Madison校园成就系统 (Solana版本 - 真实NFT)
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
              <span>连接Phantom钱包</span>
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
                    ✅ 已连接 Phantom (Devnet)
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
                  断开连接
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
                  {isClaimed ? '✅ 已领取' : (isClaiming ? '⏳ 铸造中...' : (wallet ? '🎨 铸造 NFT' : '🔒 请先连接钱包'))}
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
            💡 <strong>这是真实的Solana NFT！</strong> 铸造后可以在 Phantom 钱包的 "Collectibles" 标签页查看
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.75, marginBottom: '0.5rem' }}>
            Program ID: {PROGRAM_ID.toString()}
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.75 }}>
            查看交易: <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer" style={{ color: '#fcc', textDecoration: 'underline' }}>Solana Explorer (Devnet)</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
