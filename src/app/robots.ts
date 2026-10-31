import type { MetadataRoute } from 'next';
import { siteUrl } from '@/server/request';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/dashboard', '/settings', '/notifications', '/play/'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
