import { ImageResponse } from 'next/og';
import { PRICE_MONTHLY_USD, TRIAL_DAYS, LICENSE } from '../src/landing/v2/config/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'AiR — Open Source AI agent platform';

/**
 * OG-превью, генерируемое на лету.
 *
 * Файл лежит в КОРНЕ app/, а не в app/[locale]/, намеренно.
 * При localePrefix: 'as-needed' русская локаль живёт на `/`, поэтому
 * вариант внутри [locale] давал для неё адрес `/ru/opengraph-image`,
 * который middleware отдавал как 307-редирект на `/`. Краулеры соцсетей
 * редирект на HTML вместо картинки не разворачивают — превью ломалось
 * именно на основной, русской версии. Один файл в корне каскадно
 * применяется ко всем локалям и отдаётся по стабильному `/opengraph-image`.
 *
 * Текст латиницей и одинаков для всех языков: satori рисует только
 * переданными шрифтами, а встроенный набор не гарантирует кириллицу —
 * локализованный заголовок мог бы выпасть в «квадраты». Бренд, цифры
 * и палитра узнаваемы без перевода.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#121212',
          padding: '72px 80px',
          position: 'relative',
        }}
      >
        {/* Лаймовое свечение — фирменный акцент проекта */}
        <div
          style={{
            position: 'absolute',
            top: -220,
            right: -140,
            width: 620,
            height: 620,
            borderRadius: 620,
            background:
              'radial-gradient(circle, rgba(200,251,119,0.22), rgba(18,18,18,0))',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 16,
              border: '2px solid #c8fb77',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 18,
                background: '#c8fb77',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 42, fontWeight: 700, color: '#ffffff' }}>
              AiR
            </span>
            <span style={{ fontSize: 24, color: '#8ac51e' }}>/ marusia_ai</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 62,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Open Source AI agents
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 62,
              fontWeight: 700,
              color: '#c8fb77',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Privacy. Realtime voice.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 27,
              color: '#b9c4b2',
              marginTop: 6,
            }}
          >
            Telegram · WhatsApp · Avito · Bring your own API keys
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          {[
            `$${PRICE_MONTHLY_USD}/mo — infrastructure only`,
            `${TRIAL_DAYS} days free`,
            `${LICENSE} License`,
            '0% token markup',
          ].map((chip) => (
            <div
              key={chip}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 20px',
                borderRadius: 999,
                border: '1px solid #2a3326',
                background: '#181c17',
                color: '#d7e3d0',
                fontSize: 21,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
