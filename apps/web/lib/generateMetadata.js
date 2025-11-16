// Generate metadata JSON data URI (using Supabase image URL)
export function generateMetadataJSON(achievement, mintNumber, imageUrl) {
  const metadata = {
    name: `${achievement.name} #${mintNumber}`,
    symbol: "BADGE",
    image: imageUrl, // Use Supabase public URL
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

  // Convert to base64 data URI
  return `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
}
