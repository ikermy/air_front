'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './AuthModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  closeLabel: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Модальное окно над лендингом: затемнение с размытием, крестик в углу,
 * закрытие по Esc и клику по подложке.
 *
 * Рендерится порталом в document.body — иначе `backdrop-filter` секции
 * и её `transform`/`filter` создали бы новый содержащий блок, и окно
 * позиционировалось бы относительно секции, а не вьюпорта.
 */
export function AuthModal({
  open,
  onClose,
  title,
  subtitle,
  badge,
  closeLabel,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      // Focus-trap: без него Tab уводит на фон под модалкой.
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const nodes = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    // Блокируем прокрутку фона, компенсируя ширину скроллбара,
    // иначе страница дёргается по горизонтали в момент открытия.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    document.addEventListener('keydown', handleKeyDown, true);

    const focusTimer = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 40);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      window.clearTimeout(focusTimer);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        // Именно mousedown на самой подложке: click срабатывал бы и тогда,
        // когда выделение текста началось внутри окна и закончилось снаружи.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X size={18} aria-hidden />
        </button>

        <div className={styles.header}>
          {badge ? <span className={styles.badge}>{badge}</span> : null}
          <h2 id="auth-modal-title" className={styles.title}>
            {title}
          </h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}
