'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { App, Button, Form, Input, Switch } from 'antd';
import { CheckCircle2, LockKeyhole, Mail, User } from 'lucide-react';
import { getOrSetUserId } from '../../../utils/getOrSetUserId';
import { register as registerRequest } from './authApi';
import styles from './forms.module.css';

interface Props {
  onSwitchToLogin: () => void;
}

interface FormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptPolicy: boolean;
  demo: boolean;
}

/**
 * Регистрация. Правила пароля и порядок запросов повторяют
 * src/landing/auth/RegForm.js: сначала check-email (он же отдаёт ключ
 * шифрования), затем register с зашифрованным паролем.
 */
export function RegisterForm({ onSwitchToLogin }: Props) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const validatePassword = (_: unknown, value: string) => {
    if (!value) return Promise.reject(new Error(t('validation.passwordRequired')));
    if (value.length < 6) return Promise.reject(new Error(t('validation.passwordShort')));
    if (!/[A-Z]/.test(value)) return Promise.reject(new Error(t('validation.passwordCapital')));
    if (!/[0-9]/.test(value)) return Promise.reject(new Error(t('validation.passwordDigit')));
    return Promise.resolve();
  };

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const result = await registerRequest({
        userId: getOrSetUserId(),
        name: values.name,
        email: values.email,
        password: values.password,
        demo: Boolean(values.demo),
        language: locale,
      });

      switch (result.status) {
        case 'ok':
          setDone(true);
          break;
        case 'email-exists':
          // Ошибку показываем на поле, а не тостом: пользователю
          // нужно исправить конкретный ввод.
          form.setFields([
            { name: 'email', errors: [t('validation.emailExists')] },
          ]);
          break;
        default:
          message.error(t('errors.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={styles.done}>
        <span className={styles.doneIcon} aria-hidden>
          <CheckCircle2 size={26} />
        </span>
        <p className={styles.doneText}>{t('register.done')}</p>
        <Button type="primary" size="large" block className={styles.submit} onClick={onSwitchToLogin}>
          {t('register.toLogin')}
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
        initialValues={{ acceptPolicy: false, demo: true }}
        onFinish={onFinish}
        requiredMark={false}
      >
        <Form.Item
          name="name"
          rules={[
            { required: true, message: t('validation.nameRequired') },
            { pattern: /^[a-zA-Zа-яА-ЯёЁ\- ]+$/, message: t('validation.nameSymbols') },
          ]}
        >
          <Input
            size="large"
            autoComplete="name"
            prefix={<User size={16} aria-hidden />}
            placeholder={t('fields.name')}
            aria-label={t('fields.name')}
          />
        </Form.Item>

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

        <Form.Item name="password" rules={[{ validator: validatePassword }]}>
          <Input.Password
            size="large"
            autoComplete="new-password"
            prefix={<LockKeyhole size={16} aria-hidden />}
            placeholder={t('fields.newPassword')}
            aria-label={t('fields.newPassword')}
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: t('validation.confirmRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error(t('validation.passwordMismatch')));
              },
            }),
          ]}
        >
          <Input.Password
            size="large"
            autoComplete="new-password"
            prefix={<LockKeyhole size={16} aria-hidden />}
            placeholder={t('fields.confirmPassword')}
            aria-label={t('fields.confirmPassword')}
          />
        </Form.Item>

        <div className={styles.consent}>
          <Form.Item
            name="acceptPolicy"
            valuePropName="checked"
            noStyle
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('validation.policyRequired'))),
              },
            ]}
          >
            <Switch size="small" aria-label={t('register.policyAria')} />
          </Form.Item>
          <span className={styles.consentText}>
            {t('register.policyPrefix')}{' '}
            <a
              className={styles.policyLink}
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('register.policyLink')}
            </a>
          </span>
        </div>

        {/* Ошибка согласия рендерится скрытым полем, иначе Switch без
            обёртки Form.Item не показывает сообщение валидации. */}
        <Form.Item shouldUpdate noStyle>
          {() => {
            const error = form.getFieldError('acceptPolicy')[0];
            return error ? (
              <p className={styles.totpError} role="alert">
                {error}
              </p>
            ) : null;
          }}
        </Form.Item>

        <div className={styles.consent}>
          <Form.Item name="demo" valuePropName="checked" noStyle>
            <Switch size="small" aria-label={t('register.demoAria')} />
          </Form.Item>
          <span className={styles.consentText}>{t('register.demo')}</span>
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
            {t('register.submit')}
          </Button>
        </Form.Item>
      </Form>

      <div className={styles.switcher}>
        <div className={styles.switcherRow}>
          <span>{t('register.haveAccount')}</span>
          <button type="button" className={styles.link} onClick={onSwitchToLogin}>
            {t('register.toLogin')}
          </button>
        </div>
      </div>
    </>
  );
}
