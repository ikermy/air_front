'use client';

import { useEffect } from 'react';
import { notification } from 'antd';
import { useAuthModal } from './AuthModalContext';

/** Показывает результат редиректа backend после подтверждения email. */
export function EmailConfirmationNotice() {
  const { openAuth } = useAuthModal();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('confirm');
    if (!status) return;

    const email = params.get('email') || '';
    const success = status === 'success';

    notification.open({
      message: success ? 'Email успешно подтвержден!' : 'Ошибка подтверждения email',
      description: success
        ? `Адрес ${email} подтвержден. Теперь вы можете войти в систему.`
        : 'Ссылка истекла или недействительна. Запросите новое письмо.',
      placement: 'topRight',
      duration: 6,
    });

    if (success) {
      window.setTimeout(() => openAuth('login'), 3000);
    }

    params.delete('confirm');
    params.delete('reason');
    params.delete('email');
    const query = params.toString();
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash,
    );
  }, [openAuth]);

  return null;
}
