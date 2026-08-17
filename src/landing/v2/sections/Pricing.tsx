'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from 'antd';
import { Check, Github, HeartHandshake, Server, Tags } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { useAuthModal } from '../auth/AuthModalContext';
import {
  GITHUB_ORG,
  LICENSE,
  PRICE_MONTHLY_USD,
  TRIAL_DAYS,
} from '../config/site';
import styles from './Pricing.module.css';

/**
 * Тарифы: Self-Hosted (Free) · Cloud Standard ($1/мес) · Поддержать проект.
 *
 * Карта поддержки намеренно не выглядит как тариф с ценой: это добровольный
 * взнос, который не даёт дополнительных возможностей. Смешение с подпиской
 * создало бы и юридическую, и продуктовую путаницу.
 */
export function Pricing() {
  const t = useTranslations('pricing');
  const { openAuth } = useAuthModal();

  const selfHosted = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const;
  const cloud = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const;
  const support = ['f1', 'f2', 'f3', 'f4'] as const;

  return (
    <section className={`air-section ${styles.section}`} id="pricing">
      <div className="air-container">
        <Reveal>
          <header className={styles.head}>
            <span className="air-eyebrow">
              <Tags size={13} aria-hidden />
              {t('eyebrow')}
            </span>
            <h2 className="air-h2">{t('title')}</h2>
            <p className="air-lead">{t('lead')}</p>
          </header>
        </Reveal>

        <div className={styles.grid}>
          {/* --- Self-Hosted --- */}
          <Reveal delay={60}>
            <article className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.planIcon} aria-hidden>
                  <Github size={18} />
                </span>
                <h3 className={styles.planName}>{t('selfHosted.name')}</h3>
                <p className={styles.planDesc}>{t('selfHosted.description')}</p>
              </div>

              <p className={styles.priceRow}>
                <span className={styles.priceValue}>$0</span>
                <span className={styles.priceUnit}>{t('forever')}</span>
              </p>

              <ul className={styles.features}>
                {selfHosted.map((key) => (
                  <li key={key} className={styles.feature}>
                    <Check size={15} className={styles.check} aria-hidden />
                    <span>{t(`selfHosted.${key}`, { license: LICENSE })}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="large"
                block
                href={GITHUB_ORG}
                target="_blank"
                rel="noopener noreferrer"
                icon={<Github size={16} />}
                className={styles.cardBtn}
              >
                {t('selfHosted.cta')}
              </Button>
            </article>
          </Reveal>

          {/* --- Cloud Standard: рекомендованный --- */}
          <Reveal delay={120}>
            <article className={`${styles.card} ${styles.cardFeatured}`}>
              <span className={styles.ribbon}>{t('recommended')}</span>

              <div className={styles.cardHead}>
                <span
                  className={`${styles.planIcon} ${styles.planIconAccent}`}
                  aria-hidden
                >
                  <Server size={18} />
                </span>
                <h3 className={styles.planName}>{t('cloud.name')}</h3>
                <p className={styles.planDesc}>{t('cloud.description')}</p>
              </div>

              <p className={styles.priceRow}>
                <span className={styles.priceValue}>${PRICE_MONTHLY_USD}</span>
                <span className={styles.priceUnit}>{t('perMonth')}</span>
              </p>

              <ul className={styles.features}>
                {cloud.map((key) => (
                  <li key={key} className={styles.feature}>
                    <Check size={15} className={styles.check} aria-hidden />
                    <span>{t(`cloud.${key}`, { days: TRIAL_DAYS })}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="primary"
                size="large"
                block
                onClick={() => openAuth('register')}
                className={styles.cardBtn}
              >
                {t('cloud.cta', { days: TRIAL_DAYS })}
              </Button>
            </article>
          </Reveal>

          {/* --- Поддержка: не тариф, а добровольный взнос --- */}
          <Reveal delay={180}>
            <article className={`${styles.card} ${styles.cardSupport}`}>
              <div className={styles.cardHead}>
                <span className={styles.planIcon} aria-hidden>
                  <HeartHandshake size={18} />
                </span>
                <h3 className={styles.planName}>{t('support.name')}</h3>
                <p className={styles.planDesc}>{t('support.description')}</p>
              </div>

              <p className={styles.priceRow}>
                <span className={styles.priceAny}>{t('anyAmount')}</span>
                <span className={styles.priceUnit}>{t('voluntary')}</span>
              </p>

              <ul className={styles.features}>
                {support.map((key) => (
                  <li key={key} className={styles.feature}>
                    <Check size={15} className={styles.check} aria-hidden />
                    <span>{t(`support.${key}`)}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="large"
                block
                href="#support"
                icon={<HeartHandshake size={16} />}
                className={styles.cardBtn}
              >
                {t('support.cta')}
              </Button>
            </article>
          </Reveal>
        </div>

        <Reveal delay={220}>
          <p className={styles.note}>{t('note')}</p>
        </Reveal>
      </div>
    </section>
  );
}
