import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing, hreflangMap, type Locale } from '../../src/i18n/routing';
import { LandingThemeProvider } from '../../src/landing/v2/theme/LandingThemeProvider';
import { AuthModalProvider } from '../../src/landing/v2/auth/AuthModalContext';
import {
  normalizeTheme,
  THEME_COOKIE,
} from '../../src/landing/v2/theme/themeCookie';
import { SITE_URL } from '../../src/landing/v2/config/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Путь локали: ru живёт на `/` (localePrefix: 'as-needed'). */
const localePath = (locale: Locale) =>
  locale === routing.defaultLocale ? '/' : `/${locale}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: 'meta' });

  // hreflang-кластер: три языка + x-default на корень.
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[hreflangMap[l]] = `${SITE_URL}${localePath(l)}`;
  }
  languages['x-default'] = `${SITE_URL}/`;

  const canonical = `${SITE_URL}${localePath(locale)}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: t('title'),
    description: t('description'),
    alternates: { canonical, languages },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'AiR',
      title: t('title'),
      description: t('description'),
      locale: hreflangMap[locale].replace('-', '_'),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Обязательно до любого обращения к переводам — включает статический рендер.
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const mode = normalizeTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <NextIntlClientProvider>
      <LandingThemeProvider initialMode={mode}>
        {/* Внутри LandingThemeProvider: модалка использует antd App.useApp()
            для уведомлений и должна видеть токены текущей темы. */}
        <AuthModalProvider>{children}</AuthModalProvider>
      </LandingThemeProvider>
    </NextIntlClientProvider>
  );
}
