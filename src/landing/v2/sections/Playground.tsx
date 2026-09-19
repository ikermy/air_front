'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Terminal } from 'lucide-react';
import { VideoDemos } from '../playground/VideoDemos';
import styles from './Playground.module.css';

/**
 * Интерактивный демо-playground.
 *
 * Тело вынесено в отдельный чанк и грузится лениво: оно тянет
 * @ant-design/x и x-markdown — самый тяжёлый JS на странице, при этом
 * секция находится далеко от первого экрана.
 *
 * Мало `dynamic()`: его чанк иначе скачивается сразу после гидратации,
 * ещё до того, как секция приблизилась к экрану. Поэтому монтируем тело
 * только когда до него остаётся ~600px — тогда @ant-design/x не попадает
 * ни в первую загрузку, ни в main-thread на старте.
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
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyInView, setBodyInView] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setBodyInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBodyInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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

        <div ref={bodyRef}>
          {bodyInView ? (
            <PlaygroundBody />
          ) : (
            <div className={styles.skeleton} aria-hidden />
          )}
        </div>

        <VideoDemos />
      </div>
    </section>
  );
}

export default Playground;
