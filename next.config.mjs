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
  // Build configuration for Windows compatibility
  webpack: (config, { dev, isServer }) => {
    // Fix for build issues with webpack runtime
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }

    // Optimize chunks to prevent runtime errors
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
          },
        },
      }
    }

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
