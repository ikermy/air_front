import type { MetadataRoute } from 'next';
import { routing, hreflangMap, type Locale } from '../src/i18n/routing';
import { SITE_URL } from '../src/landing/v2/config/site';

const localePath = (locale: Locale) =>
  locale === routing.defaultLocale ? '/' : `/${locale}`;

export default function sitemap(): MetadataRoute.Sitemap {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[hreflangMap[l]] = `${SITE_URL}${localePath(l)}`;
  }
  // Тот же x-default, что и в <head>: без него Google сам выбирает,
  // какую локаль показать пользователю из нецелевой страны.
  languages['x-default'] = `${SITE_URL}/`;

  return routing.locales.map((locale) => ({
    url: `${SITE_URL}${localePath(locale)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: locale === routing.defaultLocale ? 1 : 0.8,
    alternates: { languages },
  }));
}
