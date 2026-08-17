import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { normalizeTheme, THEME_COOKIE } from '../src/landing/v2/theme/themeCookie';
import './globals.css';

export const metadata: Metadata = {
  // Конкретные title/description задаются в app/[locale]/layout.tsx
  title: 'AiR',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Тема читается на сервере => первый кадр приходит уже покрашенным.
  const cookieStore = await cookies();
  const mode = normalizeTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html data-theme={mode} suppressHydrationWarning>
      <body className={mode}>
        {/* AntdRegistry собирает CSS-in-JS antd на сервере,
            иначе первый кадр приходит без стилей компонентов. */}
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
