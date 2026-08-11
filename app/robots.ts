import type { MetadataRoute } from 'next';

const siteUrl = 'https://menu-costing.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/app/',
        '/login',
        '/signup',
        '/onboarding',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
