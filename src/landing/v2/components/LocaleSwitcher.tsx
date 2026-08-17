'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Dropdown } from 'antd';
import { Globe } from 'lucide-react';
import { usePathname, useRouter } from '../../../i18n/navigation';
import { localeNames, routing, type Locale } from '../../../i18n/routing';
import styles from './LocaleSwitcher.module.css';

const SHORT: Record<Locale, string> = { ru: 'RU', en: 'EN', es: 'ES' };

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectedKeys: [locale],
        items: routing.locales.map((l) => ({
          key: l,
          label: localeNames[l],
          onClick: () => router.replace(pathname, { locale: l }),
        })),
      }}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-label={t('changeLanguage')}
      >
        <Globe size={15} aria-hidden />
        <span>{SHORT[locale]}</span>
      </button>
    </Dropdown>
  );
}
