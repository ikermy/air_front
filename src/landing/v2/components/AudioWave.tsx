'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './AudioWave.module.css';

interface Props {
  bars?: number;
  /** Внешний стоп: не анимируем то, чего не видно. */
  active?: boolean;
}

/**
 * Визуализатор аудио для hero.
 *
 * Осознанные решения:
 *  - Детерминированный сид: SSR и первый клиентский кадр совпадают,
 *    иначе React ругается на несовпадение разметки.
 *  - Никакого setInterval: один rAF-цикл с троттлингом до ~20 fps.
 *    Волна не требует 60 fps, а hero и так борется за LCP.
 *  - Анимация полностью останавливается при prefers-reduced-motion
 *    и когда компонент уходит из вьюпорта.
 */
export function AudioWave({ bars = 28, active = true }: Props) {
  const seed = React.useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const s = Math.sin(i * 1.7) * 0.5 + 0.5;
        return 18 + s * 46;
      }),
    [bars]
  );

  const [heights, setHeights] = useState<number[]>(seed);
  const [animated, setAnimated] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reduced || !active) {
      setAnimated(false);
      setHeights(seed);
      return;
    }

    setAnimated(true);
    let phase = 0;

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (now - lastRef.current < 50) return; // ~20 fps
      lastRef.current = now;
      phase += 0.32;

      setHeights(
        Array.from({ length: bars }, (_, i) => {
          const envelope = Math.sin(phase + i * 0.42);
          const detail = Math.sin(phase * 1.9 + i * 0.9) * 0.4;
          const v = (envelope + detail + 1.4) / 2.8;
          return 10 + Math.max(0, Math.min(1, v)) * 62;
        })
      );
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [bars, active, seed]);

  return (
    <div className={styles.wave} data-animated={animated} aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={styles.bar}
          style={{ height: `${Math.round(h)}%` }}
        />
      ))}
    </div>
  );
}
