import React from 'react';
import { useTranslations } from 'next-intl';
import { AudioLines, Check, KeyRound, Radar, ShieldCheck } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import styles from './ValueProps.module.css';

/**
 * Ключевые преимущества — Server Component.
 * Текст приходит в HTML: это основной смысловой блок для индексации.
 * Единственный клиентский код — Reveal (появление при скролле).
 */

const CARDS = [
  { id: 'encryption', Icon: ShieldCheck },
  { id: 'realtime', Icon: AudioLines },
  { id: 'leads', Icon: Radar },
  { id: 'byok', Icon: KeyRound },
] as const;

const POINTS = ['a', 'b', 'c'] as const;

export function ValueProps() {
  const t = useTranslations('features');

  return (
    <section
      id="features"
      className={`air-section ${styles.section}`}
      aria-labelledby="features-title"
    >
      <div className="air-container">
        <Reveal>
          <header className={styles.head}>
            <span className="air-eyebrow">{t('eyebrow')}</span>
            <h2 id="features-title" className="air-h2">
              {t('title')}
            </h2>
            <p className={`air-lead ${styles.lead}`}>{t('lead')}</p>
          </header>
        </Reveal>

        <ul className={styles.grid}>
          {CARDS.map(({ id, Icon }, i) => (
            <Reveal as="li" key={id} delay={i * 70}>
              <article className={styles.card}>
                <span className={styles.iconBox} aria-hidden>
                  <Icon size={22} strokeWidth={1.9} />
                </span>

                <span className={styles.tag}>{t(`${id}.tag`)}</span>

                <h3 className={styles.cardTitle}>{t(`${id}.title`)}</h3>
                <p className={styles.cardDesc}>{t(`${id}.desc`)}</p>

                <ul className={styles.points}>
                  {POINTS.map((p) => (
                    <li key={p} className={styles.point}>
                      <Check
                        size={15}
                        strokeWidth={2.6}
                        className={styles.pointIcon}
                        aria-hidden
                      />
                      <span>{t(`${id}.points.${p}`)}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
