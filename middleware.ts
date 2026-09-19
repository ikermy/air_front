import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const handleI18n = createMiddleware(routing);

/**
 * next-intl на каждый заход в корень ставит `Set-Cookie: NEXT_LOCALE=...`.
 * При `localeDetection: false` эта кука ни на что не влияет (язык задаётся
 * URL), но из-за Set-Cookie ответ становится приватным и не кешируется на
 * CDN. Убираем её — лендинг можно отдавать из кеша.
 */
export default function middleware(request: NextRequest) {
  const response = handleI18n(request);
  response.headers.delete('set-cookie');
  return response;
}

/**
 * ВАЖНО: matcher — белый список, а не «всё кроме».
 *
 * Приложение гибридное: лендинг живёт в app/, а SPA-дашборд
 * (/dashboard, /confirm, /reset, /privacy-policy, /auth/*) и
 * прокси /v1, /api — в pages/. Если middleware зацепит их,
 * next-intl отредиректит на /ru/dashboard и сломает Pages Router.
 *
 * Поэтому перехватываем строго корень и явные локальные префиксы.
 */
export const config = {
  matcher: ['/', '/(ru|en|es)/:path*'],
};
