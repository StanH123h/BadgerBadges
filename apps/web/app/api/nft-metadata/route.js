/**
 * NFT Metadata JSON API
 * 访问: /api/nft-metadata?id=RAINY_DAY_2025&n=1
 * 返回符合 Metaplex 标准的 JSON
 */

import { ACHIEVEMENTS } from '@badger/shared';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const achievementId = searchParams.get('id');
  const mintNumber = parseInt(searchParams.get('n') || '1');

  // 查找成就
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!achievement) {
    return Response.json({ error: 'Achievement not found' }, { status: 404 });
  }

  // 生成图片URL
  const baseUrl = request.url.split('/api/')[0];
  const imageUrl = `${baseUrl}/api/nft-image?id=${achievementId}&n=${mintNumber}`;

  // Metaplex 标准 metadata
  const metadata = {
    name: `${achievement.name} #${mintNumber}`,
    symbol: "BADGE",
    image: imageUrl,
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
