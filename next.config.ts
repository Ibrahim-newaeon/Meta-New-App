import type { NextConfig } from 'next';
const config: NextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'al-ai.ai Meta Ads Platform',
  },
};
export default config;
