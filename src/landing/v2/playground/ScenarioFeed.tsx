'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Bubble, ThoughtChain } from '@ant-design/x';
import type { ThoughtChainItemType } from '@ant-design/x';
import XMarkdown from '@ant-design/x-markdown';
import { Bot, Headset, PhoneCall, User } from 'lucide-react';
import { StepIcon } from './icons';
import { Artifact } from './Artifacts';
import type { EmittedStep, MessageStep, StepRole, ThoughtStep } from './types';
import styles from './ScenarioFeed.module.css';

interface Props {
  emitted: EmittedStep[];
  /** Прогон завершён: убираем индикатор «агент отвечает». */
  finished: boolean;
  reducedMotion: boolean;
}

const ROLE_ICON: Record<StepRole, React.ComponentType<{ size?: number }>> = {
  user: User,
  ai: Bot,
  operator: Headset,
  caller: PhoneCall,
};

/** Реплики клиента и оператора выравниваются по разным краям. */
const isOutgoing = (role: StepRole) => role === 'ai' || role === 'operator';

function Avatar({ role }: { role: StepRole }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className={styles.avatar} data-role={role} aria-hidden>
      <Icon size={15} />
    </span>
  );
}

/**
 * Лента диалога.
 *
 * Bubble из @ant-design/x отвечает за раскладку сообщения, но НЕ за
 * анимацию печати: посимвольный вывод уже делает движок useScenario —
 * так стриминг остаётся частью общей партитуры шагов, а не живёт
 * своей жизнью внутри компонента.
 *
 * Markdown-ответы рендерит XMarkdown с `streaming.hasNextChunk`, чтобы
 * незакрытые конструкции (**жирный, обрезанный список) не мигали
 * «сырым» синтаксисом в процессе набора.
 */
export function ScenarioFeed({ emitted, finished, reducedMotion }: Props) {
  const t = useTranslations('playground');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к последнему сообщению — внутри контейнера,
  // страница при этом не двигается.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [emitted, reducedMotion]);

  const renderMessage = (entry: EmittedStep) => {
    const step = entry.step as MessageStep;
    const text = entry.streamed;
    const outgoing = isOutgoing(step.role);

    return (
      <div
        key={step.id}
        className={styles.row}
        data-outgoing={outgoing}
        data-role={step.role}
      >
        <Bubble
          placement={outgoing ? 'end' : 'start'}
          variant={outgoing ? 'filled' : 'outlined'}
          shape="corner"
          avatar={<Avatar role={step.role} />}
          header={
            step.authorKey ? (
              <span className={styles.author}>{t(step.authorKey)}</span>
            ) : (
              <span className={styles.author}>{t(`roles.${step.role}`)}</span>
            )
          }
          classNames={{ content: styles.bubbleContent }}
          content={
            step.markdown ? (
              <XMarkdown
                content={text}
                streaming={{ hasNextChunk: !entry.done }}
                className={styles.markdown}
              />
            ) : (
              <span className={styles.plain}>
                {text}
                {/* Перебитая реплика обрывается многоточием: модель
                    замолчала на полуслове, а не закончила мысль. */}
                {step.interrupted && entry.done ? (
                  <span className={styles.cut} aria-hidden>
                    …
                  </span>
                ) : null}
                {!entry.done && !reducedMotion ? (
                  <span className={styles.caret} aria-hidden />
                ) : null}
              </span>
            )
          }
        />
      </div>
    );
  };

  const renderThought = (entry: EmittedStep) => {
    const step = entry.step as ThoughtStep;

    // Артефакт появляется только когда инструмент отработал:
    // показывать результат раньше, чем он «получен», было бы враньём.
    const showArtifact = Boolean(step.artifact) && entry.done;

    const item: ThoughtChainItemType = {
      key: step.id,
      title: t(step.titleKey),
      description: step.descKey ? t(step.descKey) : undefined,
      status: entry.done ? 'success' : 'loading',
      icon: <StepIcon name={step.icon} />,
      content:
        step.contentKey || showArtifact ? (
          <>
            {step.contentKey ? (
              <pre className={styles.toolContent}>{t(step.contentKey)}</pre>
            ) : null}
            {showArtifact && step.artifact ? (
              <Artifact artifact={step.artifact} />
            ) : null}
          </>
        ) : undefined,
      collapsible: Boolean(step.contentKey) || showArtifact,
    };

    return (
      <div key={step.id} className={styles.toolRow}>
        <ThoughtChain
          items={[item]}
          classNames={{ root: styles.chain }}
          defaultExpandedKeys={
            step.contentKey || step.artifact ? [step.id] : undefined
          }
        />
      </div>
    );
  };

  const messages = emitted.filter(
    (e) => e.step.kind === 'message' || e.step.kind === 'thought'
  );

  const events = emitted.filter((e) => e.step.kind === 'event');

  return (
    <div className={styles.wrap}>
      <div
        className={styles.feed}
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={t('feedAria')}
      >
        {messages.length === 0 ? (
          <p className={styles.placeholder}>{t('feedEmpty')}</p>
        ) : (
          messages.map((entry) =>
            entry.step.kind === 'message'
              ? renderMessage(entry)
              : renderThought(entry)
          )
        )}

        {!finished && messages.length > 0 ? (
          <div className={styles.typing} aria-hidden>
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>

      {/* Системный лог: то, что в проде писал бы air_logger. */}
      <div className={styles.log} aria-label={t('logAria')} role="status">
        <span className={styles.logTitle}>{t('logTitle')}</span>
        <ul className={styles.logList}>
          {events.length === 0 ? (
            <li className={styles.logEmpty}>{t('logEmpty')}</li>
          ) : (
            events.map((entry) => {
              const step = entry.step as Extract<
                EmittedStep['step'],
                { kind: 'event' }
              >;
              return (
                <li
                  key={step.id}
                  className={styles.logItem}
                  data-tone={step.tone ?? 'info'}
                >
                  <StepIcon name={step.icon} size={13} />
                  <span>{t(step.key)}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
