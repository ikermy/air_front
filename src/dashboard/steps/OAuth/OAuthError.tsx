/**
 * Универсальная страница обработки ошибки OAuth callback
 * Эта страница открывается в popup окне при ошибке авторизации
 * Отправляет информацию об ошибке в родительское окно через postMessage и закрывается
 *
 * МАРШРУТЫ ДЛЯ BACKEND REDIRECT:
 * - /auth/google/error?reason={reason}&provider={provider}
 * - /auth/avito/error?reason={reason}
 *
 * Параметры:
 * - reason: Код ошибки (save-failed, exchange-failed, missing-params, и т.д.)
 * - provider: Провайдер модели (для Google: openai, mistral, anthropic, google)
 *
 * Общие коды ошибок (reason):
 * - save-failed: Не удалось сохранить токен
 * - exchange-failed: Ошибка обмена кода
 * - missing-params: Отсутствуют обязательные параметры
 * - invalid-state: Неверный state параметр
 * - access-denied: Пользователь отклонил доступ
 * - user-not-found: Пользователь не найден
 *
 * Google специфичные коды:
 * - empty-email: Google не вернул email
 * - state-mismatch: Несовпадение state (CSRF)
 * - no-code: Нет кода авторизации
 * - invalid-provider: Неверный провайдер
 * - token-save-error: Ошибка сохранения в БД
 * - userinfo-failed: Не удалось получить userinfo от Google
 * - decode-failed: Ошибка декодирования данных
 */

import React, { useEffect } from 'react';
import { Spin, Result, Typography } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './OAuthCallback.css';

const { Paragraph } = Typography;

type ErrorMessages = {
  [key: string]: string;
};

interface OAuthErrorProps {
  provider: 'google' | 'avito' | string;
}

export const OAuthError: React.FC<OAuthErrorProps> = ({ provider }) => {
  const { t } = useTranslation();

  useEffect(() => {
    console.log(`[${provider.toUpperCase()} OAuth Error] Страница загружена`);

    // Получаем параметры из URL
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason');
    const modelProvider = urlParams.get('provider'); // Для Google

    console.log(`[${provider.toUpperCase()} OAuth Error] Reason:`, reason, 'Provider:', modelProvider);

    // Подготовка данных сообщения
    const messageData: any = {
      type: `${provider}_oauth_error`,
      success: false,
      error: reason,
      reason: reason,
      provider: provider
    };

    if (provider === 'google' && modelProvider) {
      messageData.modelProvider = modelProvider;
    }

    // Отправляем сообщение в родительское окно
    if (window.opener && !window.opener.closed) {
      console.log(`[${provider.toUpperCase()} OAuth Error] Отправляем postMessage в родительское окно`);

      window.opener.postMessage(messageData, window.location.origin);

      // Закрываем окно через 3 секунды (больше времени для чтения ошибки)
      setTimeout(() => {
        console.log(`[${provider.toUpperCase()} OAuth Error] Закрываем окно`);
        window.close();
      }, 3000);
    } else {
      console.warn(`[${provider.toUpperCase()} OAuth Error] Родительское окно не найдено`);

      // Если нет родительского окна, редиректим на главную страницу
      setTimeout(() => {
        const params = new URLSearchParams(messageData);
        window.location.href = `/?${params.toString()}`;
      }, 3000);
    }
  }, [provider]);

  // Получаем читаемое описание ошибки
  const getErrorDescription = (): string => {
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason');

    // Общие сообщения об ошибках
    const commonErrorMessages: ErrorMessages = {
      'save-failed': t('oauthErrorSaveFailed') || 'Не удалось сохранить токен.',
      'exchange-failed': t('oauthErrorExchangeFailed') || 'Ошибка обмена кода авторизации. Попробуйте еще раз.',
      'missing-params': t('oauthErrorMissingParams') || 'Отсутствуют обязательные параметры.',
      'invalid-state': t('oauthErrorInvalidState') || 'Неверный state параметр.',
      'access-denied': t('oauthErrorAccessDenied') || 'Вы отклонили запрос на доступ.',
      'user-not-found': t('oauthErrorUserNotFound') || 'Пользователь не найден.',
    };

    // Специфичные сообщения для Google
    const googleErrorMessages: ErrorMessages = {
      'empty-email': t('googleOAuthErrorEmptyEmail') || 'Google не предоставил email адрес. Проверьте права доступа.',
      'state-mismatch': t('googleOAuthErrorStateMismatch') || 'Несовпадение state параметра. Возможна попытка CSRF атаки.',
      'no-code': t('googleOAuthErrorNoCode') || 'Код авторизации не был получен от Google.',
      'invalid-provider': t('googleOAuthErrorInvalidProvider') || 'Неверный провайдер модели.',
      'token-save-error': t('googleOAuthErrorTokenSaveError') || 'Ошибка сохранения токена в базу данных.',
      'userinfo-failed': t('googleOAuthErrorUserinfoFailed') || 'Не удалось получить информацию о пользователе от Google.',
      'decode-failed': t('googleOAuthErrorDecodeFailed') || 'Ошибка декодирования данных от Google.'
    };

    // Специфичные сообщения для Avito
    const avitoErrorMessages: ErrorMessages = {
      'token-exchange-failed': t('avitoOAuthErrorTokenExchangeFailed') || 'Не удалось обменять код на токен Avito.',
      'api-error': t('avitoOAuthErrorApiError') || 'Ошибка API Avito.',
    };

    // Объединяем сообщения в зависимости от провайдера
    let errorMessages: ErrorMessages = { ...commonErrorMessages };

    if (provider === 'google') {
      errorMessages = { ...errorMessages, ...googleErrorMessages };
    } else if (provider === 'avito') {
      errorMessages = { ...errorMessages, ...avitoErrorMessages };
    }

    // Проверяем, есть ли специфичное сообщение для провайдера
    const providerSpecificKey = `${provider}OAuthError${reason?.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('')}`;

    const providerSpecificMessage = t(providerSpecificKey);
    if (providerSpecificMessage && providerSpecificMessage !== providerSpecificKey) {
      return providerSpecificMessage;
    }

    // Возвращаем сообщение об ошибке
    return errorMessages[reason || ''] || `${t('oauthErrorUnknown') || 'Неизвестная ошибка'}: ${reason}`;
  };

  // Получаем заголовок в зависимости от провайдера
  const getTitle = (): string => {
    const key = `${provider}OAuthErrorTitle`;
    const translated = t(key);
    if (translated && translated !== key) {
      return translated;
    }
    return t('oauthErrorTitle') || `Ошибка подключения ${provider.toUpperCase()}`;
  };

  // Получаем подзаголовок
  const getSubtitle = (): string => {
    const key = `${provider}OAuthErrorSubtitle`;
    const translated = t(key);
    if (translated && translated !== key) {
      return translated;
    }
    return t('oauthErrorSubtitle') || 'Это окно автоматически закроется через несколько секунд...';
  };

  return (
    <div className="oauth-callback-container">
      <Result
        status="error"
        icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
        title={getTitle()}
        subTitle={
          <Paragraph>
            {getErrorDescription()}
            <br />
            <br />
            {getSubtitle()}
          </Paragraph>
        }
        extra={
          <Spin size="large" />
        }
      />
    </div>
  );
};

export default OAuthError;

