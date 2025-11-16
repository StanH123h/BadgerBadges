import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getAchievementById } from '../../../lib/shared';

/**
 * Backend API for validating and signing achievement claims
 *
 * SECURITY CRITICAL:
 * This API is the ONLY gatekeeper preventing fraudulent claims.
 * Every validation here must be bulletproof.
 *
 * KNOWN VULNERABILITIES IN THIS DEMO:
 * 1. Location spoofing: Client sends lat/lng (UNTRUSTED!)
 *    - FIX: Use QR codes, WiFi BSSID verification, or trusted beacons
 * 2. Weather data: No actual weather API integration
 *    - FIX: Integrate OpenWeatherMap or Weather.gov API
 * 3. No rate limiting: Same user can spam requests
 *    - FIX: Implement rate limiting per IP/wallet
 * 4. No nonce deduplication across server restarts
 *    - FIX: Store used nonces in database (Redis/PostgreSQL)
 */

// In-memory nonce tracking (TEMPORARY - use database in production)
const usedNonces = new Set();

/**
 * Validate if user is eligible for an achievement
 */
async function validateEligibility(achievementId, data) {
  const achievement = getAchievementById(achievementId);
  if (!achievement) {
    throw new Error('Achievement not found');
  }

  const { validationRules } = achievement;
  const { lat, lng, eventCode } = data;

  switch (validationRules.type) {
    case 'weather': {
      // TODO: IMPLEMENT REAL WEATHER API INTEGRATION
      // Example using OpenWeatherMap:
      // const weather = await fetch(
      //   `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.WEATHER_API_KEY}`
      // );
      // const weatherData = await weather.json();
      // if (weatherData.weather[0].main.toLowerCase() !== validationRules.condition) {
      //   throw new Error(`Current weather is not ${validationRules.condition}`);
      // }

      // DEMO: Mock validation
      console.log(`[MOCK] Validating weather: ${validationRules.condition} at (${lat}, ${lng})`);

      // Check if location is within Madison bounds
      const { location } = validationRules;
      if (
        lat < location.minLat ||
        lat > location.maxLat ||
        lng < location.minLng ||
        lng > location.maxLng
      ) {
        throw new Error('Location is outside Madison, WI area');
      }

      // DEMO: For testing, we'll accept any claim
      // In production, verify actual weather conditions
      console.warn('⚠️  WARNING: Weather validation is mocked. Implement real API!');
      return true;
    }

    case 'event_code': {
      // TODO: IMPLEMENT EVENT CODE VALIDATION
      // Store valid event codes in database with expiration
      // Example:
      // const validCodes = await db.query(
      //   'SELECT * FROM event_codes WHERE code = $1 AND expires_at > NOW()',
      //   [eventCode]
      // );
      // if (!validCodes.rows.length) {
      //   throw new Error('Invalid or expired event code');
      // }

      // DEMO: Mock validation - accept specific test codes
      const VALID_EVENT_CODES = {
        'MORGRIDGE2025': 'MORGRIDGE_HACKER_2025',
      };

      if (!eventCode || VALID_EVENT_CODES[eventCode] !== achievementId) {
        throw new Error(
          'Invalid event code. For demo, use: MORGRIDGE2025 for Morgridge Hackathon achievement.'
        );
      }

      // Check location proximity (within 100m of Morgridge Hall)
      const { location } = validationRules;
      const distance = calculateDistance(lat, lng, location.lat, location.lng);
      if (distance > location.radiusMeters) {
        throw new Error(`You must be within ${location.radiusMeters}m of the event location`);
      }

      console.warn('⚠️  WARNING: Event code validation is basic. Use database in production!');
      return true;
    }

    case 'time_location': {
      // Validate time window
      const now = new Date();
      const hour = now.getHours();
      const { timeWindow, location } = validationRules;

      if (hour < timeWindow.hourStart || hour >= timeWindow.hourEnd) {
        throw new Error(
          `This achievement can only be claimed between ${timeWindow.hourStart}:00 and ${timeWindow.hourEnd}:00`
        );
      }

      // Validate location proximity
      const distance = calculateDistance(lat, lng, location.lat, location.lng);
      if (distance > location.radiusMeters) {
        throw new Error(`You must be within ${location.radiusMeters}m of the location`);
      }

      console.warn('⚠️  WARNING: Location can be spoofed! Use QR codes or WiFi verification!');
      return true;
    }

    default:
      throw new Error('Unknown validation type');
  }
}

