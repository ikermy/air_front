/**
 * Компонент Google OAuth для интеграции с Google Calendar и Sheets
 * Работает на уровне провайдера модели (openai, mistral, anthropic, google)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Switch, Spin, Alert, Tooltip } from 'antd';
import { GoogleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { showNotification, showErrorNotification } from '../../hotification/showNotification';
import {
  checkGoogleTokenStatus,
  authorizeGoogle,
  revokeGoogleToken
} from './googleOAuthUtils';
import { GoogleOAuthProps, GoogleAccountInfo } from './googleOAuthTypes';
import './GoogleOAuth.css';
import { useTranslation } from 'react-i18next';
import {CgGoogle} from "react-icons/cg";
import {FcGoogle} from "react-icons/fc";

export const GoogleOAuth: React.FC<GoogleOAuthProps> = ({
                                                          provider,
                                                          onChange,
                                                          disabled = false,
                                                          hasModel = true, // По умолчанию считаем, что модель создана
                                                          value // Значение из формы Ant Design
                                                        }) => {
  const { t } = useTranslation();
  const [googleAccount, setGoogleAccount] = useState<GoogleAccountInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [sheetsEnabled, setSheetsEnabled] = useState(false);
  const isCheckingInProgress = useRef(false); // Флаг для предотвращения одновременных запросов
  const lastCheckedProvider = useRef<string | null>(null); // Последний проверенный провайдер
  const checkStatusTimer = useRef<NodeJS.Timeout | null>(null); // Таймер для debounce
  const isMounted = useRef(true); // Флаг монтирования компонента

  // Отслеживаем размонтирование компонента
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Синхронизируем состояние из value prop (из формы)
  useEffect(() => {
    if (value && typeof value === 'object') {
      // Поддерживаем оба варианта: calendar/Calendar и sheets/Sheets
      const valueObj = value as any;
      const calendarValue = valueObj.calendar || valueObj.Calendar || false;
      const sheetsValue = valueObj.sheets || valueObj.Sheets || false;

      setCalendarEnabled(calendarValue);
      setSheetsEnabled(sheetsValue);

      // ВАЖНО: если хотя бы одно из значений true, значит Google подключен
      if (calendarValue || sheetsValue) {
        setIsEnabled(true);
      }
    } else if (value === false || !value) {
      setCalendarEnabled(false);
      setSheetsEnabled(false);
      setIsEnabled(false);
    }
  }, [value, provider]);

  // Проверка статуса подключения Google
  const checkGoogleStatus = useCallback(async () => {
    if (!provider || disabled) return;

    // Предотвращаем множественные одновременные вызовы
    if (isCheckingInProgress.current) {
      return;
    }

    // Если уже проверяли этого провайдера - пропускаем
    if (lastCheckedProvider.current === provider) {
      return;
    }

    isCheckingInProgress.current = true;
    setCheckingStatus(true);

    try {
      const result = await checkGoogleTokenStatus();

      if (result.success && result.data) {
        if (result.data.connected && result.data.google_email) {
          if (isMounted.current) {
            setGoogleAccount({
              email: result.data.google_email,
              expiry: new Date(result.data.expiry || ''),
              valid: result.data.valid || false,
              calendar_enabled: result.data.calendar_enabled,
              sheets_enabled: result.data.sheets_enabled
            });
            setIsEnabled(true);

            // Устанавливаем значения calendar и sheets из API ТОЛЬКО если они не были установлены из формы
            // Проверяем, есть ли значения из формы (value prop)
            const hasFormValues = value && typeof value === 'object';

            if (!hasFormValues) {
              // Значений из формы нет - используем данные из API
              setCalendarEnabled(result.data.calendar_enabled || false);
              setSheetsEnabled(result.data.sheets_enabled || false);
            }
            // Если есть значения из формы - не трогаем их, они уже установлены через useEffect синхронизации
          }
          // onChange НЕ вызываем при проверке статуса - только при реальных действиях пользователя
        } else {
          // Google не подключен
          if (isMounted.current) {
            setGoogleAccount(null);

            // Проверяем, есть ли значения из формы
            const hasFormValues = value && typeof value === 'object';

            if (!hasFormValues) {
              // Значений из формы нет - сбрасываем всё
              setIsEnabled(false);
              setCalendarEnabled(false);
              setSheetsEnabled(false);
            }
            // Если есть значения из формы - сохраняем их (пользователь мог настроить, но еще не подключил аккаунт)
          }
          // onChange НЕ вызываем при проверке статуса - только при реальных действиях пользователя
        }

        // Отмечаем, что проверили этого провайдера
        lastCheckedProvider.current = provider;
      } else {
        console.warn('Google OAuth: не удалось проверить статус', result.error);
      }
    } catch (error) {
      console.error('Ошибка при проверке статуса Google:', error);
    } finally {
      if (isMounted.current) {
        setInitialCheckDone(true);
        setCheckingStatus(false);
      }
      isCheckingInProgress.current = false; // Сбрасываем флаг
    }
  }, [provider, disabled, value]);

  // Проверяем статус при монтировании и изменении провайдера
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (checkStatusTimer.current) {
      clearTimeout(checkStatusTimer.current);
    }

    if (provider && !disabled) {
      // Сбрасываем отметку о проверке при смене провайдера
      lastCheckedProvider.current = null;

      // Добавляем debounce 300ms
      checkStatusTimer.current = setTimeout(() => {
        setLoading(true);
        checkGoogleStatus()
            .catch(error => {
              console.error('Error checking Google status:', error);
            })
            .finally(() => setLoading(false));
      }, 300);
    }

    // Cleanup функция
    return () => {
      if (checkStatusTimer.current) {
        clearTimeout(checkStatusTimer.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, disabled]);

  // Обработка URL параметров после OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('google_oauth') === 'success') {
      const email = urlParams.get('email');
      const callbackProvider = urlParams.get('provider');

      if (callbackProvider === provider) {
        showNotification(
            t('googleOAuthSuccess') || 'Google подключён',
            `${t('googleOAuthSuccessDesc') || 'Google аккаунт'} ${email} ${t('googleOAuthSuccessProvider') || 'успешно подключён к'} ${provider}`
        );

        // Сбрасываем кэш перед проверкой статуса
        lastCheckedProvider.current = null;

        // Обновляем статус
        checkGoogleStatus().catch(error => {
          console.error('Error checking Google status after OAuth success:', error);
        });
      }

      // Очищаем URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (urlParams.get('google_oauth') === 'error') {
      const reason = urlParams.get('reason');
      const callbackProvider = urlParams.get('provider');

      if (callbackProvider === provider) {
        showErrorNotification(
            t('googleOAuthError') || 'Ошибка подключения Google',
            `${t('googleOAuthErrorReason') || 'Причина:'} ${reason}`
        );
      }

      // Очищаем URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, t]);

  // Подключение Google аккаунта
  const handleConnect = async () => {
    if (!provider || disabled || loading) return; // Защита от повторных вызовов

    setLoading(true);

    try {
      const result = await authorizeGoogle();

      if (result.success) {
        showNotification(
            t('googleOAuthConnecting') || 'Подключение Google',
            result.message || t('googleOAuthConnectingDesc') || 'Авторизация Google успешна'
        );

        // Сбрасываем отметку, чтобы можно было проверить статус снова
        lastCheckedProvider.current = null;

        // Обновляем статус после успешной авторизации
        await checkGoogleStatus();

        // По умолчанию включаем оба сервиса при первом подключении
        setCalendarEnabled(true);
        setSheetsEnabled(true);

        const newValue = {
          calendar: true,
          sheets: true
        };

        // Уведомляем родительский компонент об изменении
        if (onChange) {
          onChange(newValue);
        }
      } else {
        showErrorNotification(
            t('googleOAuthConnectError') || 'Ошибка подключения',
            result.error || t('googleOAuthConnectErrorDesc') || 'Не удалось подключить Google аккаунт'
        );
      }
    } catch (error) {
      console.error('Ошибка при подключении Google:', error);
      showErrorNotification(
          t('error') || 'Ошибка',
          (error as Error).message
      );
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Отключение Google аккаунта
  const handleDisconnect = async () => {
    if (!provider || disabled || loading) return; // Защита от повторных вызовов

    setLoading(true);

    try {
      const result = await revokeGoogleToken();

      if (result.success) {
        if (isMounted.current) {
          setGoogleAccount(null);
          setIsEnabled(false);
          setCalendarEnabled(false);
          setSheetsEnabled(false);
        }

        // Сбрасываем отметку, чтобы можно было проверить статус снова
        lastCheckedProvider.current = null;

        // Уведомляем родительский компонент об изменении
        if (onChange) {
          onChange(false);
        }

        showNotification(
            t('googleOAuthDisconnected') || 'Google отключён',
            result.message || t('googleOAuthDisconnectedDesc') || 'Google аккаунт успешно отключён'
        );
      } else {
        showErrorNotification(
            t('googleOAuthDisconnectError') || 'Ошибка отключения',
            result.error || t('googleOAuthDisconnectErrorDesc') || 'Не удалось отключить Google аккаунт'
        );
      }
    } catch (error) {
      console.error('Ошибка при отключении Google:', error);
      showErrorNotification(
          t('error') || 'Ошибка',
          (error as Error).message
      );
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Переключение Google Calendar
  const handleCalendarToggle = (checked: boolean) => {
    if (!isEnabled) return; // Можно переключать только если Google подключен

    const newCalendarState = checked;
    const newSheetsState = sheetsEnabled;

    setCalendarEnabled(newCalendarState);

    // Если оба выключены и это было последнее подключение - нельзя выключить
    if (!newCalendarState && !newSheetsState) {
      return;
    }

    const newValue = {
      calendar: newCalendarState,
      sheets: newSheetsState
    };

    // Уведомляем родительский компонент (форму)
    if (onChange) {
      onChange(newValue);
    }
  };

  // Переключение Google Sheets
  const handleSheetsToggle = (checked: boolean) => {
    if (!isEnabled) return; // Можно переключать только если Google подключен

    const newSheetsState = checked;
    const newCalendarState = calendarEnabled;

    setSheetsEnabled(newSheetsState);

    // Если оба выключены и это было последнее подключение - нельзя выключить
    if (!newCalendarState && !newSheetsState) {
      return;
    }

    const newValue = {
      calendar: newCalendarState,
      sheets: newSheetsState
    };

    // Уведомляем родительский компонент (форму)
    if (onChange) {
      onChange(newValue);
    }
  };

  // Форматирование даты истечения
  const formatExpiry = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!provider) {
    return (
        <div className="google-oauth-container">
          <Alert
              message={t('googleOAuthNoProvider') || 'Провайдер не выбран'}
              description={t('googleOAuthNoProviderDesc') || 'Выберите провайдер AI модели для настройки интеграции с Google'}
              type="warning"
              showIcon
          />
        </div>
    );
  }

  return (
      <div className="google-oauth-container">

        <div className="section-title">
          {/* @ts-ignore - React 19 type compatibility issue with react-icons */}
          <span style={{ marginRight: 8 }}><CgGoogle /></span>
          {t('googleOAuthTitle') || 'Google Integration'}
        </div>

        <div className="google-oauth-header-row">
          <div className="section-description">
            {t("googleOAuthDesc") || "Позволяет агенту читать и записывать события в Google Calendar и работать с Google Sheets."}
          </div>
          <Tooltip
              title={!hasModel ? (t("googleOAuthNoModel") || "Сначала создайте модель") : ""}
          >
            <Switch
                checked={isEnabled}
                onChange={(checked) => {
                  if (checked) {
                    // Включаем
                    handleConnect().catch(error => {
                      console.error('Error in handleConnect:', error);
                      setIsEnabled(false);
                    });
                  } else {
                    // Выключаем
                    handleDisconnect().catch(error => {
                      console.error('Error in handleDisconnect:', error);
                    });
                  }
                }}
                loading={loading}
                disabled={disabled || !initialCheckDone || !hasModel}
                checkedChildren={<span style={{ color: 'black' }}><GoogleOutlined /></span>}
                unCheckedChildren={<span style={{ color: 'black' }}><GoogleOutlined /></span>}
            />
          </Tooltip>
        </div>

        {loading && !initialCheckDone ? (
            <div className="google-loading">
              <Spin tip={t('loading') || 'Загрузка...'} />
            </div>
        ) : (
            <>
              {checkingStatus ? (
                  <div className="google-checking-status">
                    <Spin size="small" />
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
                {t('googleOAuthCheckingStatus') || 'Проверка статуса подключения...'}
              </span>
                  </div>
              ) : (
                  <>
                    {isEnabled && googleAccount ? (
                        <div className="google-oauth-content">
                          <div className="google-connected">
                            <div className="google-info">
                              {/* @ts-ignore - React 19 type compatibility issue with react-icons */}
                              <FcGoogle className="google-icon" size={24} />
                              <div className="google-details">
                                {/*<div className="google-email">test@google.com</div>*/}
                                <div className="google-email">{googleAccount.email}</div>
                                <div className="google-status">
                                  {googleAccount.valid ? (
                                      <span className="valid">
                              <CheckCircleOutlined /> {t('googleOAuthConnected') || 'Подключено'}
                            </span>
                                  ) : null}
                                </div>
                                <div className="google-expiry">
                                  {t('googleOAuthExpires') || 'Истекает:'} {formatExpiry(googleAccount.expiry)} {t('googleOAuthAutoUpdate')}
                                </div>
                              </div>
                            </div>
                          </div>

                          {!googleAccount.valid && (
                              <Alert
                                  className="google-error"
                                  message={t('googleOAuthTokenExpiredTitle') || 'Токен истёк'}
                                  description={t('googleOAuthTokenExpiredDesc') || 'Переподключите Google аккаунт для обновления токена доступа'}
                                  type="error"
                                  showIcon
                              />
                          )}

                          {/* Переключатели для Calendar и Sheets */}
                          <div className="google-services-toggles">
                            <div className="google-service-row">
                              <div className="google-service-info">
                                <div className="google-service-name">
                                  📅 {t('googleOAuthCalendar') || 'Google Calendar'}
                                </div>
                                <div className="google-service-desc">
                                  {t('googleOAuthCalendarDesc') || 'Управление событиями календаря'}
                                </div>
                              </div>
                              <Switch
                                  checked={calendarEnabled}
                                  onChange={handleCalendarToggle}
                                  disabled={!isEnabled || disabled}
                                  checkedChildren={<span style={{color: "black"}}>{t('Yes')}</span>}
                                  unCheckedChildren={<span style={{color: "black"}}>{t('No')}</span>}
                              />
                            </div>

                            <div className="google-service-row">
                              <div className="google-service-info">
                                <div className="google-service-name">
                                  📊 {t('googleOAuthSheets') || 'Google Sheets'}
                                </div>
                                <div className="google-service-desc">
                                  {t('googleOAuthSheetsDesc') || 'Работа с таблицами и данными'}
                                </div>
                              </div>
                              <Switch
                                  checked={sheetsEnabled}
                                  onChange={handleSheetsToggle}
                                  disabled={!isEnabled || disabled}
                                  checkedChildren={<span style={{color: "black"}}>{t('Yes')}</span>}
                                  unCheckedChildren={<span style={{color: "black"}}>{t('No')}</span>}
                              />
                            </div>
                          </div>
                        </div>
                    ) : null}
                  </>
              )}
            </>
        )}
      </div>
  );
};

export default GoogleOAuth;

