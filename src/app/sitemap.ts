import type { MetadataRoute } from 'next';
import { siteUrl } from '@/server/request';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ['', '/daily', '/unlimited', '/how-to-play', '/leaderboards', '/achievements', '/privacy'].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === '/daily' || p === '/leaderboards' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : 0.7,
  }));
}