/**
 * Calculate distance between two lat/lng points (in meters)
 * Uses Haversine formula
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * POST /api/claim
 * Validates eligibility and returns signature for minting
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { wallet, achievementId, lat, lng, eventCode } = body;

    // Validate required fields
    if (!wallet || !ethers.isAddress(wallet)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    if (!achievementId) {
      return NextResponse.json({ error: 'Achievement ID is required' }, { status: 400 });
    }

    // Validate coordinates (basic check)
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Check if achievement exists
    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 });
    }

    // Validate eligibility
    console.log(`\n🔍 Validating claim for ${achievementId} by ${wallet}`);
    await validateEligibility(achievementId, { lat, lng, eventCode });
    console.log('✅ Validation passed!');

    // Generate unique nonce
    // TODO: In production, generate and store in database to prevent reuse
    const nonce = ethers.randomBytes(32);
    const nonceHex = ethers.hexlify(nonce);

    // Check if nonce already used (in-memory check for demo)
    if (usedNonces.has(nonceHex)) {
      // This should be extremely rare with cryptographically secure random
      return NextResponse.json({ error: 'Nonce collision, please retry' }, { status: 500 });
    }
    usedNonces.add(nonceHex);

    // Set deadline (5 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 5 * 60;

    // Get contract address and chain ID
    const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS;
    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract not deployed. Please deploy contract first.' },
        { status: 500 }
      );
    }

    const network = process.env.NEXT_PUBLIC_NETWORK || 'localhost';
    const chainId = network === 'localhost' ? 31337 : network === 'sepolia' ? 11155111 : 1;

    // Convert achievementId to bytes32 (same as frontend does)
    const achievementIdBytes32 = ethers.id(achievementId);

    // Create message hash (MUST match contract's hash exactly)
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'bytes32', 'uint256', 'uint256', 'address'],
      [wallet, achievementIdBytes32, nonce, deadline, chainId, contractAddress]
    );

    // Sign the message
    const signerKey = process.env.BACKEND_SIGNER_KEY;
    if (!signerKey) {
      return NextResponse.json(
        { error: 'Backend signer not configured' },
        { status: 500 }
      );
    }

    const signer = new ethers.Wallet(signerKey);
    const signature = await signer.signMessage(ethers.getBytes(messageHash));

    console.log('✅ Signature generated!');
    console.log('   Signer:', signer.address);
    console.log('   Nonce:', nonceHex);
    console.log('   Deadline:', new Date(deadline * 1000).toISOString());

    // Return signature and parameters
    return NextResponse.json({
      success: true,
      signature,
      nonce: nonceHex,
      deadline,
      achievementId,
      message: 'Eligibility verified. Use this signature to mint your achievement NFT.',
    });
  } catch (error) {
    console.error('❌ Claim validation failed:', error);

    // Return user-friendly error
    return NextResponse.json(
      {
        error: error.message || 'Failed to validate claim',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 400 }
    );
  }
}

/**
 * GET /api/claim
 * Health check endpoint
 */
export async function GET() {
  const signerKey = process.env.BACKEND_SIGNER_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS;

  return NextResponse.json({
    status: 'ok',
    signerConfigured: !!signerKey,
    signerAddress: signerKey ? new ethers.Wallet(signerKey).address : null,
    contractAddress: contractAddress || 'Not configured',
    network: process.env.NEXT_PUBLIC_NETWORK || 'localhost',
    warnings: [
      'Weather validation is mocked - integrate real API before production',
      'Location validation can be spoofed - use QR codes or WiFi verification',
      'Nonce storage is in-memory - use database for production',
      'No rate limiting - implement before production',
    ],
  });
}
