'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Info, Mic, PhoneOutgoing } from 'lucide-react';
import styles from './VideoDemos.module.css';

/**
 * Реальные записи работы агента.
 *
 * Показываются после интерактивной симуляции (PlaygroundBody) как отдельный
 * доверительный блок: вкладки выше — детерминированный сценарий, а это —
 * настоящий прогон агента, сохранённый в файл.
 *
 * АВТОВОСПРОИЗВЕДЕНИЕ ЗАПРЕЩЕНО намеренно:
 *  - проигрывание само по себе сжигало бы трафик посетителя;
 *  - звук «сам по себе» на лендинге пугает и выглядит как баг;
 *  - автоплей противоречит prefers-reduced-motion.
 * Поэтому только `controls`: видео стартует строго по нажатию пользователя,
 * а `preload="metadata"` не даёт браузеру скачивать файл целиком до play.
 */
const DEMOS = [
  {
    id: 'modelRealtime',
    src: '/video/model_realtime.webm',
    icon: Mic,
  },
  {
    id: 'voiceCall',
    src: '/video/voice_call.webm',
    icon: PhoneOutgoing,
  },
] as const;

export function VideoDemos() {
  const t = useTranslations('playground');

  return (
    <div className={styles.root}>
      <header className={styles.head}>
        <span className="air-eyebrow">{t('videos.eyebrow')}</span>
        <h3 id="video-demos-title" className={styles.title}>
          {t('videos.title')}
        </h3>
        <p className={`air-lead ${styles.lead}`}>{t('videos.lead')}</p>
      </header>

      <div className={styles.grid}>
        {DEMOS.map((d) => {
          const Icon = d.icon;
          return (
            <figure key={d.id} className={styles.card}>
              <video
                className={styles.video}
                controls
                playsInline
                preload="metadata"
                aria-label={t(`videos.${d.id}.aria`)}
              >
                <source src={d.src} type="video/webm" />
              </video>

              <figcaption className={styles.caption}>
                <strong className={styles.cardTitle}>
                  <Icon size={15} aria-hidden />
                  {t(`videos.${d.id}.title`)}
                </strong>
                <span>{t(`videos.${d.id}.caption`)}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {/* Почему это видео, а не живой вызов — на видном месте, как дисклеймер
          в Support.tsx, а не мелким шрифтом. */}
      <aside className={styles.why}>
        <Info size={16} className={styles.whyIcon} aria-hidden />
        <div className={styles.whyBody}>
          <strong>{t('videos.whyTitle')}</strong>
          <p>{t('videos.whyBody')}</p>
        </div>
      </aside>

      <p className={styles.note}>{t('videos.note')}</p>
    </div>
  );
}

export default VideoDemos;
