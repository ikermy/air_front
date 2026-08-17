import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

/**
 * Неймспейсы секций лежат в отдельных файлах messages/<locale>/<ns>.json.
 *
 * Причина: единый messages/<locale>.json — точка конфликта, когда над
 * секциями идёт параллельная работа. Пофайловое разбиение даёт каждой
 * секции собственный владеемый файл.
 *
 * Базовые неймспейсы (meta, nav, cta, hero, trust) остаются
 * в messages/<locale>.json.
 */
const SECTION_NAMESPACES = [
  'auth',
  'features',
  'security',
  'playground',
  'architecture',
  'economics',
  'pricing',
  'support',
  'faq',
  'footer',
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const base = (await import(`../../messages/${locale}.json`)).default;

  const sections = await Promise.all(
    SECTION_NAMESPACES.map(async (ns) => {
      try {
        const mod = await import(`../../messages/${locale}/${ns}.json`);
        return [ns, mod.default] as const;
      } catch {
        // Секция ещё не переведена — не роняем страницу целиком.
        return [ns, undefined] as const;
      }
    })
  );

  const messages: Record<string, unknown> = { ...base };
  for (const [ns, value] of sections) {
    if (value) messages[ns] = value;
  }

  return { locale, messages };
});
