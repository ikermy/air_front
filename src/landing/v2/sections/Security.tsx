import React from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Check,
  Cog,
  Database,
  Github,
  KeyRound,
  Lock,
  MessageSquare,
  Plug,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Reveal } from '../components/Reveal';
import { GITHUB_ORG } from '../config/site';
import styles from './Security.module.css';
import {VscWorkspaceTrusted} from "react-icons/vsc";
import {TbAuth2Fa} from "react-icons/tb";

/**
 * Развёртка тезиса о приватности — Server Component.
 *
 * Схема шифрования рисуется разметкой и inline SVG, а не картинкой:
 * так она адаптивна, ретина-независима и сама перекрашивается под тему.
 *
 * Ключи берутся из messages/<locale>/security.json (namespace `security`).
 */

/** Шаги «пути данных»: MasterKey → KDF → AES-GCM → хранилище. */
const FLOW = [
  { id: 'step1', Icon: KeyRound },
  { id: 'step2', Icon: Cog },
  { id: 'step3', Icon: Lock },
  { id: 'step4', Icon: Database },
] as const;

/**
 * Примеры шифруемых данных — именно ПРИМЕРЫ, а не перечень.
 * Фактически шифруются любые сохраняемые в БД пользовательские данные,
 * поэтому главный тезис вынесен отдельной строкой над списком:
 * закрытый список из трёх пунктов читался бы как «а остальное лежит открытым».
 */
const ENCRYPTED = [
  { id: 'keys', Icon: KeyRound },
  { id: 'tokens', Icon: Plug },
  { id: 'dialogs', Icon: MessageSquare },
  { id: '2fa', Icon: TbAuth2Fa },
] as const;

/**
 * Что стирается по кнопке в дашборде. Список сжат: в интерфейсе
 * пунктов больше, но лендингу важна полнота гарантии, а не реестр таблиц.
 */
const ERASED = ['models', 'channels', 'dialogs', 'profile'] as const;

