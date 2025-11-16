/**
 * Solana version achievement claim API
 *
 * Validate user eligibility and generate Ed25519 signature
 */

import { NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { getAchievementById } from '../../../lib/shared';

// Load backend signer from environment variables
// Solana uses Ed25519 keypair, requires 58-byte private key
const BACKEND_SIGNER_KEY = process.env.BACKEND_SIGNER_KEY;

// In-memory nonce storage (production should use database)
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

    // 1. Validate required parameters
    if (!achievementId || !userPubkey) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // 2. Check backend signer configuration
    if (!BACKEND_SIGNER_KEY) {
      return NextResponse.json(
        { success: false, error: 'Backend signer not configured' },
        { status: 500 }
      );
    }

    // 3. Get achievement definition
    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      return NextResponse.json(
        { success: false, error: 'Achievement not found' },
        { status: 404 }
      );
    }

    // 4. Validate eligibility
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

    // 5. Generate nonce and deadline
    const nonce = generateNonce();
    const deadline = Math.floor(Date.now() / 1000) + 5 * 60; // 5 minute validity

    // 6. Create signature message
    // Message format: userPubkey + achievementId + nonce + deadline
    const message = createMessage(userPubkey, achievementId, nonce, deadline);

    // 7. Sign with Ed25519
    const signature = signMessage(message, BACKEND_SIGNER_KEY);

    // 8. Record nonce
    usedNonces.add(nonce);

    // 9. Return signature
    return NextResponse.json({
      success: true,
      achievementId,
      nonce,
      deadline,
      signature: Buffer.from(signature).toString('hex'),
      message: 'Validation passed! Confirm transaction to mint NFT',
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
 * Health check
 */
export async function GET() {
  try {
    let signerAddress = null;

    if (BACKEND_SIGNER_KEY) {
      // Recover Keypair from private key
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
 * Validate if user is eligible for achievement
 */
async function validateEligibility(achievement, latitude, longitude, eventCode) {
  const rules = achievement.validationRules;

  // Location validation
  if (rules.location) {
    // Check if within bounds
    if (rules.location.minLat && rules.location.maxLat) {
      if (
        latitude < rules.location.minLat ||
        latitude > rules.location.maxLat ||
        longitude < rules.location.minLng ||
        longitude > rules.location.maxLng
      ) {
        return { valid: false, reason: 'You are not within the required location bounds' };
      }
    }

    // Check radius
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
          reason: `You are ${Math.round(distance)} meters from target location, need to be within ${rules.location.radiusMeters} meters`,
        };
      }
    }
  }

  // Event code validation
  if (rules.requiresEventCode) {
    // TODO: Validate event code from database
    // Simplified here
    if (!eventCode) {
      return { valid: false, reason: 'Event code required' };
    }
  }

  // Time window validation
  if (rules.timeWindow) {
    const now = new Date();
    const hour = now.getHours();

    if (rules.timeWindow.hourStart && rules.timeWindow.hourEnd) {
      if (hour < rules.timeWindow.hourStart || hour >= rules.timeWindow.hourEnd) {
        return {
          valid: false,
          reason: `Must be between ${rules.timeWindow.hourStart}:00-${rules.timeWindow.hourEnd}:00`,
        };
      }
    }
  }

  // Weather validation
  if (rules.type === 'weather') {
    // TODO: Call real weather API
    // Simplified here, pass directly
    console.log('⚠️ Weather validation not implemented (mock pass)');
  }

  return { valid: true };
}

/**
 * Calculate distance between two points (meters)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius (meters)
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
 * Generate random nonce
 */
function generateNonce() {
  return Buffer.from(nacl.randomBytes(32)).toString('hex');
}

/**
 * Create message to sign
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
 * Sign message using Ed25519
 */
function signMessage(message, secretKeyBase58) {
  // Import bs58 to decode private key
  const bs58 = require('bs58');

  // Decode private key
  const secretKey = bs58.decode(secretKeyBase58);

  // Generate Keypair
  const keypair = Keypair.fromSecretKey(secretKey);

  // Sign
  const signature = nacl.sign.detached(message, keypair.secretKey);

  return signature;
}
