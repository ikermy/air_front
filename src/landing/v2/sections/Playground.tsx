'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Terminal } from 'lucide-react';
import styles from './Playground.module.css';

/**
 * Интерактивный демо-playground.
 *
 * Тело вынесено в отдельный чанк и грузится лениво: оно тянет
 * @ant-design/x и x-markdown — самый тяжёлый JS на странице, при этом
 * секция находится далеко от первого экрана.
 *
 * ssr: false осознанно. Содержимое ленты анимировано и меняется во
 * времени, серверный HTML для него не имеет смысла, а SEO-нагрузку
 * несут заголовок и описание — они остаются в разметке секции.
 * Скелет ровно той же высоты, что и реальное тело, поэтому подмена
 * не вызывает сдвига вёрстки (CLS).
 */
const PlaygroundBody = dynamic(
  () => import('../playground/PlaygroundBody').then((m) => m.PlaygroundBody),
  {
    ssr: false,
    loading: () => <div className={styles.skeleton} aria-hidden />,
  }
);

export function Playground() {
  const t = useTranslations('playground');

  return (
    <section
      id="playground"
      className={`air-section ${styles.section}`}
      aria-labelledby="playground-title"
    >
      <div className="air-grid-bg" aria-hidden />

      <div className={`air-container ${styles.inner}`}>
        <header className={styles.head}>
          <span className="air-eyebrow">
            <Terminal size={13} aria-hidden />
            {t('eyebrow')}
          </span>

          <h2 id="playground-title" className="air-h2">
            {t('title')}
          </h2>

          <p className={`air-lead ${styles.lead}`}>{t('lead')}</p>
        </header>

        <PlaygroundBody />
      </div>
    </section>
  );
}

export default Playground;
