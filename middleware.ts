import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

/**
 * ВАЖНО: matcher — белый список, а не «всё кроме».
 *
 * Приложение гибридное: лендинг живёт в app/, а SPA-дашборде
 * (/dashboard, /confirm, /reset, /privacy-policy, /auth/*) и
 * прокси /v1, /api — в pages/. Если middleware зацепит их,
 * next-intl отредиректит на /ru/dashboard и сломает Pages Router.
 *
 * Поэтому перехватываем строго корень и явные локальные префиксы.
 */
export const config = {
  matcher: ['/', '/(ru|en|es)/:path*'],
};
