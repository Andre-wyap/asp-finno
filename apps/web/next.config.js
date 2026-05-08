/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  transpilePackages: ['@asp/shared', '@asp/pricing']
};

module.exports = nextConfig;
