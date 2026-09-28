import type { NextConfig } from 'next';

const noStoreHeaders = [
  {
    key: 'Cache-Control',
    value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  },
  {
    key: 'Pragma',
    value: 'no-cache',
  },
  {
    key: 'Expires',
    value: '0',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/login',
        headers: noStoreHeaders,
      },
      {
        source: '/api/login',
        headers: noStoreHeaders,
      },
      {
        source: '/admin/gas',
        headers: noStoreHeaders,
      },
      {
        source: '/admin/settings/cost-masters/lpg',
        headers: noStoreHeaders,
      },
      {
        source: '/api/admin/gas-cost/:path*',
        headers: noStoreHeaders,
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
