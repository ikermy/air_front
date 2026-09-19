'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { TRIAL_DAYS } from '../config/site';
import { PolicyModal } from '../../auth/PolicyModals';

// Формы тянет antd Form/Input/Switch — заметный кусок JS, который не нужен
// до первого открытия модалки. Provider рендерит их только при выбранном
// режиме, поэтому чанк грузится строго по действию пользователя.
const LoginForm = dynamic(
  () => import('./LoginForm').then((m) => m.LoginForm),
  { ssr: false }
);
const RegisterForm = dynamic(
  () => import('./RegisterForm').then((m) => m.RegisterForm),
  { ssr: false }
);
const RestoreForm = dynamic(
  () => import('./RestoreForm').then((m) => m.RestoreForm),
  { ssr: false }
);

export type AuthMode = 'login' | 'register' | 'restore';

export interface AuthModalValue {
  openAuth: (mode: AuthMode) => void;
  closeAuth: () => void;
  openPrivacy: () => void;
  mode: AuthMode | null;
}

const AuthModalContext = createContext<AuthModalValue>({
  openAuth: () => {},
  closeAuth: () => {},
  mode: null,
  openPrivacy: () => {},
});

export const useAuthModal = (): AuthModalValue => useContext(AuthModalContext);

/** Допустимые значения ?auth= — всё остальное игнорируем. */
const QUERY_MODES: AuthMode[] = ['login', 'register', 'restore'];

/**
 * Хранит состояние модального окна авторизации и рендерит его один раз
 * на всё приложение.
 *
 * Дополнительно поддерживает `?auth=login|register`: по этому параметру
 * на лендинг возвращаются редиректы из SPA-дашборда (ProtectedRoute,
 * подтверждение почты, сброс пароля). Клиентской навигации между
 * App Router и Pages Router нет, поэтому состояние передаётся через URL.
 */
export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth');
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const openAuth = useCallback((next: AuthMode) => setMode(next), []);
  const closeAuth = useCallback(() => setMode(null), []);
  const openPrivacy = useCallback(() => setPrivacyOpen(true), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const requested = params.get('auth') as AuthMode | null;
    if (!requested || !QUERY_MODES.includes(requested)) return;

    setMode(requested);

    // Убираем параметр, чтобы обновление страницы или «назад»
    // не открывали окно повторно.
    params.delete('auth');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash
    );
  }, []);

  const value = useMemo<AuthModalValue>(
    () => ({ openAuth, closeAuth, openPrivacy, mode }),
    [openAuth, closeAuth, openPrivacy, mode]
  );

  const titles: Record<AuthMode, string> = {
    login: t('login.title'),
    register: t('register.title'),
    restore: t('restore.title'),
  };

  const subtitles: Record<AuthMode, string> = {
    login: t('login.subtitle'),
    register: t('register.subtitle', { days: TRIAL_DAYS }),
    restore: t('restore.subtitle'),
  };

  return (
    <AuthModalContext.Provider value={value}>
      {children}

      <AuthModal
        open={mode !== null}
        onClose={closeAuth}
        closeLabel={t('close')}
        title={mode ? titles[mode] : ''}
        subtitle={mode ? subtitles[mode] : undefined}
        badge={
          mode === 'register' ? (
            <>
              <Sparkles size={12} aria-hidden />
              {t('register.badge', { days: TRIAL_DAYS })}
            </>
          ) : undefined
        }
      >
        {mode === 'login' && (
          <LoginForm
            onSwitchToRegister={() => setMode('register')}
            onSwitchToRestore={() => setMode('restore')}
          />
        )}
        {mode === 'register' && <RegisterForm onSwitchToLogin={() => setMode('login')} />}
        {mode === 'restore' && <RestoreForm onSwitchToLogin={() => setMode('login')} />}
      </AuthModal>
      <PolicyModal
        isOpen={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
    </AuthModalContext.Provider>
  );
}
