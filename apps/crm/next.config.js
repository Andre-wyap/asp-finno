/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  transpilePackages: ['@asp/shared']
};

module.exports = nextConfig;
