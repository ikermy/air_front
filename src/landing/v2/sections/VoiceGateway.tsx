import React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Check } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { ElevenLabsIcon } from '../components/BrandIcons';
import { ELEVENLABS_DOCS_URL } from '../config/site';
import styles from './VoiceGateway.module.css';

/**
 * Отдельный акцентный блок про ElevenLabs как голосовой шлюз.
 *
 * Server Component: текст должен попадать в HTML — это смысловой блок для
 * индексации. Единственный клиентский код — Reveal (появление при скролле).
 */
const POINTS = ['voices', 'anyModel', 'realtime', 'music'] as const;

export function VoiceGateway() {
  const t = useTranslations('voicegateway');

  return (
    <section
      id="voice-gateway"
      className={`air-section ${styles.section}`}
      aria-labelledby="voice-gateway-title"
    >
      <div className="air-container">
        {/* Один Reveal на весь блок: появление совпадает с ритмом соседних
            секций, а не разбивается на две независимые анимации. */}
        <Reveal>
          <header className={styles.head}>
            <span className="air-eyebrow">{t('eyebrow')}</span>
            <h2 id="voice-gateway-title" className="air-h2">
              {t('title')}
            </h2>
            <p className={`air-lead ${styles.lead}`}>{t('lead')}</p>
          </header>

          <div className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.iconBox} aria-hidden>
                <ElevenLabsIcon size={22} />
              </span>
              {/* Имя провайдера — как в чипах TrustBar, поэтому не переводится. */}
              <span className={styles.provider}>ElevenLabs</span>
            </div>

            <ul className={styles.points}>
              {POINTS.map((id) => (
                <li key={id} className={styles.point}>
                  <Check
                    size={15}
                    strokeWidth={2.6}
                    className={styles.pointIcon}
                    aria-hidden
                  />
                  <span>{t(`points.${id}`)}</span>
                </li>
              ))}
            </ul>

            <a
              className={styles.link}
              href={ELEVENLABS_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{t('docsCta')}</span>
              <ArrowUpRight size={14} className={styles.linkIcon} aria-hidden />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
