/**
 * Страница обработки успешного OAuth callback от Avito
 * Использует универсальный компонент OAuthSuccess
 *
 * МАРШРУТ ДЛЯ BACKEND REDIRECT: /auth/avito/success
 */

import React from 'react';
import { OAuthSuccess } from './OAuthSuccess';

export const AvitoOAuthSuccess: React.FC = () => {
  return <OAuthSuccess provider="avito" />;
};

export default AvitoOAuthSuccess;

