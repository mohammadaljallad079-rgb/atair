/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  // Same-origin API: forward /api/* to the NestJS API so the browser can call
  // it on the app's own origin (avoids mixed content over HTTPS).
  async rewrites() {
    const api = (process.env.API_PROXY_TARGET ?? 'http://localhost:3000').replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${api}/api/:path*` }];
  },
};
export default nextConfig;
