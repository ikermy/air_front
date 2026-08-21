/**
 * Сетевой слой авторизации для лендинга (App Router).
 *
 * Почему отдельный модуль, а не импорт старых форм из src/landing/auth/*.js:
 * те компоненты завязаны на react-router (`useNavigate`) и i18next, которых
 * в App Router нет. При этом САМИ контракты бэкенда трогать нельзя, поэтому
 * здесь они перенесены 1-в-1 из AuthForm.js / RegForm.js / RestoreMail.js:
 * те же URL, те же однобуквенные поля тела запроса, те же коды ответов.
 *
 * Чистые утилиты (шифрование, userId, куки) переиспользуются как есть —
 * они не тянут React и одинаково работают в обоих роутерах.
 */
import { encryptPassword, getKey } from '../../../utils/easyUtils';
import { setCookie } from '../../../utils/cookieUtils';

/** Имя куки доступа. Должно совпадать с src/AuthContext.js. */
export const ACCESS_TOKEN_COOKIE = 'accessToken';

export type LoginResult =
  | { status: 'permit'; token: string; totpEnabled: boolean; master: boolean }
  | { status: 'totp_required'; totpToken: string }
  | { status: 'deny' }
  | { status: 'confirmed' }
  | { status: 'disabled' }
  | { status: 'error' };

export type RegisterResult =
  | { status: 'ok' }
  | { status: 'email-exists' }
  | { status: 'error' };

export type RestoreResult =
  | { status: 'exist' }
  | { status: 'not' }
  | { status: 'rate-limited' }
  | { status: 'error' };

/**
 * Сохраняет токен доступа так же, как это делает login() в AuthContext,
 * чтобы SPA-дашборд увидел сессию после перехода через границу роутеров.
 */
export function persistAccessToken(token: string): void {
  if (!token) return;
  setCookie(ACCESS_TOKEN_COOKIE, token, { secure: true, sameSite: 'lax' });
}

/**
 * Переход в дашборд.
 *
 * Дашборд живёт в Pages Router, лендинг — в App Router. Клиентская навигация
 * эту границу не пересекает, поэтому нужна полная загрузка документа.
 */
export function goToDashboard(warnings?: { warn2FA?: boolean; warnMasterKey?: boolean }): void {
  if (typeof window === 'undefined') return;
  const query = new URLSearchParams();
  if (warnings?.warn2FA) query.set('warn2FA', '1');
  if (warnings?.warnMasterKey) query.set('warnMasterKey', '1');
  window.location.assign(`/dashboard${query.toString() ? `?${query}` : ''}`);
}

/** Шаг 1: пароль шифруется сессионным ключом, затем уходит на /v1/auth/login. */
export async function login(params: {
  userId: number;
  email: string;
  password: string;
  auto: boolean;
}): Promise<LoginResult> {
  try {
    const key = await getKey({ userId: params.userId });
    if (key.status !== 'ok' || !key.key) return { status: 'error' };

    const encrypted = await encryptPassword(params.password, key.key);

    const response = await fetch('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        a: params.userId,
        b: params.email,
        c: encrypted,
        d: params.auto,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) return { status: 'deny' };
      return { status: 'error' };
    }

    const data = await response.json();

    if (data.status === 'totp_required') {
      return { status: 'totp_required', totpToken: data.totp_token };
    }
    if (data.confirmed && !data.disabled) {
      return {
        status: 'permit',
        token: data.token,
        totpEnabled: false,
        master: Boolean(data.master),
      };
    }
    if (!data.confirmed) return { status: 'confirmed' };
    if (data.disabled) return { status: 'disabled' };

    return { status: 'error' };
  } catch (error) {
    console.error('[auth] login failed', error);
    return { status: 'error' };
  }
}

/**
 * Шаг 2 при включённой двухфакторной аутентификации.
 *
 * Намеренно обычный fetch, а не authFetch из totpUtils: authFetch подставляет
 * заголовок Authorization и при отсутствии токена возвращает синтетический 401,
 * не дойдя до сети. На этом шаге пользователь ещё не авторизован — ролью
 * пропуска работает сам totp_token. URL, метод и тело при этом те же.
 */
export async function verifyTotp(
  totpToken: string,
  code: string
): Promise<{ status: 'ok'; token: string } | { status: 'error'; message?: string }> {
  try {
    const response = await fetch('/v1/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ totp_token: totpToken, code }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { status: 'error', message: err?.error };
    }

    const data = await response.json();
    if (!data?.token) return { status: 'error' };
    return { status: 'ok', token: data.token };
  } catch (error) {
    console.error('[auth] totp failed', error);
    return { status: 'error' };
  }
}

/** Регистрация: сначала проверка занятости email (заодно отдаёт ключ шифрования). */
export async function register(params: {
  userId: number;
  name: string;
  email: string;
  password: string;
  demo: boolean;
  language: string;
}): Promise<RegisterResult> {
  try {
    const checkResponse = await fetch('/v1/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: params.email, b: params.userId }),
    });

    if (!checkResponse.ok) return { status: 'error' };

    const checkData = await checkResponse.json();
    if (checkData.email === true) return { status: 'email-exists' };
    if (checkData.email !== false || !checkData.key) return { status: 'error' };

    const encrypted = await encryptPassword(params.password, checkData.key);

    const response = await fetch('/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        a: params.userId,
        b: params.name,
        c: params.email,
        d: encrypted,
        e: params.demo,
        f: params.language,
      }),
    });

    return response.ok ? { status: 'ok' } : { status: 'error' };
  } catch (error) {
    console.error('[auth] register failed', error);
    return { status: 'error' };
  }
}

/** Запрос ссылки на смену пароля. */
export async function requestPasswordReset(params: {
  userId: number;
  email: string;
  language: string;
}): Promise<RestoreResult> {
  try {
    const response = await fetch('/v1/auth/reset-password/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        a: params.userId,
        b: params.email,
        lang: params.language,
      }),
    });

    if (response.status === 429) return { status: 'rate-limited' };
    if (!response.ok) return { status: 'error' };

    const data = await response.json();
    return data.a ? { status: 'exist' } : { status: 'not' };
  } catch (error) {
    console.error('[auth] password reset failed', error);
    return { status: 'error' };
  }
}
