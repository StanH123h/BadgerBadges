import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getAchievementById } from '../../../../lib/shared';

/**
 * NFT Metadata API
 * Returns OpenSea standard NFT metadata
 *
 * URL: /api/metadata/[tokenId]
 * Example: /api/metadata/0
 */

// Achievement ID to icon mapping (using SVG data URL)
const ACHIEVEMENT_IMAGES = {
  'RAINY_DAY_2025': generateEmojiSVG('🌧️', 'Madison Rainy Day'),
  'SNOW_DAY_2025': generateEmojiSVG('❄️', 'First Snow'),
  'MORGRIDGE_HACKER_2025': generateEmojiSVG('💻', 'Morgridge Hackathon'),
  'LATE_NIGHT_MORGRIDGE': generateEmojiSVG('🌙', 'Late Night Hacker'),
};

/**
 * Generate emoji SVG image (as data URL)
 */
function generateEmojiSVG(emoji, title, tokenId = '') {
  const svg = `
    <svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient -->
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#c5050c;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#9b0000;stop-opacity:1" />
        </linearGradient>

        <!-- Token ID background gradient -->
        <linearGradient id="tokenBg" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:rgba(255,255,255,0.2);stop-opacity:1" />
          <stop offset="100%" style="stop-color:rgba(255,255,255,0.3);stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="500" height="500" fill="url(#grad1)" rx="20"/>

      <!-- Border -->
      <rect x="10" y="10" width="480" height="480" fill="none" stroke="white" stroke-width="4" rx="15"/>

      <!-- Token ID badge (bottom-left) -->
      ${tokenId !== '' ? `
      <g opacity="0.95">
        <!-- Rounded rectangle background -->
        <rect x="30" y="430" width="120" height="50" fill="url(#tokenBg)" rx="25"/>

        <!-- Border -->
        <rect x="30" y="430" width="120" height="50" fill="none" stroke="white" stroke-width="2" rx="25"/>

        <!-- Token ID text -->
        <text x="90" y="463" font-size="28" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial, sans-serif">
          #${tokenId}
        </text>
      </g>
      ` : ''}

      <!-- Emoji -->
      <text x="250" y="280" font-size="200" text-anchor="middle" fill="white">${emoji}</text>

      <!-- Title -->
      <text x="250" y="450" font-size="24" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial, sans-serif">
        ${title}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Read achievementId corresponding to tokenId from contract
 */
async function getAchievementIdFromContract(tokenId) {
  try {
    const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS;
    const rpcUrl = 'http://127.0.0.1:8545';

    if (!contractAddress) {
      throw new Error('Contract address not configured');
    }

    // Import ABI
    const { AchievementsABI } = await import('../../../lib/shared');

    // Connect to contract
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, AchievementsABI, provider);

    // Call getAchievementId
    const achievementIdBytes32 = await contract.getAchievementId(tokenId);

    // Convert bytes32 back to string
    // We need to find matching achievementId
    const ACHIEVEMENTS = await import('../../../lib/shared').then(m => m.ACHIEVEMENTS);

    for (const achievement of ACHIEVEMENTS) {
      const expectedBytes32 = ethers.id(achievement.id);
      if (expectedBytes32.toLowerCase() === achievementIdBytes32.toLowerCase()) {
        return achievement.id;
      }
    }

    throw new Error('Achievement not found');
  } catch (error) {
    console.error('Error reading from contract:', error);
    throw error;
  }
}

/**
 * GET /api/metadata/[tokenId]
 */
export async function GET(request, { params }) {
  try {
    const { tokenId } = params;

    // Read achievementId from contract
    const achievementIdString = await getAchievementIdFromContract(tokenId);

    // Get achievement info
    const achievement = getAchievementById(achievementIdString);

    if (!achievement) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    // Build OpenSea standard metadata
    const metadata = {
      name: `${achievement.name} #${tokenId}`,
      description: achievement.description,
      image: generateEmojiSVG(achievement.icon, achievement.name, tokenId),
      external_url: `http://localhost:3000`,
      attributes: [
        {
          trait_type: 'Category',
          value: achievement.category,
        },
        {
          trait_type: 'Achievement ID',
          value: achievementIdString,
        },
        {
          trait_type: 'Token ID',
          value: tokenId.toString(),
        },
        {
          trait_type: 'Year',
          value: '2025',
        },
      ],
    };

    // Return JSON
    return NextResponse.json(metadata, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Metadata API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate metadata', details: error.message },
      { status: 500 }
    );
  }
}
