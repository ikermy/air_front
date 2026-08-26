'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from 'antd';
import { CheckCircle2, Github, Sparkles, Wallet } from 'lucide-react';
import { HeroVisual } from './HeroVisual';
import { useAuthModal } from '../auth/AuthModalContext';
import { GITHUB_ORG } from '../config/site';
import styles from './Hero.module.css';
import {HeroGitStat} from "./HeroGitStat";

/**
 * Текст первого экрана всё равно приходит в HTML: клиентские
 * компоненты в App Router тоже рендерятся на сервере, поэтому SEO не страдает.
 * 'use client' нужен ради openAuth: CTA открывает модалку, а не ведёт на страницу.
 */
export function Hero() {
  const t = useTranslations('hero');
  const tc = useTranslations('cta');
  const { openAuth } = useAuthModal();

  return (
    <section className={styles.hero} id="top">
      <div className={styles.mesh} aria-hidden />
      <div className="air-grid-bg" aria-hidden />

      <div className={`air-container ${styles.grid}`}>
        <div className={styles.copy}>
          <span className={styles.badge}>
            <Sparkles size={13} className={styles.badgeIcon} aria-hidden />
            {t('eyebrow')}
          </span>

          {/* Ровно один h1 на странице */}
          <h1 className={`air-h1 ${styles.title}`}>
            {t('titleLine1')}{' '}
            <span className={styles.titleAccent}>{t('titleAccent')}</span>
          </h1>

          <p className={styles.subtitle}>{t('titleLine2')}</p>

          <p className={`air-lead ${styles.lead}`}>{t('lead')}</p>

          <div className={styles.economics}>
            <Wallet size={17} className={styles.economicsIcon} aria-hidden />
            <p className={styles.economicsText}>{t('leadStrong')}</p>
          </div>

          <div className={styles.actions}>
            <Button
              type="primary"
              size="large"
              onClick={() => openAuth('register')}
              className={styles.primaryBtn}
            >
              {tc('tryFree')}
            </Button>
            <Button
              size="large"
              href={GITHUB_ORG}
              target="_blank"
              rel="noopener noreferrer"
              icon={<Github size={17} />}
              className={styles.ghostBtn}
            >
              {tc('selfHost')}
            </Button>
          </div>

          <div className={styles.assurances}>
            <span className={styles.assurance}>
              <CheckCircle2
                size={15}
                className={styles.assuranceIcon}
                aria-hidden
              />
              {t('noCard')}
            </span>
            <span className={styles.assurance}>
              <CheckCircle2
                size={15}
                className={styles.assuranceIcon}
                aria-hidden
              />
              {t('openSource')}
            </span>
          </div>
        </div>

        <div className={styles.visual}>
          <HeroVisual />
          <div className={styles.gitStat}>
            <HeroGitStat />
          </div>
        </div>
      </div>
    </section>
  );
}
