export type ThemeMode = 'dark' | 'light';

/**
 * Одно имя cookie на всё приложение.
 * Лендинг (app/) читает её на сервере => нет FOUC при SSR.
 * Дашборд (pages/) продолжает читать localStorage — ThemeContext
 * синхронизирует оба хранилища, поэтому тема сквозная.
 */
export const THEME_COOKIE = 'air_theme';

/** Тёмная — база проекта: фирменный лайм #c8fb77 задуман под графит. */
export const DEFAULT_THEME: ThemeMode = 'dark';

export const isThemeMode = (v: unknown): v is ThemeMode =>
  v === 'dark' || v === 'light';

export const normalizeTheme = (v: unknown): ThemeMode =>
  isThemeMode(v) ? v : DEFAULT_THEME;

export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Пишем cookie без Secure, чтобы работало на http://localhost в dev. */
export function writeThemeCookie(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie =
    `${THEME_COOKIE}=${mode}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

export function readThemeCookie(): ThemeMode | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`)
  );
  return match && isThemeMode(match[1]) ? match[1] : null;
}
