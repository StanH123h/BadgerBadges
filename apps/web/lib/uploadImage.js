import { supabase } from './supabase';

// 基于编号生成确定的随机颜色
function generateRandomColor(seed) {
  const hash = (seed * 2654435761) % 2147483648;
  const hue = hash % 360;
  const saturation = 60 + (hash % 30);
  const lightness = 40 + (hash % 20);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// 生成 SVG 字符串
function generateSVG(icon, mintNumber) {
  const color1 = generateRandomColor(mintNumber);
  const color2 = generateRandomColor(mintNumber * 7 + 13);

  return `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
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
}

// 上传 NFT 图片和 metadata 到 Supabase Storage
export async function uploadNFTAssets(achievementId, achievement, mintNumber) {
  try {
    // 1. 生成并上传 SVG 图片
    const svg = generateSVG(achievement.icon, mintNumber);
    const imageFileName = `${achievementId}-${mintNumber}.svg`;

    const { error: imageError } = await supabase.storage
      .from('nft-images')
      .upload(imageFileName, svg, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (imageError) {
      console.error('上传图片失败:', imageError);
      throw imageError;
    }

    // 获取图片公网 URL
    const { data: { publicUrl: imageUrl } } = supabase.storage
      .from('nft-images')
      .getPublicUrl(imageFileName);

    console.log('✅ 图片上传成功:', imageUrl);

    // 2. 生成 metadata JSON
    const metadata = {
      name: `${achievement.name} #${mintNumber}`,
      symbol: "BADGE",
      image: imageUrl,
      attributes: [
        { trait_type: "Category", value: achievement.category },
        { trait_type: "Achievement ID", value: achievementId },
        { trait_type: "Mint Number", value: mintNumber.toString() },
        { trait_type: "Icon", value: achievement.icon }
      ],
    };

    // 3. 上传 metadata JSON
    const metadataFileName = `${achievementId}-${mintNumber}.json`;
    const metadataJSON = JSON.stringify(metadata);

    const { error: metadataError } = await supabase.storage
      .from('nft-images')
      .upload(metadataFileName, metadataJSON, {
        contentType: 'application/json',
        upsert: true
      });

    if (metadataError) {
      console.error('上传 metadata 失败:', metadataError);
      throw metadataError;
    }

    // 获取 metadata 公网 URL
    const { data: { publicUrl: metadataUrl } } = supabase.storage
      .from('nft-images')
      .getPublicUrl(metadataFileName);

    console.log('✅ Metadata 上传成功:', metadataUrl);

    return {
      imageUrl,
      metadataUrl
    };
  } catch (error) {
    console.error('❌ 上传资源出错:', error);
    throw error;
  }
}
