import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { routing, hreflangMap, type Locale } from '../../src/i18n/routing';
import { LandingThemeProvider } from '../../src/landing/v2/theme/LandingThemeProvider';
import { AuthModalProvider } from '../../src/landing/v2/auth/AuthModalContext';
import { DEFAULT_THEME, THEME_COOKIE } from '../../src/landing/v2/theme/themeCookie';
import { SITE_URL } from '../../src/landing/v2/config/site';
import '../globals.css';

// Базовые метаданные: `generateMetadata` ниже дополняет их title/description.
// Отдельный `export const metadata` вместе с `generateMetadata` в одном файле
// Next запрещает, поэтому держим объект локальным.
const BASE_METADATA: Metadata = {
  title: 'AiR',
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

/**
 * Тема применяется inline-скриптом до первой отрисовки: читаем cookie и
 * выставляем data-theme/color-scheme. Так первый кадр уже покрашен, но при
 * этом не нужен серверный `cookies()` — иначе страница становится
 * динамической и её нельзя кешировать (Cache-Control: no-store).
 */
const THEME_INIT_SCRIPT = `(function(){try{var r=/(?:^|;\\s*)${THEME_COOKIE}=(dark|light)/;var m=document.cookie.match(r);var t=m?m[1]:'${DEFAULT_THEME}';var e=document.documentElement;e.setAttribute('data-theme',t);e.style.colorScheme=t;if(document.body){document.body.classList.remove('dark','light');document.body.classList.add(t);}}catch(e){}})();`;

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
  if (!hasLocale(routing.locales, locale)) return BASE_METADATA;

  const t = await getTranslations({ locale, namespace: 'meta' });

  // hreflang-кластер: три языка + x-default на корень.
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[hreflangMap[l]] = `${SITE_URL}${localePath(l)}`;
  }
  languages['x-default'] = `${SITE_URL}/`;

  const canonical = `${SITE_URL}${localePath(locale)}`;

  return {
    ...BASE_METADATA,
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

  // Корневой layout живёт здесь (а не в app/layout.tsx), потому что только
  // на уровне [locale] доступен фактический язык URL: <html lang> обязан
  // соответствовать контенту, иначе скринридеры читают его неверным голосом
  // (аудит Lighthouse «html-has-lang»).
  //
  // Тему на сервере не читаем: это сделал бы Layout динамическим. Первый кадр
  // красит inline-скрипт, а LandingThemeProvider досинхронит состояние из
  // cookie после гидратации.
  return (
    <html lang={locale} data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <body className={DEFAULT_THEME} suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* AntdRegistry собирает CSS-in-JS antd на сервере,
            иначе первый кадр приходит без стилей компонентов. */}
        <AntdRegistry>
          <NextIntlClientProvider>
            <LandingThemeProvider initialMode={DEFAULT_THEME}>
              {/* Внутри LandingThemeProvider: модалка использует antd App.useApp()
                  для уведомлений и должна видеть токены текущей темы. */}
              <AuthModalProvider>{children}</AuthModalProvider>
            </LandingThemeProvider>
          </NextIntlClientProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
