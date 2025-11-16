/**
 * 生成 NFT Metadata URI (使用 data URI，无需 IPFS)
 */

// 基于编号生成确定的随机颜色
function generateRandomColor(seed) {
  // 使用简单的哈希算法生成确定的"随机"颜色
  const hash = (seed * 2654435761) % 2147483648;
  const hue = hash % 360; // 色相 0-360
  const saturation = 60 + (hash % 30); // 饱和度 60-90
  const lightness = 40 + (hash % 20); // 亮度 40-60
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// 生成渐变背景
function generateGradient(mintNumber) {
  const color1 = generateRandomColor(mintNumber);
  const color2 = generateRandomColor(mintNumber * 7 + 13); // 不同的 seed
  return `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:${color1}"/>
    <stop offset="100%" style="stop-color:${color2}"/>
  </linearGradient>`;
}

// 生成个性化 SVG (根据编号)
export function generateSVGDataURI(icon, name, mintNumber) {
  const gradient = generateGradient(mintNumber);

  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>${gradient}</defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <text x="200" y="220" font-size="120" text-anchor="middle" fill="#fff">${icon}</text>
  <text x="20" y="380" font-size="32" font-weight="bold" fill="#fff" opacity="0.9">#${mintNumber}</text>
</svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// 生成 metadata URI（返回 localhost API URL，开发用）
export function generateMetadataURI(achievement, mintNumber) {
  // 开发环境直接用 localhost
  // 注意：部署时需要改成真实的公网 URL
  return `http://localhost:3001/api/nft-metadata?id=${achievement.id}&n=${mintNumber}`;
}
