/**
 * Generate NFT Metadata URI (using data URI, no IPFS needed)
 */

// Generate deterministic random color based on number
function generateRandomColor(seed) {
  // Use simple hash algorithm to generate deterministic "random" color
  const hash = (seed * 2654435761) % 2147483648;
  const hue = hash % 360; // Hue 0-360
  const saturation = 60 + (hash % 30); // Saturation 60-90
  const lightness = 40 + (hash % 20); // Lightness 40-60
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Generate gradient background
function generateGradient(mintNumber) {
  const color1 = generateRandomColor(mintNumber);
  const color2 = generateRandomColor(mintNumber * 7 + 13); // Different seed
  return `<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:${color1}"/>
    <stop offset="100%" style="stop-color:${color2}"/>
  </linearGradient>`;
}

// Generate personalized SVG (based on number)
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

// Generate metadata URI (returns localhost API URL for development)
export function generateMetadataURI(achievement, mintNumber) {
  // Development environment uses localhost directly
  // Note: Change to real public URL when deploying
  return `http://localhost:3001/api/nft-metadata?id=${achievement.id}&n=${mintNumber}`;
}
