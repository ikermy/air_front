'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Bot,
  CalendarClock,
  Check,
  Contact,
  Headset,
  MessageSquareCode,
  Network,
  Phone,
  PhoneOutgoing,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { AudioWave } from '../components/AudioWave';
import type { ScenarioId } from './types';
import styles from './PhasePanel.module.css';

interface Props {
  scenarioId: ScenarioId;
  phase: string | null;
  /** Секция во вьюпорте: вне его анимации выключаются. */
  active: boolean;
}

/** Фазы, на которых уместна живая звуковая волна. */
const WAVE_PHASES = new Set(['connected', 'dialing']);

/**
 * Чек-лист настройки Lead Hunter.
 *
 * Порядок повторяет реальные экраны дашборда
 * (dashboard/steps/Services/LeadHunter/): контакты → боты → прокси →
 * расписание → модель с целью. Это и есть весь предварительный сетап,
 * после которого сервис работает сам.
 */
const LEAD_SETUP: { id: string; icon: LucideIcon }[] = [
  { id: 'contacts', icon: Contact },
  { id: 'bots', icon: Bot },
  { id: 'proxy', icon: Network },
  { id: 'schedule', icon: CalendarClock },
  { id: 'model', icon: Target },
];

/** Сколько пунктов чек-листа уже «горит» на каждой фазе. */
const LEAD_PROGRESS: Record<string, number> = {
  configuring: 5,
  working: 5,
  goal: 5,
};

function PhaseIcon({ scenarioId, phase }: { scenarioId: ScenarioId; phase: string }) {
  let Icon: LucideIcon = Phone;

  if (scenarioId === 'lead') Icon = phase === 'goal' ? Target : Bot;
  else if (scenarioId === 'widget') Icon = MessageSquareCode;
  else if (scenarioId === 'outbound') Icon = PhoneOutgoing;
  else if (phase === 'handoff') Icon = Headset;

  return (
    <span className={styles.iconBox} aria-hidden>
      <Icon size={17} />
    </span>
  );
}

/**
 * Визуальная панель фазы: звонок, настройка Lead Hunter, сайт с виджетом.
 *
 * Рисуется разметкой и CSS — без картинок, поэтому корректно
 * перекрашивается под обе темы и масштабируется на любой ширине.
 */
export function PhasePanel({ scenarioId, phase, active }: Props) {
  const t = useTranslations('playground');

  if (!phase) {
    return (
      <div className={styles.panel} data-idle="true">
        <span className={styles.idle}>{t('phases.idle')}</span>
      </div>
    );
  }

  const showWave = WAVE_PHASES.has(phase);
  const isLead = scenarioId === 'lead';
  const isWidget = scenarioId === 'widget';
  const litCount = LEAD_PROGRESS[phase] ?? 0;

  return (
    <div className={styles.panel} data-phase={phase}>
      <div className={styles.head}>
        <PhaseIcon scenarioId={scenarioId} phase={phase} />

        <span className={styles.meta}>
          <span className={styles.phaseName}>{t(`phases.${phase}`)}</span>
          <span className={styles.phaseHint}>{t(`phaseHints.${phase}`)}</span>
        </span>

        <span
          className={styles.pulse}
          data-live={active && phase !== 'summary'}
          aria-hidden
        />
      </div>

      {/* Lead Hunter: конфигурация сервиса. */}
      {isLead ? (
        <ul className={styles.setup}>
          {LEAD_SETUP.map((item, index) => {
            const Icon = item.icon;
            const lit = index < litCount;
            return (
              <li key={item.id} className={styles.setupItem} data-lit={lit}>
                <span className={styles.setupIcon} aria-hidden>
                  {lit ? <Check size={12} /> : <Icon size={12} />}
                </span>
                <span className={styles.setupText}>
                  <span className={styles.setupName}>
                    {t(`leadSetup.${item.id}.name`)}
                  </span>
                  <span className={styles.setupValue}>
                    {t(`leadSetup.${item.id}.value`)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Виджет: мокап страницы сайта клиента. */}
      {isWidget ? (
        <div className={styles.site} aria-hidden>
          <div className={styles.siteBar}>
            <span className={styles.siteDots}>
              <i />
              <i />
              <i />
            </span>
            <span className={styles.siteUrl}>{t('widgetMock.url')}</span>
          </div>

          <div className={styles.sitePage}>
            <span className={styles.siteTitle}>{t('widgetMock.title')}</span>
            <span className={styles.siteLine} data-w="90" />
            <span className={styles.siteLine} data-w="70" />
            <div className={styles.siteCards}>
              <span className={styles.siteCard} />
              <span className={styles.siteCard} />
              <span className={styles.siteCard} />
            </div>

            <span className={styles.siteBubble} data-live={active}>
              <MessageSquareCode size={14} />
            </span>
          </div>
        </div>
      ) : null}

      {showWave ? (
        <div className={styles.wave}>
          <AudioWave bars={22} active={active} />
        </div>
      ) : null}
    </div>
  );
}
