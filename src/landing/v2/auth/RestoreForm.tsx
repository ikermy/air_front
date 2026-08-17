'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { App, Button, Form, Input } from 'antd';
import { CheckCircle2, Mail } from 'lucide-react';
import { getOrSetUserId } from '../../../utils/getOrSetUserId';
import { requestPasswordReset } from './authApi';
import styles from './forms.module.css';

interface Props {
  onSwitchToLogin: () => void;
}

interface FormValues {
  email: string;
}

/** Восстановление пароля — контракт /v1/auth/reset-password/request не менялся. */
export function RestoreForm({ onSwitchToLogin }: Props) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [done, setDone] = useState(false);

  const onFinish = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const result = await requestPasswordReset({
        userId: getOrSetUserId(),
        email: values.email,
        language: locale,
      });

      switch (result.status) {
        case 'exist':
          setDone(true);
          break;
        case 'not':
          form.setFields([{ name: 'email', errors: [t('validation.emailUnknown')] }]);
          break;
        case 'rate-limited':
          form.setFields([{ name: 'email', errors: [t('validation.tooManyRequests')] }]);
          // Придерживаем кнопку, чтобы пользователь не долбил эндпоинт.
          setCooldown(true);
          window.setTimeout(() => setCooldown(false), 5000);
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
        <p className={styles.doneText}>{t('restore.done')}</p>
        <Button type="primary" size="large" block className={styles.submit} onClick={onSwitchToLogin}>
          {t('restore.toLogin')}
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

        <Form.Item noStyle>
          <Button
            block
            type="primary"
            size="large"
            htmlType="submit"
            loading={submitting}
            disabled={cooldown}
            className={styles.submit}
          >
            {t('restore.submit')}
          </Button>
        </Form.Item>
      </Form>

      <div className={styles.switcher}>
        <div className={styles.switcherRow}>
          <span>{t('restore.remembered')}</span>
          <button type="button" className={styles.link} onClick={onSwitchToLogin}>
            {t('restore.toLogin')}
          </button>
        </div>
      </div>
    </>
  );
}
