/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable fast refresh/hot reload to prevent SSE connection drops
  reactStrictMode: false,
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable Fast Refresh
      config.watchOptions = {
        ignored: /node_modules/,
        poll: false,
      }
    }
    return config
  },
}

export default nextConfig
