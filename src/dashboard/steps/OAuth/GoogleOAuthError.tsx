/**
 * Страница обработки ошибки OAuth callback от Google
 * Использует универсальный компонент OAuthError
 *
 * МАРШРУТ ДЛЯ BACKEND REDIRECT: /auth/google/error?reason={reason}&provider={provider}
 */

import React from 'react';
import { OAuthError } from './OAuthError';

export const GoogleOAuthError: React.FC = () => {
  return <OAuthError provider="google" />;
};

export default GoogleOAuthError;

