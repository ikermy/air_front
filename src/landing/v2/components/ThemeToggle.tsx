'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLandingTheme } from '../theme/LandingThemeProvider';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { mode, toggle } = useLandingTheme();
  const t = useTranslations('nav');

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={t('toggleTheme')}
      title={t('toggleTheme')}
    >
      <span className={styles.track} data-mode={mode}>
        <span className={styles.thumb}>
          {mode === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
        </span>
      </span>
    </button>
  );
}
