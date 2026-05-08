/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@asp/shared', '@asp/pricing']
};

module.exports = nextConfig;
