import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Bitcoin,
  Github,
  Heart,
  Info,
  MessageSquareWarning,
  Share2,
  Star,
} from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { PayPalDonate } from '../components/PayPalDonate';
import { CryptoDonation } from '../components/CryptoDonation';
import { GITHUB_ORG } from '../config/site';
import styles from './Support.module.css';

/**
 * Добровольная поддержка проекта.
 *
 * Секция намеренно отделена от тарифов: пожертвование не даёт никаких
 * дополнительных возможностей, и смешивать его с подпиской нельзя —
 * это создало бы и юридическую, и продуктовую путаницу. Поэтому
 * disclaimer вынесен на видное место, а не спрятан мелким шрифтом.
 *
 * JSON-LD здесь не размечается сознательно: Google принял бы сумму
 * пожертвования за цену продукта и испортил сниппет.
 *
 * Server Component: интерактив изолирован в PayPalDonate.
 */
export function Support() {
  const t = useTranslations('support');

  const helpItems = [
    { key: 'star', icon: Star, href: GITHUB_ORG },
    { key: 'issue', icon: MessageSquareWarning, href: `${GITHUB_ORG}/air_orchestrator/issues` },
    { key: 'share', icon: Share2, href: null },
  ] as const;

  return (
    <section className={`air-section ${styles.section}`} id="support">
      <div className="air-container">
        <Reveal>
          <header className={styles.head}>
            <span className="air-eyebrow">
              <Heart size={13} aria-hidden />
              {t('eyebrow')}
            </span>
            <h2 className="air-h2">{t('title')}</h2>
            <p className="air-lead">{t('lead')}</p>
          </header>
        </Reveal>

        <div className={styles.grid}>
          {/* --- PayPal --- */}
          <Reveal delay={60}>
            <article className={`${styles.card} ${styles.cardPrimary}`}>
              <div className={styles.cardHead}>
                <span className={`${styles.icon} ${styles.iconAccent}`} aria-hidden>
                  <Heart size={18} />
                </span>
                <div>
                  <h3 className={styles.cardTitle}>{t('paypal.title')}</h3>
                  <p className={styles.cardHint}>{t('paypal.hint')}</p>
                </div>
              </div>

              <PayPalDonate />
            </article>
          </Reveal>

          <div className={styles.side}>
            {/* --- Криптовалюта: ждёт доработки air_payment --- */}
            <Reveal delay={120}>
              <article className={`${styles.card} ${styles.cardMuted}`}>
                <div className={styles.cardHead}>
                  <span className={styles.icon} aria-hidden>
                    <Bitcoin size={18} />
                  </span>
                  <div>
                    <h3 className={styles.cardTitle}>
                      {t('crypto.title')}
                    </h3>
                    <p className={styles.cardHint}>{t('crypto.hint')}</p>
                  </div>
                </div>

                <CryptoDonation label={t('crypto.pay')} />
              </article>
            </Reveal>

            {/* --- Помощь без денег --- */}
            <Reveal delay={180}>
              <article className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.icon} aria-hidden>
                    <Github size={18} />
                  </span>
                  <h3 className={styles.cardTitle}>{t('other.title')}</h3>
                </div>

                <ul className={styles.helpList}>
                  {helpItems.map(({ key, icon: Icon, href }) => (
                    <li key={key} className={styles.helpItem}>
                      <Icon size={15} className={styles.helpIcon} aria-hidden />
                      {href ? (
                        <a
                          className={styles.helpLink}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t(`other.${key}`)}
                        </a>
                      ) : (
                        <span>{t(`other.${key}`)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </div>
        </div>

        {/* Юридически обязательная оговорка — на видном месте, не петитом */}
        <Reveal delay={220}>
          <p className={styles.disclaimer}>
            <Info size={15} className={styles.disclaimerIcon} aria-hidden />
            <span>{t('disclaimer')}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default Support;
