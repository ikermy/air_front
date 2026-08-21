'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { App, Button, Form, Input, Switch } from 'antd';
import type { InputRef } from 'antd';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { getOrSetUserId } from '../../../utils/getOrSetUserId';
import {
  goToDashboard,
  login as loginRequest,
  persistAccessToken,
  verifyTotp,
} from './authApi';
import styles from './forms.module.css';

interface Props {
  onSwitchToRegister: () => void;
  onSwitchToRestore: () => void;
}

interface FormValues {
  email: string;
  password: string;
  remember: boolean;
}

/**
 * Вход в дашборд. Логика перенесена 1-в-1 из src/landing/auth/AuthForm.js,
 * включая двухшаговый вход с TOTP: старая форма живёт на react-router/i18next
 * и в App Router неработоспособна, но контракты бэкенда те же.
 */
export function LoginForm({ onSwitchToRegister, onSwitchToRestore }: Props) {
  const t = useTranslations('auth');
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const [submitting, setSubmitting] = useState(false);
  const [showRestoreHint, setShowRestoreHint] = useState(false);

  // Шаг подтверждения по коду из приложения-аутентификатора.
  const [totpToken, setTotpToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const totpInputRef = useRef<InputRef>(null);

  useEffect(() => {
    if (totpToken) {
      const timer = window.setTimeout(() => totpInputRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [totpToken]);

  const finishLogin = (token: string, warnings: { warn2FA: boolean; warnMasterKey: boolean }) => {
    persistAccessToken(token);
    // Дашборд в Pages Router — нужна полная загрузка документа.
    goToDashboard(warnings);
  };

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const result = await loginRequest({
        userId: getOrSetUserId(),
        email: values.email,
        password: values.password,
        auto: Boolean(values.remember),
      });

      switch (result.status) {
        case 'permit':
          finishLogin(result.token, {
            warn2FA: !result.totpEnabled,
            warnMasterKey: !result.master,
          });
          break;
        case 'totp_required':
          setTotpCode('');
          setTotpError('');
          setTotpToken(result.totpToken);
          break;
        case 'deny':
          message.warning(t('errors.deny'));
          setShowRestoreHint(true);
          break;
        case 'confirmed':
          message.warning(t('errors.notConfirmed'));
          break;
        case 'disabled':
          message.warning(t('errors.disabled'));
          break;
        default:
          message.error(t('errors.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitTotp = async (code: string) => {
    if (code.length !== 6) return;
    setTotpLoading(true);
    setTotpError('');
    try {
      const result = await verifyTotp(totpToken as string, code);
      if (result.status === 'ok') {
        finishLogin(result.token);
        // Спиннер намеренно не снимаем: идёт переход в дашборд.
        return;
      }
      setTotpError(result.message || t('totp.invalid'));
      setTotpCode('');
      window.setTimeout(() => totpInputRef.current?.focus(), 50);
    } finally {
      setTotpLoading(false);
    }
  };

  if (totpToken) {
    return (
      <div className={styles.totp}>
        <span className={styles.totpIcon} aria-hidden>
          <ShieldCheck size={24} />
        </span>

        <p className={styles.totpHint}>{t('totp.hint')}</p>

        <Input
          ref={totpInputRef}
          size="large"
          maxLength={6}
          inputMode="numeric"
          autoComplete="one-time-code"
          className={styles.totpInput}
          placeholder="000000"
          value={totpCode}
          disabled={totpLoading}
          status={totpError ? 'error' : undefined}
          aria-label={t('totp.label')}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '');
            setTotpCode(digits);
            setTotpError('');
            // Отправляем автоматически: код фиксированной длины,
            // отдельная кнопка была бы лишним действием.
            if (digits.length === 6) void submitTotp(digits);
          }}
        />

        {totpError ? (
          <p className={styles.totpError} role="alert">
            {totpError}
          </p>
        ) : null}

        <Button
          type="link"
          className={styles.totpBack}
          onClick={() => {
            setTotpToken(null);
            setTotpCode('');
            setTotpError('');
          }}
        >
          {t('totp.back')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        className={styles.form}
        initialValues={{ remember: true }}
        onFinish={onFinish}
        requiredMark={false}
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: t('validation.emailRequired') },
            { type: 'email', message: t('validation.emailInvalid') },
          ]}
        >
          <Input
            size="large"
            autoComplete="email"
            prefix={<Mail size={16} aria-hidden />}
            placeholder={t('fields.email')}
            aria-label={t('fields.email')}
          />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: t('validation.passwordRequired') }]}
        >
          <Input.Password
            size="large"
            autoComplete="current-password"
            prefix={<LockKeyhole size={16} aria-hidden />}
            placeholder={t('fields.password')}
            aria-label={t('fields.password')}
          />
        </Form.Item>

        <div className={styles.inlineRow}>
          <span className={styles.inlineLabel}>{t('fields.remember')}</span>
          <Form.Item name="remember" valuePropName="checked" noStyle>
            <Switch size="small" aria-label={t('fields.remember')} />
          </Form.Item>
        </div>

        <Form.Item noStyle>
          <Button
            block
            type="primary"
            size="large"
            htmlType="submit"
            loading={submitting}
            className={styles.submit}
          >
            {t('login.submit')}
          </Button>
        </Form.Item>
      </Form>

      <div className={styles.switcher}>
        <div className={styles.switcherRow}>
          <span>{t('login.noAccount')}</span>
          <button type="button" className={styles.link} onClick={onSwitchToRegister}>
            {t('login.toRegister')}
          </button>
        </div>
        <div className={styles.switcherRow}>
          <span>{showRestoreHint ? t('login.forgotStrong') : t('login.forgot')}</span>
          <button type="button" className={styles.link} onClick={onSwitchToRestore}>
            {t('login.toRestore')}
          </button>
        </div>
      </div>
    </>
  );
}
