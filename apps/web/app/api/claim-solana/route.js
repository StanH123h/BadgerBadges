/**
 * Solana版本的成就claim API
 *
 * 验证用户资格并生成Ed25519签名
 */

import { NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { getAchievementById } from '@badger/shared';

// 从环境变量加载backend signer
// Solana使用Ed25519密钥对，需要58字节的私钥
const BACKEND_SIGNER_KEY = process.env.BACKEND_SIGNER_KEY;

// 内存存储nonce（生产环境应该用数据库）
const usedNonces = new Set();

/**
 * POST /api/claim-solana
 *
 * Body:
 * {
 *   achievementId: "RAINY_DAY_2025",
 *   userPubkey: "7xKXtg...",
 *   latitude: 43.07,
 *   longitude: -89.40,
 *   eventCode?: "HACKATHON2025"
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { achievementId, userPubkey, latitude, longitude, eventCode } = body;

    // 1. 验证必需参数
    if (!achievementId || !userPubkey) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 2. 检查backend signer配置
    if (!BACKEND_SIGNER_KEY) {
      return NextResponse.json(
        { success: false, error: 'Backend signer not configured' },
        { status: 500 }
      );
    }

    // 3. 获取成就定义
    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      return NextResponse.json(
        { success: false, error: 'Achievement not found' },
        { status: 404 }
      );
    }

    // 4. 验证资格
    const isEligible = await validateEligibility(
      achievement,
      latitude,
      longitude,
      eventCode
    );

    if (!isEligible.valid) {
      return NextResponse.json(
        { success: false, error: isEligible.reason },
        { status: 403 }
      );
    }

    // 5. 生成nonce和deadline
    const nonce = generateNonce();
    const deadline = Math.floor(Date.now() / 1000) + 5 * 60; // 5分钟有效期

    // 6. 创建签名消息
    // 消息格式：userPubkey + achievementId + nonce + deadline
    const message = createMessage(userPubkey, achievementId, nonce, deadline);

    // 7. 使用Ed25519签名
    const signature = signMessage(message, BACKEND_SIGNER_KEY);

    // 8. 记录nonce
    usedNonces.add(nonce);

    // 9. 返回签名
    return NextResponse.json({
      success: true,
      achievementId,
      nonce,
      deadline,
      signature: Buffer.from(signature).toString('hex'),
      message: '验证通过！请确认交易以mint NFT',
    });
  } catch (error) {
    console.error('Claim API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/claim-solana
 * 健康检查
 */
export async function GET() {
  try {
    let signerAddress = null;

    if (BACKEND_SIGNER_KEY) {
      // 从私钥恢复Keypair
      const secretKey = bs58.decode(BACKEND_SIGNER_KEY);
      const keypair = Keypair.fromSecretKey(secretKey);
      signerAddress = keypair.publicKey.toString();
    }

    return NextResponse.json({
      status: 'ok',
      signerConfigured: !!BACKEND_SIGNER_KEY,
      signerAddress,
      network: process.env.NEXT_PUBLIC_NETWORK || 'devnet',
      blockchain: 'Solana',
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    });
  }
}

// ========== HELPER FUNCTIONS ==========

/**
 * 验证用户是否有资格获得成就
 */
async function validateEligibility(achievement, latitude, longitude, eventCode) {
  const rules = achievement.validationRules;

  // 位置验证
  if (rules.location) {
    // 检查是否在范围内
    if (rules.location.minLat && rules.location.maxLat) {
      if (
        latitude < rules.location.minLat ||
        latitude > rules.location.maxLat ||
        longitude < rules.location.minLng ||
        longitude > rules.location.maxLng
      ) {
        return { valid: false, reason: '你不在要求的位置范围内' };
      }
    }

    // 检查半径
    if (rules.location.radiusMeters) {
      const distance = calculateDistance(
        latitude,
        longitude,
        rules.location.lat,
        rules.location.lng
      );

      if (distance > rules.location.radiusMeters) {
        return {
          valid: false,
          reason: `你距离目标地点${Math.round(distance)}米，需要在${rules.location.radiusMeters}米范围内`,
        };
      }
    }
  }

  // 事件代码验证
  if (rules.requiresEventCode) {
    // TODO: 从数据库验证事件代码
    // 这里简化处理
    if (!eventCode) {
      return { valid: false, reason: '需要提供活动代码' };
    }
  }

  // 时间窗口验证
  if (rules.timeWindow) {
    const now = new Date();
    const hour = now.getHours();

    if (rules.timeWindow.hourStart && rules.timeWindow.hourEnd) {
      if (hour < rules.timeWindow.hourStart || hour >= rules.timeWindow.hourEnd) {
        return {
          valid: false,
          reason: `需要在${rules.timeWindow.hourStart}:00-${rules.timeWindow.hourEnd}:00之间`,
        };
      }
    }
  }

  // 天气验证
  if (rules.type === 'weather') {
    // TODO: 调用真实天气API
    // 这里简化处理，直接通过
    console.log('⚠️ Weather validation not implemented (mock pass)');
  }

  return { valid: true };
}

/**
 * 计算两点距离（米）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 地球半径（米）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 生成随机nonce
 */
function generateNonce() {
  return Buffer.from(nacl.randomBytes(32)).toString('hex');
}

/**
 * 创建待签名消息
 */
function createMessage(userPubkey, achievementId, nonce, deadline) {
  const message = Buffer.concat([
    Buffer.from(userPubkey, 'base64'),
    Buffer.from(achievementId, 'utf8'),
    Buffer.from(nonce, 'hex'),
    Buffer.from(deadline.toString(), 'utf8'),
  ]);

  return message;
}

/**
 * 使用Ed25519签名消息
 */
function signMessage(message, secretKeyBase58) {
  // 导入bs58来解码私钥
  const bs58 = require('bs58');

  // 解码私钥
  const secretKey = bs58.decode(secretKeyBase58);

  // 生成Keypair
  const keypair = Keypair.fromSecretKey(secretKey);

  // 签名
  const signature = nacl.sign.detached(message, keypair.secretKey);

  return signature;
}
