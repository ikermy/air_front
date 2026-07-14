/**
 * Страница обработки ошибки OAuth callback от Avito
 * Использует универсальный компонент OAuthError
 *
 * МАРШРУТ ДЛЯ BACKEND REDIRECT: /auth/avito/error?reason={reason}
 *
 * Доступные коды ошибок (reason):
 * - missing-params: Отсутствует code или state
 * - invalid-state: Неверный state параметр
 * - exchange-failed: Ошибка обмена кода на токены
 * - access-denied: Пользователь отклонил доступ
 */

import React from 'react';
import { OAuthError } from './OAuthError';

export const AvitoOAuthError: React.FC = () => {
  return <OAuthError provider="avito" />;
};

export default AvitoOAuthError;

