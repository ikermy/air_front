import type { Metadata, Viewport } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { DEFAULT_THEME, THEME_COOKIE } from '../src/landing/v2/theme/themeCookie';
import './globals.css';

export const metadata: Metadata = {
  // Конкретные title/description задаются в app/[locale]/layout.tsx
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html data-theme={DEFAULT_THEME} suppressHydrationWarning>
      {/* suppressHydrationWarning: data-theme/class прокидывает скрипт выше,
          они намеренно расходятся с серверной разметкой и это не ошибка. */}
      <body className={DEFAULT_THEME} suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* AntdRegistry собирает CSS-in-JS antd на сервере,
            иначе первый кадр приходит без стилей компонентов. */}
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
