'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Download, FileText, Sheet } from 'lucide-react';
import type { StepArtifact } from './types';
import styles from './Artifacts.module.css';

/**
 * Результаты вызова инструментов, показанные наглядно.
 *
 * Всё рисуется разметкой и inline-SVG: растровых ассетов в проекте нет,
 * а тащить их ради демо означало бы лишние сетевые запросы и мороку
 * с ретиной и двумя темами. SVG масштабируется, красится токенами и
 * ничего не весит.
 */

/**
 * Стилизованный котик — результат инструмента «генерация изображения».
 *
 * Геометрия намеренно простая: это иллюстрация работы инструмента,
 * а не попытка выдать SVG за вывод диффузионной модели.
 */
function CatImage() {
  const t = useTranslations('playground');

  return (
    <figure className={styles.imageCard}>
      <div className={styles.imageFrame}>
        <svg
          viewBox="0 0 200 160"
          className={styles.catSvg}
          role="img"
          aria-label={t('artifacts.catAlt')}
        >
          {/* Фон-виньетка */}
          <defs>
            <radialGradient id="air-cat-bg" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="var(--air-brand)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--air-brand)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="200" height="160" fill="url(#air-cat-bg)" />

          {/* Хвост */}
          <path
            d="M139 118c18 2 26-8 24-20-2-11-14-13-18-5-3 6 2 11 8 8"
            className={styles.catStroke}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Туловище */}
          <path
            d="M64 124c-4-20 4-34 36-34s40 14 36 34z"
            className={styles.catBody}
          />

          {/* Голова */}
          <circle cx="100" cy="72" r="30" className={styles.catBody} />

          {/* Уши */}
          <path d="M76 52l-4-20 21 11z" className={styles.catBody} />
          <path d="M124 52l4-20-21 11z" className={styles.catBody} />
          <path d="M78 50l-2-11 11 6z" className={styles.catEar} />
          <path d="M122 50l2-11-11 6z" className={styles.catEar} />

          {/* Глаза */}
          <ellipse cx="89" cy="70" rx="4.6" ry="6.4" className={styles.catEye} />
          <ellipse cx="111" cy="70" rx="4.6" ry="6.4" className={styles.catEye} />

          {/* Нос и рот */}
          <path d="M97 83h6l-3 3.4z" className={styles.catNose} />
          <path
            d="M100 87v3m0 0c-1.6 2.6-5.4 2.6-7 0m7 0c1.6 2.6 5.4 2.6 7 0"
            className={styles.catStroke}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Усы */}
          <g className={styles.catStroke} strokeWidth="1.6" strokeLinecap="round">
            <path d="M84 84H66M84 89l-17 4" />
            <path d="M116 84h18M116 89l17 4" />
          </g>
        </svg>
      </div>

      <figcaption className={styles.imageCaption}>
        {t('artifacts.catCaption')}
      </figcaption>
    </figure>
  );
}

/**
 * Карточка отправленного файла.
 * Имя и размер приходят из шага — файл у каждого сценария свой.
 */
function PriceFile({ valuesKey }: { valuesKey: string }) {
  const t = useTranslations('playground');

  return (
    <div className={styles.fileCard}>
      <span className={styles.fileIcon} aria-hidden>
        <FileText size={17} />
      </span>
      <span className={styles.fileMeta}>
        <span className={styles.fileName}>{t(`${valuesKey}.name`)}</span>
        <span className={styles.fileSize}>{t(`${valuesKey}.size`)}</span>
      </span>
      <span className={styles.fileAction} aria-hidden>
        <Download size={15} />
      </span>
    </div>
  );
}

/**
 * Строка, добавленная в Google Sheets.
 *
 * Заголовки колонок общие (Клиент / Запрос / Статус), а значения —
 * из шага: иначе таблица противоречит диалогу, в котором открыта.
 */
function SheetRow({ valuesKey }: { valuesKey: string }) {
  const t = useTranslations('playground');

  return (
    <div className={styles.sheetCard}>
      <span className={styles.sheetHead}>
        <Sheet size={14} aria-hidden />
        {t('artifacts.sheetTitle')}
      </span>
      <table className={styles.sheetTable}>
        <thead>
          <tr>
            <th>{t('artifacts.sheetCol1')}</th>
            <th>{t('artifacts.sheetCol2')}</th>
            <th>{t('artifacts.sheetCol3')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t(`${valuesKey}.client`)}</td>
            <td>{t(`${valuesKey}.item`)}</td>
            <td>{t(`${valuesKey}.status`)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Artifact({ artifact }: { artifact: StepArtifact }) {
  if (artifact.kind === 'catImage') return <CatImage />;
  if (artifact.kind === 'priceFile')
    return <PriceFile valuesKey={artifact.valuesKey} />;
  if (artifact.kind === 'sheetRow')
    return <SheetRow valuesKey={artifact.valuesKey} />;
  return null;
}
