/**
 * Универсальная страница обработки успешного OAuth callback
 * Эта страница открывается в popup окне после успешной авторизации
 * Отправляет результат в родительское окно через postMessage и закрывается
 *
 * МАРШРУТЫ ДЛЯ BACKEND REDIRECT:
 * - /auth/google/success?email={email}&provider={provider}
 * - /auth/avito/success
 *
 * Параметры определяются провайдером:
 * Google: email, provider
 * Avito: автоматическая авторизация без дополнительных параметров
 */

import React, { useEffect } from 'react';
import { Spin, Result } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './OAuthCallback.css';

interface OAuthSuccessProps {
  provider: 'google' | 'avito' | string;
}

export const OAuthSuccess: React.FC<OAuthSuccessProps> = ({ provider }) => {
  const { t } = useTranslation();

  useEffect(() => {
    console.log(`[${provider.toUpperCase()} OAuth Success] Страница загружена`);

    // Получаем параметры из URL
    const urlParams = new URLSearchParams(window.location.search);

    // Подготовка данных в зависимости от провайдера
    let messageData: any = {
      type: `${provider}_oauth_success`,
      success: true,
      provider: provider
    };

    // Специфичные параметры для каждого провайдера
    if (provider === 'google') {
      const email = urlParams.get('email');
      const modelProvider = urlParams.get('provider');
      messageData.email = email;
      messageData.modelProvider = modelProvider;
      console.log(`[${provider.toUpperCase()} OAuth Success] Email:`, email, 'Provider:', modelProvider);
    } else if (provider === 'avito') {
      // Для Avito можно добавить дополнительные параметры, если нужно
      console.log(`[${provider.toUpperCase()} OAuth Success] Авторизация успешна`);
    }

    // Отправляем сообщение в родительское окно
    if (window.opener && !window.opener.closed) {
      console.log(`[${provider.toUpperCase()} OAuth Success] Отправляем postMessage в родительское окно`);

      window.opener.postMessage(messageData, window.location.origin);

      // Закрываем окно через 2 секунды
      setTimeout(() => {
        console.log(`[${provider.toUpperCase()} OAuth Success] Закрываем окно`);
        window.close();
      }, 2000);
    } else {
      console.warn(`[${provider.toUpperCase()} OAuth Success] Родительское окно не найдено`);

      // Если нет родительского окна, редиректим на главную страницу
      setTimeout(() => {
        const params = new URLSearchParams(messageData);
        window.location.href = `/?${params.toString()}`;
      }, 2000);
    }
  }, [provider]);

  // Получаем заголовок и подзаголовок в зависимости от провайдера
  const getTitle = (): string => {
    const key = `${provider}OAuthSuccessTitle`;
    return t(key) || t('oauthSuccessTitle') || `${provider.toUpperCase()} аккаунт успешно подключён!`;
  };

  const getSubtitle = (): string => {
    const key = `${provider}OAuthSuccessSubtitle`;
    return t(key) || t('oauthSuccessSubtitle') || 'Это окно автоматически закроется через несколько секунд...';
  };

  return (
    <div className="oauth-callback-container">
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title={getTitle()}
        subTitle={getSubtitle()}
        extra={
          <Spin size="large" />
        }
      />
    </div>
  );
};

export default OAuthSuccess;

