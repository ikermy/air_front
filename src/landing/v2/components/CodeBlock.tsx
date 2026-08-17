'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from './CodeBlock.module.css';

interface Props {
  /** Исходный текст. Копируется именно он, а не отрендеренная разметка. */
  code: string;
  /** Подпись языка в шапке блока. */
  language?: string;
  /** Заголовок блока, например «Быстрый старт». */
  label?: string;
  /** Подписи кнопки приходят снаружи — компонент остаётся переиспользуемым
   *  и не привязан к конкретному i18n-неймспейсу. */
  copyLabel?: string;
  copiedLabel?: string;
  /** Декоративный `$` перед строками. На копирование не влияет. */
  showPrompt?: boolean;
}

/**
 * «Консольный остров»: тёмный в обеих темах (см. .air-console в globals.css).
 *
 * Единственный клиентский кусок секции «Архитектура» — ради копирования.
 * Копируем сырой пропс `code`, поэтому декоративный prompt не попадает
 * в буфер обмена.
 */
export function CodeBlock({
  code,
  language = 'bash',
  label,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  showPrompt = true,
}: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const markCopied = useCallback(() => {
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleCopy = useCallback(async () => {
    // Clipboard API доступен только в защищённом контексте (https/localhost).
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        markCopied();
        return;
      }
    } catch {
      /* нет прав или незащищённый контекст — уходим в фолбэк */
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      markCopied();
    } catch {
      /* копирование недоступно — текст всё равно можно выделить руками */
    }
  }, [code, markCopied]);

  const lines = code.split('\n');

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        {label ? <span className={styles.label}>{label}</span> : null}
        <span className={styles.lang}>{language}</span>

        <button
          type="button"
          onClick={handleCopy}
          className={styles.copyBtn}
          data-copied={copied}
        >
          {copied ? (
            <Check size={14} aria-hidden />
          ) : (
            <Copy size={14} aria-hidden />
          )}
          <span>{copied ? copiedLabel : copyLabel}</span>
        </button>
      </div>

      <pre className={styles.pre}>
        <code>
          {lines.map((line, i) => (
            // Порядок строк статичен, индекс в ключе безопасен.
            <span className={styles.line} key={i}>
              {showPrompt && line ? (
                <span className={styles.prompt} aria-hidden>
                  $
                </span>
              ) : null}
              <span className={styles.cmd}>{line}</span>
            </span>
          ))}
        </code>
      </pre>

      {/* Ответ для скринридера: визуально смена подписи кнопки видна, озвучить её нужно отдельно. */}
      <span aria-live="polite" className="air-sr-only">
        {copied ? copiedLabel : ''}
      </span>
    </div>
  );
}
