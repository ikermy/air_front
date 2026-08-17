'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { InputNumber } from 'antd';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import {
  PayPalScriptProvider,
  PayPalButtons,
} from '@paypal/react-paypal-js';
import type {
  CreateOrderActions,
  CreateOrderData,
  OnApproveActions,
  OnApproveData,
} from '@paypal/paypal-js';
import { PAYPAL_CLIENT_ID } from '../config/site';
import styles from './PayPalDonate.module.css';

/** Пресеты суммы, USD. */
const PRESETS = [3, 5, 10, 25] as const;

/** PayPal отклоняет заказы дешевле доллара. */
const MIN_AMOUNT = 1;
const DEFAULT_AMOUNT = 5;

type Status = 'idle' | 'success' | 'error';

/**
 * Донат произвольной суммы через PayPal.
 *
 * Два неочевидных решения:
 *
 * 1. ЛЕНИВЫЙ МОНТАЖ. SDK PayPal — это ~150 КБ JS плюс iframe. На первом
 *    экране его нет, поэтому провайдер монтируется только когда блок
 *    реально доехал до вьюпорта (IntersectionObserver). До этого висит
 *    плейсхолдер той же высоты — иначе появление кнопок дёрнуло бы вёрстку
 *    и испортило CLS.
 *
 * 2. СВЕТЛАЯ ПОДЛОЖКА. Кнопки рисует сам PayPal внутри iframe, наши CSS-
 *    переменные туда не проникают, и перекрасить их под тёмную тему нельзя.
 *    Поэтому под них всегда кладётся светлая карточка на брендовых
 *    theme-независимых токенах (--air-brand-pale / --air-brand-deep):
 *    в тёмной теме это выглядит как осознанный «светлый остров»,
 *    а не как случайный белый прямоугольник на графите.
 *
 * Сумма создаётся на клиенте (actions.order.create) — для пожертвования
 * это допустимо. Для платной подписки такую схему переиспользовать нельзя:
 * там сумму обязан формировать сервер.
 */
export function PayPalDonate() {
  const t = useTranslations('support');

  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [status, setStatus] = useState<Status>('idle');

  // Монтируем SDK только при появлении блока во вьюпорте.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setArmed(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setArmed(true);
          io.disconnect(); // одноразово: обратно не выгружаем
        }
      },
      { rootMargin: '200px 0px' } // небольшой запас, чтобы успел прогрузиться
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const valid = typeof amount === 'number' && amount >= MIN_AMOUNT;

  const createOrder = useCallback(
    (_data: CreateOrderData, actions: CreateOrderActions) =>
      actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount.toFixed(2),
            },
          },
        ],
      }),
    [amount]
  );

  const onApprove = useCallback(
    async (_data: OnApproveData, actions: OnApproveActions) => {
      try {
        await actions.order?.capture();
        setStatus('success');
      } catch {
        setStatus('error');
      }
    },
    []
  );

  return (
    <div className={styles.root} ref={ref}>
      {/* --- Выбор суммы --- */}
      <div className={styles.amountBlock}>
        <label className={styles.amountLabel} htmlFor="air-donate-amount">
          {t('paypal.amountLabel')}
        </label>

        <div className={styles.presets} role="group">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={styles.preset}
              data-active={amount === preset}
              aria-label={t('paypal.presetAria', { amount: preset })}
              aria-pressed={amount === preset}
              onClick={() => {
                setAmount(preset);
                setStatus('idle');
              }}
            >
              ${preset}
            </button>
          ))}
        </div>

        <InputNumber
          id="air-donate-amount"
          className={styles.input}
          value={amount}
          min={MIN_AMOUNT}
          precision={2}
          step={1}
          prefix="$"
          size="large"
          aria-label={t('paypal.amountAria')}
          onChange={(value) => {
            setAmount(typeof value === 'number' ? value : 0);
            setStatus('idle');
          }}
        />

        {!valid && (
          <p className={styles.minHint} role="alert">
            <AlertCircle size={14} aria-hidden />
            {t('paypal.minHint', { min: MIN_AMOUNT })}
          </p>
        )}
      </div>

      {/* --- Светлый остров под iframe PayPal --- */}
      <div className={styles.surface}>
        <div className={styles.slot}>
          {armed ? (
            <PayPalScriptProvider
              options={{
                clientId: PAYPAL_CLIENT_ID,
                currency: 'USD',
                intent: 'capture',
                components: 'buttons',
              }}
            >
              <PayPalButtons
                style={{ layout: 'vertical', shape: 'rect', height: 46 }}
                disabled={!valid}
                // Сумма зашита в замыкание createOrder — без переменной
                // в forceReRender кнопки продолжили бы слать старое значение.
                forceReRender={[amount]}
                createOrder={createOrder}
                onApprove={onApprove}
                onError={() => setStatus('error')}
              />
            </PayPalScriptProvider>
          ) : (
            <p className={styles.placeholder}>{t('paypal.loading')}</p>
          )}
        </div>

        <p className={styles.surfaceNote}>
          <Info size={13} aria-hidden />
          {t('paypal.surfaceNote')}
        </p>
      </div>

      {status === 'success' && (
        <p className={styles.success} role="status">
          <CheckCircle2 size={16} aria-hidden />
          {t('paypal.thanks')}
        </p>
      )}

      {status === 'error' && (
        <p className={styles.error} role="alert">
          <AlertCircle size={16} aria-hidden />
          {t('paypal.error')}
        </p>
      )}
    </div>
  );
}

export default PayPalDonate;
