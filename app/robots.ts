import type { MetadataRoute } from 'next';
import { SITE_URL } from '../src/landing/v2/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Приватные разделы SPA индексировать нечего: они за авторизацией
        // и отдаются пустым шеллом — это только размывает краулинговый бюджет.
        disallow: [
          '/dashboard',
          '/confirm',
          '/reset',
          '/auth/',
          '/api/',
          '/v1/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
