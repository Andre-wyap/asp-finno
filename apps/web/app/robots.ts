import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/apply', '/payment/', '/track/'],
    },
    sitemap: 'https://asp.finnomalaysia.com/sitemap.xml',
  };
}
