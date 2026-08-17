'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Segmented, Button } from 'antd';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { PhasePanel } from './PhasePanel';
import { ScenarioFeed } from './ScenarioFeed';
import { SCENARIOS, SCENARIO_ORDER, PHASE_TABS } from './scenarios';
import { useScenario } from './useScenario';
import type { ScenarioId } from './types';
import styles from './PlaygroundBody.module.css';

/**
 * Тело playground: переключатель вкладок + движок + лента.
 *
 * Загружается лениво из Playground.tsx, поэтому весь вес
 * (@ant-design/x, x-markdown) не попадает в бандл первого экрана.
 */
export function PlaygroundBody() {
  const t = useTranslations('playground');
  const [current, setCurrent] = useState<ScenarioId>('text');
  const [active, setActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Сценарий проигрывается только когда секция видна:
  // фоновые таймеры на лендинге — это впустую сожжённый CPU.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // useTranslations возвращает новую функцию на каждый рендер,
  // поэтому в движок отдаём стабильную обёртку.
  const resolve = useCallback((key: string) => t(key), [t]);

  const scenario = SCENARIOS[current];
  const { emitted, phase, finished, progress, replay } = useScenario({
    scenario,
    active,
    resolve,
    reducedMotion,
  });

  const services = [scenario.service, ...(scenario.alsoServices ?? [])];
  const showPhase = PHASE_TABS.has(current);

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.tabsRow}>
        <Segmented<ScenarioId>
          value={current}
          onChange={setCurrent}
          className={styles.tabs}
          size="large"
          options={SCENARIO_ORDER.map((id) => ({
            value: id,
            label: (
              <span className={styles.tabLabel}>{t(`tabs.${id}.name`)}</span>
            ),
          }))}
          aria-label={t('tabsAria')}
        />
      </div>

      {/* Не .air-console: тот класс хардкодит тёмный фон в обеих темах.
          Демо показывает продуктовый интерфейс и обязано следовать теме. */}
      <div className={styles.console}>
        <div className={styles.chrome}>
          <span className={styles.dots} aria-hidden>
            <i />
            <i />
            <i />
          </span>

          <span className={styles.chromeTitle}>
            {services.map((s) => (
              <code key={s} className={styles.service}>
                {s}
              </code>
            ))}
          </span>

          {/* Честная пометка: это заранее записанный сценарий. */}
          <span className={styles.demoBadge}>
            <FlaskConical size={12} aria-hidden />
            {t('demoBadge')}
          </span>
        </div>

        <div className={styles.progress} aria-hidden>
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>

        <div className={styles.body} data-with-phase={showPhase}>
          <div className={styles.feedCol}>
            <ScenarioFeed
              emitted={emitted}
              finished={finished}
              reducedMotion={reducedMotion}
            />
          </div>

          {showPhase ? (
            <div className={styles.sideCol}>
              <PhasePanel
                scenarioId={current}
                phase={phase}
                active={active && !finished}
              />
            </div>
          ) : null}
        </div>

        <div className={styles.footer}>
          <p className={styles.caption}>{t(`tabs.${current}.desc`)}</p>

          <Button
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={replay}
            className={styles.replay}
            disabled={!finished}
          >
            {t('replay')}
          </Button>
        </div>
      </div>

      <p className={styles.disclaimer}>{t('disclaimer')}</p>
    </div>
  );
}

export default PlaygroundBody;
