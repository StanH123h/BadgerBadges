/**
 * NFT 图片生成 API
 * 访问: /api/nft-image?id=RAINY_DAY_2025&n=1
 */

import { ACHIEVEMENTS } from '@badger/shared';

// 基于编号生成确定的随机颜色
function generateRandomColor(seed) {
  const hash = (seed * 2654435761) % 2147483648;
  const hue = hash % 360;
  const saturation = 60 + (hash % 30);
  const lightness = 40 + (hash % 20);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const achievementId = searchParams.get('id');
  const mintNumber = parseInt(searchParams.get('n') || '1');

  // 查找成就
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!achievement) {
    return new Response('Achievement not found', { status: 404 });
  }

  // 生成渐变背景
  const color1 = generateRandomColor(mintNumber);
  const color2 = generateRandomColor(mintNumber * 7 + 13);

  // 生成SVG
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color1}"/>
      <stop offset="100%" style="stop-color:${color2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <text x="200" y="220" font-size="120" text-anchor="middle" fill="#fff">${achievement.icon}</text>
  <text x="20" y="380" font-size="32" font-weight="bold" fill="#fff" opacity="0.9">#${mintNumber}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable', // 缓存1年
    },
  });
}
