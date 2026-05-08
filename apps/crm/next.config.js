/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@asp/shared']
};

module.exports = nextConfig;
