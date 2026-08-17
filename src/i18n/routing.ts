import { defineRouting } from 'next-intl/routing';

/**
 * Схема локалей выбрана под SEO:
 *  - ru живёт на `/` (уже проиндексирован, вес не теряем),
 *  - en на `/en`, es на `/es`,
 *  - `/` одновременно канонический ru-URL и x-default.
 *
 * localePrefix: 'as-needed' => для defaultLocale префикс не добавляется.
 * Автоматических редиректов по Accept-Language НЕТ: Google ходит с US-IP,
 * при редиректе он бы просто никогда не увидел русскую версию.
 */
export const routing = defineRouting({
  locales: ['ru', 'en', 'es'],
  defaultLocale: 'ru',
  localePrefix: 'as-needed',
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  es: 'Español',
};

/** hreflang-коды для <link rel="alternate"> */
export const hreflangMap: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en',
  es: 'es',
};
