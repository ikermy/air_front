/**
 * Страница обработки успешного OAuth callback от Google
 * Использует универсальный компонент OAuthSuccess
 *
 * МАРШРУТ ДЛЯ BACKEND REDIRECT: /auth/google/success?email={email}&provider={provider}
 */

import React from 'react';
import { OAuthSuccess } from './OAuthSuccess';

export const GoogleOAuthSuccess: React.FC = () => {
  return <OAuthSuccess provider="google" />;
};

export default GoogleOAuthSuccess;

