'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Задержка каскада, мс */
  delay?: number;
  as?: 'div' | 'li' | 'section';
}

/**
 * Появление при скролле на IntersectionObserver + CSS-переходе.
 * Намеренно без motion/framer: анимация тривиальная, а тянуть рантайм
 * анимационной библиотеки ради fade-in — лишние килобайты на LCP-пути.
 * motion остаётся для сложных сцен (схема архитектуры, playground).
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect(); // одноразово: обратно не прячем
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`air-reveal ${className}`}
      data-visible={visible}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
