// 生成 metadata JSON data URI（使用 Supabase 图片 URL）
export function generateMetadataJSON(achievement, mintNumber, imageUrl) {
  const metadata = {
    name: `${achievement.name} #${mintNumber}`,
    symbol: "BADGE",
    image: imageUrl, // 使用 Supabase 的公网 URL
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
        trait_type: "Mint Number",
        value: mintNumber.toString()
      },
      {
        trait_type: "Icon",
        value: achievement.icon
      }
    ],
  };

  // 转换为 base64 data URI
  return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
}
