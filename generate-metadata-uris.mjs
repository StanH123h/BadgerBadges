import { ACHIEVEMENTS } from './packages/shared/src/achievements.js';

// 生成 SVG 图片的 data URI
function generateSVGDataURI(icon, name, category) {
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#c5050c;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#9b0000;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#grad)"/>
      <text x="200" y="150" font-size="100" text-anchor="middle" fill="white">${icon}</text>
      <text x="200" y="220" font-size="24" font-weight="bold" text-anchor="middle" fill="white">${name}</text>
      <text x="200" y="250" font-size="16" text-anchor="middle" fill="#fee">${category}</text>
      <text x="200" y="350" font-size="14" text-anchor="middle" fill="#fcc">UW-Madison BadgerBadge</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// 生成 metadata JSON 的 data URI
function generateMetadataURI(achievement, mintNumber = 1) {
  const imageUri = generateSVGDataURI(achievement.icon, achievement.name, achievement.category);

  const metadata = {
    name: achievement.name,
    symbol: "BADGE",
    description: `UW-Madison BadgerBadge Achievement NFT - ${achievement.description}`,
    image: imageUri,
    attributes: [
      {
        trait_type: "Category",
        value: achievement.category
      },
      {
        trait_type: "Achievement ID",
        value: achievement.id
      },
      {
        trait_type: "University",
        value: "UW-Madison"
      },
      {
        trait_type: "Icon",
        value: achievement.icon
      }
    ],
    properties: {
      files: [
        {
          uri: imageUri,
          type: "image/svg+xml"
        }
      ],
      category: "image"
    }
  };

  return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
}

console.log('📋 Achievement Metadata URIs:\n');

ACHIEVEMENTS.forEach((achievement, index) => {
  console.log(`${index + 1}. ${achievement.name} (${achievement.id})`);
  console.log(`   Icon: ${achievement.icon}`);

  const metadataUri = generateMetadataURI(achievement);
  console.log(`   Metadata URI (length: ${metadataUri.length}):`);
  console.log(`   ${metadataUri.substring(0, 100)}...`);
  console.log('');
});

console.log('\n💡 提示：这些 data URI 可以直接用作 NFT 的 uri 参数，无需上传到 IPFS');
console.log('💡 完整的 metadata URI 包含了图片和所有属性信息\n');

// 导出函数供前端使用
export { generateMetadataURI, generateSVGDataURI };