export function Security() {
  const t = useTranslations('security');

  return (
    <section
      id="security"
      className={`air-section ${styles.section}`}
      aria-labelledby="security-title"
    >
      <div className="air-container">
        <Reveal>
          <header className={styles.head}>
            <span className="air-eyebrow">
              <ShieldCheck size={13} aria-hidden />
              {t('eyebrow')}
            </span>
            <h2 id="security-title" className="air-h2">
              {t('title')}
            </h2>
            <p className={`air-lead ${styles.lead}`}>{t('lead')}</p>
          </header>
        </Reveal>

        <div className={styles.grid}>
          {/* ---------- Консольная панель со схемой ---------- */}
          <Reveal className={styles.panelCell}>
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <span className={styles.dots} aria-hidden>
                  <span className={styles.dot} data-tone="a" />
                  <span className={styles.dot} data-tone="b" />
                  <span className={styles.dot} data-tone="c" />
                </span>
                <span className={styles.panelTitle}>{t('panelTitle')}</span>
                <span className={styles.panelBadge}>AES-GCM</span>
              </div>

              <div className={styles.panelBody}>
                <h3 className={styles.flowTitle}>{t('flowTitle')}</h3>

                {/*
                  Графическая часть схемы. Текст шагов ниже — настоящий,
                  поэтому здесь достаточно одной текстовой альтернативы,
                  а сами глифы скрыты от скринридера.
                */}
                <div
                  className={styles.pipeline}
                  role="img"
                  aria-label={t('diagramAlt')}
                >
                  {FLOW.map(({ id, Icon }, i) => (
                    <React.Fragment key={id}>
                      {i > 0 && (
                        <span className={styles.link} aria-hidden>
                          <svg
                            className={styles.linkSvg}
                            viewBox="0 0 64 12"
                            preserveAspectRatio="none"
                            focusable="false"
                          >
                            <line
                              className={styles.linkLine}
                              x1="0"
                              y1="6"
                              x2="54"
                              y2="6"
                            />
                            <polyline
                              className={styles.linkArrow}
                              points="50,2 56,6 50,10"
                            />
                          </svg>
                        </span>
                      )}

                      <span className={styles.node} aria-hidden>
                        <span className={styles.nodeGlow} />
                        <Icon size={19} strokeWidth={1.9} />
                      </span>
                    </React.Fragment>
                  ))}
                </div>

                <ol className={styles.steps}>
                  {FLOW.map(({ id }, i) => (
                    <li key={id} className={styles.step}>
                      <span className={styles.stepIndex} aria-hidden>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className={styles.stepText}>
                        <span className={styles.stepTitle}>
                          {t(`flow.${id}.title`)}
                        </span>
                        <span className={styles.stepDesc}>
                          {t(`flow.${id}.desc`)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </Reveal>

          {/* ---------- Что шифруется: рядом со схемой ---------- */}
          <div className={styles.aside}>
            <Reveal delay={70} className={styles.wideCell}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>{t('encryptedTitle')}</h3>
                <p className={styles.cardDesc}>{t('encryptedLead')}</p>

                <span className={styles.examplesLabel}>
                  {t('encryptedExamples')}
                </span>

                <ul className={styles.encList}>
                  {ENCRYPTED.map(({ id, Icon }) => (
                    <li key={id} className={styles.encItem}>
                      <span className={styles.encIcon} aria-hidden>
                        <Icon size={16} strokeWidth={1.9} />
                      </span>
                      <span className={styles.encText}>
                        {t(`encrypted.${id}`)}
                      </span>
                      <Lock
                        size={13}
                        className={styles.encLock}
                        aria-hidden
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          {/* ---------- Ряд карточек под схемой ----------
              Раньше все карточки стояли одной колонкой справа и уходили
              гораздо ниже панели, оставляя под ней пустоту. Три карточки
              вынесены в полноширинный ряд и тянутся на равную высоту. */}
          <div className={styles.wide}>
            {/* Логирование: тезис намеренно РАЗДЕЛЯЕТ события и содержимое.
                Без этого различения читатель сопоставит его с air_logger
                в схеме экосистемы и решит, что диалоги всё-таки пишутся. */}
            <Reveal delay={100} className={styles.wideCell}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>
                  <ScrollText
                    size={17}
                    className={styles.cardTitleIcon}
                    aria-hidden
                  />
                  {t('loggingTitle')}
                </h3>
                <p className={styles.cardDesc}>{t('loggingDesc')}</p>

                <dl className={styles.logGrid}>
                  <div className={styles.logCol} data-tone="yes">
                    <dt className={styles.logHead}>{t('loggingYesTitle')}</dt>
                    <dd className={styles.logText}>{t('loggingYes')}</dd>
                  </div>
                  <div className={styles.logCol} data-tone="no">
                    <dt className={styles.logHead}>{t('loggingNoTitle')}</dt>
                    <dd className={styles.logText}>{t('loggingNo')}</dd>
                  </div>
                </dl>
              </div>
            </Reveal>

            {/* Право на удаление данных: продолжение тезиса о контроле —
                не только никто не читает ваши данные, но и вы решаете,
                когда им перестать существовать. */}
            <Reveal delay={130} className={styles.wideCell}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>
                  <Trash2
                    size={17}
                    className={styles.cardTitleIcon}
                    aria-hidden
                  />
                  {t('eraseTitle')}
                </h3>
                <p className={styles.cardDesc}>{t('eraseDesc')}</p>

                <span className={styles.examplesLabel}>
                  {t('eraseItemsLabel')}
                </span>

                <ul className={styles.eraseList}>
                  {ERASED.map((id) => (
                    <li key={id} className={styles.eraseItem}>
                      <Check
                        size={14}
                        className={styles.eraseCheck}
                        aria-hidden
                      />
                      {t(`erase.${id}`)}
                    </li>
                  ))}
                </ul>

                <p className={styles.eraseNote}>{t('eraseNote')}</p>
              </div>
            </Reveal>

            <Reveal delay={160} className={styles.wideCell}>
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>
                  <VscWorkspaceTrusted
                      size={17}
                      className={styles.cardTitleIcon}
                      aria-hidden
                  />
                  {t('verifyTitle')}
                </h3>
                <p className={styles.cardDesc}>{t('verifyDesc')}</p>
                <a
                  className={styles.verifyLink}
                  href={GITHUB_ORG}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github size={16} aria-hidden />
                  <span>{t('verifyCta')}</span>
                  <ArrowUpRight
                    size={15}
                    className={styles.verifyArrow}
                    aria-hidden
                  />
                </a>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Предупреждение о потере MasterKey — отдельной строкой под всей
            сеткой: это оговорка ко всему блоку, а не к одной карточке. */}
        <Reveal delay={190}>
          <p className={styles.note}>
            <ShieldAlert size={17} className={styles.noteIcon} aria-hidden />
            <span className={styles.noteText}>{t('note')}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export default Security;
