import React from 'react';
import { useTranslations } from 'next-intl';
import { KeyRound } from 'lucide-react';
import { Reveal } from '../components/Reveal';
import {
  AvitoIcon,
  BybitIcon,
  CalendarIcon,
  GeminiIcon,
  MariaDbIcon,
  MinioIcon,
  MistralIcon,
  OpenAiIcon,
  SheetsIcon,
  TelegramIcon,
  WhatsAppIcon,
  WidgetIcon,
  type BrandIconProps,
} from '../components/BrandIcons';
import styles from './TrustBar.module.css';

const STATS = [
  { value: 'markupValue', label: 'markupLabel' },
  { value: 'accessValue', label: 'accessLabel' },
  { value: 'openValue', label: 'openLabel' },
  { value: 'priceValue', label: 'priceLabel' },
  { value: 'trialValue', label: 'trialLabel' },
] as const;

type Brand = { name: string; Icon: React.ComponentType<BrandIconProps> };

/** Каналы общения с клиентом и внешние сервисы. */
const CHANNELS: Brand[] = [
  { name: 'Telegram', Icon: TelegramIcon },
  { name: 'WhatsApp', Icon: WhatsAppIcon },
  { name: 'Avito', Icon: AvitoIcon },
  { name: 'Widget', Icon: WidgetIcon },
  { name: 'Google Calendar', Icon: CalendarIcon },
  { name: 'Google Sheets', Icon: SheetsIcon },
  { name: 'Bybit', Icon: BybitIcon },
  { name: 'MinIO', Icon: MinioIcon },
  { name: 'MariaDB', Icon: MariaDbIcon },
];

/**
 * AI-провайдеры вынесены в отдельную группу намеренно.
 * В общем списке они терялись, хотя несут ключевое сообщение продукта:
 * ключи ваши, наценки на токены нет.
 */
const PROVIDERS: Brand[] = [
  { name: 'OpenAI', Icon: OpenAiIcon },
  { name: 'Google Gemini', Icon: GeminiIcon },
  { name: 'Mistral', Icon: MistralIcon },
];

function BrandChip({
  brand,
  featured = false,
}: {
  brand: Brand;
  featured?: boolean;
}) {
  const { name, Icon } = brand;
  return (
    <li className={featured ? styles.chipFeatured : styles.chip}>
      <span className={styles.chipIcon} aria-hidden>
        <Icon size={17} />
      </span>
      {/* Название остаётся текстом: по одной иконке сервис не опознать. */}
      <span className={styles.chipName}>{name}</span>
    </li>
  );
}

export function TrustBar() {
  const t = useTranslations('trust');

  return (
    <section className={styles.section} aria-labelledby="trust-title">
      <div className="air-container">
        <h2 id="trust-title" className="air-sr-only">
          {t('title')}
        </h2>

        <Reveal>
          <dl className={styles.stats}>
            {STATS.map((s) => (
              <div key={s.value} className={styles.stat}>
                <dt className={styles.statValue}>{t(s.value)}</dt>
                <dd className={styles.statLabel}>{t(s.label)}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={80}>
          <p className={styles.note}>
            <KeyRound size={17} className={styles.noteIcon} aria-hidden />
            <span className={styles.noteText}>{t('note')}</span>
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div className={styles.groups}>
            {/* --- Каналы и интеграции --- */}
            <div className={styles.group}>
              <span className={styles.groupLabel}>{t('channelsTitle')}</span>
              <ul className={styles.chips}>
                {CHANNELS.map((brand) => (
                  <BrandChip key={brand.name} brand={brand} />
                ))}
              </ul>
            </div>

            {/* --- AI-провайдеры: визуально выделены --- */}
            <div className={`${styles.group} ${styles.groupProviders}`}>
              <span className={styles.groupLabel}>{t('providersTitle')}</span>
              <ul className={styles.chips}>
                {PROVIDERS.map((brand) => (
                  <BrandChip key={brand.name} brand={brand} featured />
                ))}
              </ul>
              <p className={styles.groupHint}>{t('providersHint')}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
