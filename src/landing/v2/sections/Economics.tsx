import React from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Coins,
  Cpu,
  Database,
  Gauge,
  KeyRound,
  Network,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { PRICE_MONTHLY_USD, LICENSE } from '../config/site';
import styles from './Economics.module.css';

/**
 * «Честная экономика $1» — ключевой конверсионный блок, идёт ПЕРЕД Pricing.
 *
 * Тезис: доллар покрывает ресурсы сервера и труд разработчика, но НЕ AI-токены —
 * их пользователь оплачивает провайдеру напрямую своими ключами (BYOK).
 * Отсюда вывод: при открытом коде наценку негде спрятать.
 *
 * Server Component: текст целиком уходит в HTML, для поисковых роботов
 * это самый содержательный блок страницы.
 */

const COVERED = [
  { id: 'server', Icon: Cpu },
  { id: 'traffic', Icon: Network },
  { id: 'storage', Icon: Database },
  { id: 'dev', Icon: Wrench },
] as const;

const DIRECT = [
  { id: 'keys', Icon: KeyRound },
  { id: 'tokens', Icon: Coins },
  { id: 'models', Icon: SlidersHorizontal },
  { id: 'limits', Icon: Gauge },
] as const;

export function Economics() {
  const t = useTranslations('economics');

  return (
    <section className={`air-section ${styles.section}`} id="economics">
      <div className="air-container">
        <Reveal>
          <header className={styles.head}>
            <span className="air-eyebrow">
              <ScanSearch size={13} aria-hidden />
              {t('eyebrow')}
            </span>
            <h2 className="air-h2">{t('title')}</h2>
            <p className="air-lead">{t('lead')}</p>
          </header>
        </Reveal>

        <div className={styles.columns}>
          {/* Что покрывает подписка */}
          <Reveal delay={60}>
            <article className={`${styles.column} ${styles.columnIncluded}`}>
              <div className={styles.columnHead}>
                <span className={styles.price}>
                  <span className={styles.priceValue}>
                    ${PRICE_MONTHLY_USD}
                  </span>
                  <span className={styles.priceUnit}>/ mo</span>
                </span>
                <div>
                  <h3 className={styles.columnTitle}>{t('covered.title')}</h3>
                  <p className={styles.columnCaption}>{t('covered.caption')}</p>
                </div>
              </div>

              <ul className={styles.list}>
                {COVERED.map(({ id, Icon }) => (
                  <li key={id} className={styles.item}>
                    <span className={styles.itemIcon} aria-hidden>
                      <Icon size={17} />
                    </span>
                    <div className={styles.itemBody}>
                      <h4 className={styles.itemTitle}>
                        {t(`covered.${id}.title`)}
                      </h4>
                      <p className={styles.itemText}>
                        {t(`covered.${id}.text`)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          {/* Что уходит провайдеру мимо нас */}
          <Reveal delay={120}>
            <article className={`${styles.column} ${styles.columnDirect}`}>
              <div className={styles.columnHead}>
                <span className={styles.byok} aria-hidden>
                  BYOK
                </span>
                <div>
                  <h3 className={styles.columnTitle}>{t('direct.title')}</h3>
                  <p className={styles.columnCaption}>{t('direct.caption')}</p>
                </div>
              </div>

              <ul className={styles.list}>
                {DIRECT.map(({ id, Icon }) => (
                  <li key={id} className={styles.item}>
                    <span
                      className={`${styles.itemIcon} ${styles.itemIconGo}`}
                      aria-hidden
                    >
                      <Icon size={17} />
                    </span>
                    <div className={styles.itemBody}>
                      <h4 className={styles.itemTitle}>
                        {t(`direct.${id}.title`)}
                      </h4>
                      <p className={styles.itemText}>
                        {t(`direct.${id}.text`)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>

        {/* Формула — «консольный остров»: тёмный в обеих темах */}
        <Reveal delay={160}>
          <div className={styles.formula}>
            <span className={styles.formulaLabel}>{t('formula.label')}</span>
            <div className={styles.formulaRows}>
              <p className={styles.formulaRow}>
                <ArrowRight size={14} aria-hidden />
                {t('formula.platform')}
              </p>
              <p className={styles.formulaRow}>
                <ArrowRight size={14} aria-hidden />
                {t('formula.tokens')}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Вывод: открытый код делает наценку и доступ к данным проверяемыми */}
        <Reveal delay={200}>
          <aside className={styles.proof}>
            <span className={styles.proofIcon} aria-hidden>
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3 className={styles.proofTitle}>{t('proof.title')}</h3>
              <p className={styles.proofText}>{t('proof.text')}</p>
              <span className={styles.proofBadge}>{LICENSE} License</span>
            </div>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
