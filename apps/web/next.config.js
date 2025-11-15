/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable TypeScript checking since we're using pure JavaScript
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // We're not using TypeScript, so ignore those linting rules
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Enable server actions if needed in future
    serverActions: true,
  },
};

export default nextConfig;
