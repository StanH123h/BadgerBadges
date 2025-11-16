/**
 * NFT Metadata JSON API
 * Access: /api/nft-metadata?id=RAINY_DAY_2025&n=1
 * Return Metaplex standard JSON
 */

import { ACHIEVEMENTS } from '../../../lib/shared';

// Generate deterministic random color based on number
function generateRandomColor(seed) {
  const hash = (seed * 2654435761) % 2147483648;
  const hue = hash % 360;
  const saturation = 60 + (hash % 30);
  const lightness = 40 + (hash % 20);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Generate SVG data URI
function generateSVGDataURI(icon, mintNumber) {
  const color1 = generateRandomColor(mintNumber);
  const color2 = generateRandomColor(mintNumber * 7 + 13);

  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1}"/>
      <stop offset="100%" style="stop-color:${color2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <text x="200" y="220" font-size="120" text-anchor="middle" fill="#fff">${icon}</text>
  <text x="20" y="380" font-size="32" font-weight="bold" fill="#fff" opacity="0.9">#${mintNumber}</text>
</svg>`;

  // Convert to base64 data URI
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const achievementId = searchParams.get('id');
  const mintNumber = parseInt(searchParams.get('n') || '1');

  // Find achievement
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!achievement) {
    return Response.json({ error: 'Achievement not found' }, { status: 404 });
  }

  // Generate image data URI (embedded directly, no additional request needed)
  const imageDataURI = generateSVGDataURI(achievement.icon, mintNumber);

  // Metaplex standard metadata
  const metadata = {
    name: `${achievement.name} #${mintNumber}`,
    symbol: "BADGE",
    image: imageDataURI,
    attributes: [
      {
        trait_type: "Category",
        value: achievement.category
      },
      {
        trait_type: "Achievement ID",
        value: achievementId
      },
      {
        trait_type: "Mint Number",
        value: mintNumber.toString()
      },
      {
        trait_type: "Icon",
        value: achievement.icon
      }
    ],
  };

  return Response.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
