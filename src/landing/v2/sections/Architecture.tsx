import React from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Boxes,
  Bot,
  Database,
  Github,
  Headset,
  LayoutTemplate,
  Library,
  MessageCircle,
  MonitorSmartphone,
  PhoneCall,
  Radar,
  ScrollText,
  ShoppingBag,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { CodeBlock } from '../components/CodeBlock';
import { GITHUB_ORG, SERVICES, type ServiceMeta } from '../config/site';
import styles from './Architecture.module.css';

/** Порядок слоёв сверху вниз: от ядра к инфраструктуре. */
const LAYERS = ['core', 'channel', 'service', 'infra'] as const;
type Layer = (typeof LAYERS)[number];

/** Иконка на узел. Ключ — id сервиса из SERVICES. */
const ICONS: Record<string, LucideIcon> = {
  air_common: Library,
  air_orchestrator: Boxes,
  air_tgbot: Bot,
  air_tguserbot: PhoneCall,
  air_whatsbot: MessageCircle,
  air_widget: LayoutTemplate,
  air_avito: ShoppingBag,
  air_operator: Headset,
  'air_lead-hunter': Radar,
  air_payment: Wallet,
  marusia_crm: Database,
  air_front: MonitorSmartphone,
  air_logger: ScrollText,
};

/**
 * ИЛЛЮСТРАЦИЯ, а не инструкция.
 *
 * У каждого сервиса свой dev.yml и свои переменные окружения, поэтому
 * обещать универсальный «запуск в две команды» нельзя: такое обещание
 * гарантированно устареет. Блок показывает только форму запуска,
 * а за актуальными командами отправляем в README конкретного репозитория.
 */
const QUICKSTART = `docker network create air_shared
docker compose -f dev.yml up -d`;

/**
 * Схема экосистемы.
 *
 * Осознанно Server Component: все 12 узлов и их описания приходят в HTML —
 * это ровно тот текст, который должен индексироваться. Подсветка связей
 * сделана на CSS :hover/:focus-within, поэтому рантайм анимаций сюда
 * не тянется; единственный клиентский островок — CodeBlock (копирование).
 *
 * Схема рисуется разметкой + CSS, без картинок: перекрашивается под обе
 * темы, масштабируется на любой ширине и остаётся доступной для скринридеров.
 */
export function Architecture() {
  const t = useTranslations('architecture');

  const byLayer = (layer: Layer): ServiceMeta[] =>
    SERVICES.filter((s) => s.layer === layer);

  return (
    <section
      id="architecture"
      className={`air-section ${styles.section}`}
      aria-labelledby="architecture-title"
    >
      <div className="air-grid-bg" aria-hidden />

      <div className={`air-container ${styles.inner}`}>
        <header className={styles.head}>
          <span className="air-eyebrow">{t('eyebrow')}</span>
          <h2 id="architecture-title" className="air-h2">
            {t('title')}
          </h2>
          <p className={`air-lead ${styles.lead}`}>{t('lead')}</p>
        </header>

        <div className={styles.diagram}>
          {LAYERS.map((layer, index) => (
            <div className={styles.layerWrap} key={layer}>
              {index > 0 ? (
                <div className={styles.connector} aria-hidden>
                  <span className={styles.connectorLine} />
                </div>
              ) : null}

              <section className={styles.layer} data-layer={layer}>
                <header className={styles.layerHead}>
                  <span className={styles.layerBadge}>
                    {t(`layers.${layer}.name`)}
                  </span>
                  <span className={styles.layerHint}>
                    {t(`layers.${layer}.hint`)}
                  </span>
                </header>

                <ul className={styles.nodes}>
                  {byLayer(layer).map((service) => {
                    const Icon = ICONS[service.id] ?? Boxes;

                    return (
                      <li key={service.id} className={styles.nodeItem}>
                        <a
                          className={styles.node}
                          href={service.repo}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className={styles.nodeIcon} aria-hidden>
                            <Icon size={17} />
                          </span>

                          <span className={styles.nodeBody}>
                            <span className={styles.nodeName}>
                              {service.id}
                              <ArrowUpRight
                                size={14}
                                className={styles.nodeArrow}
                                aria-hidden
                              />
                            </span>
                            <span className={styles.nodeDesc}>
                              {t(`services.${service.id}`)}
                            </span>
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          ))}
        </div>

        <div className={styles.quickstart}>
          <div className={styles.quickstartCopy}>
            <h3 className={styles.quickstartTitle}>{t('quickstart.title')}</h3>
            <p className={styles.quickstartText}>{t('quickstart.text')}</p>
            <p className={styles.quickstartNote}>{t('quickstart.note')}</p>

            {/* Команды рядом — пример, поэтому сразу даём адрес
                источника правды, чтобы их не приняли за инструкцию. */}
            <p className={styles.quickstartReadme}>{t('quickstart.readme')}</p>

            <a
              className={styles.quickstartLink}
              href={GITHUB_ORG}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={15} aria-hidden />
              <span>{t('quickstart.readmeCta')}</span>
              <ArrowUpRight size={14} aria-hidden />
            </a>
          </div>

          <CodeBlock
            code={QUICKSTART}
            language="bash"
            label={`${t('quickstart.label')} · ${t('quickstart.exampleBadge')}`}
            copyLabel={t('quickstart.copy')}
            copiedLabel={t('quickstart.copied')}
          />
        </div>
      </div>
    </section>
  );
}
