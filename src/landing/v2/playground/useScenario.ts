'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EmittedStep, Scenario, Step } from './types';

/** Максимальная длительность стриминга одного сообщения, мс. */
const MAX_STREAM_MS = 1400;
/** Шаг таймера стриминга, мс. */
const STREAM_TICK = 28;

interface Options {
  scenario: Scenario;
  /** Проигрывать ли сценарий. Секция вне вьюпорта => false. */
  active: boolean;
  /** Резолвер i18n-ключа: движку нужен готовый текст для стриминга. */
  resolve: (key: string) => string;
  /** При reduce показываем финальное состояние без анимации. */
  reducedMotion: boolean;
}

interface Result {
  emitted: EmittedStep[];
  phase: string | null;
  finished: boolean;
  /** Прогресс 0..1 — для полоски под вкладкой. */
  progress: number;
  replay: () => void;
}


/**
 * Движок демо-сценария.
 *
 * Устройство: один рекурсивный setTimeout-конвейер вместо интервала на
 * каждый шаг. Так в любой момент времени живёт максимум два таймера
 * (шаг + стриминг), и оба гарантированно снимаются в cleanup.
 *
 * Прогон одноразовый: досмотрев сценарий, движок останавливается и ждёт
 * replay(). Бесконечный цикл на лендинге — это фоновая нагрузка на CPU
 * ради анимации, которую уже посмотрели.
 *
 * `active === false` (секция ушла из вьюпорта) не просто ставит на паузу,
 * а сбрасывает прогон: вернувшись к секции, посетитель увидит сценарий
 * с начала, а не с середины.
 */
export function useScenario({
  scenario,
  active,
  resolve,
  reducedMotion,
}: Options): Result {
  const [emitted, setEmitted] = useState<EmittedStep[]>([]);
  const [phase, setPhase] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [runId, setRunId] = useState(0);

  // Таймеры текущего прогона: снимаются при смене вкладки и размонтировании.
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // resolve приходит из useTranslations и меняет идентичность на каждый
  // рендер. Держим его в ref, иначе эффект перезапускал бы сценарий.
  const resolveRef = useRef(resolve);
  resolveRef.current = resolve;

  const clearTimers = useCallback(() => {
    if (stepTimer.current) {
      clearTimeout(stepTimer.current);
      stepTimer.current = null;
    }
    if (streamTimer.current) {
      clearInterval(streamTimer.current);
      streamTimer.current = null;
    }
  }, []);

  const replay = useCallback(() => setRunId((n) => n + 1), []);

  useEffect(() => {
    clearTimers();
    setEmitted([]);
    setPhase(null);
    setFinished(false);

    if (!active) return;

    const steps = scenario.steps;

    // Режим пониженной анимации: отдаём финальное состояние целиком.
    if (reducedMotion) {
      const lastPhase = [...steps]
        .reverse()
        .find((s): s is Extract<Step, { kind: 'phase' }> => s.kind === 'phase');

      setEmitted(
        steps
          .filter((s) => s.kind !== 'phase')
          .map((step) => ({
            step,
            streamed:
              step.kind === 'message' ? resolveRef.current(step.key) : '',
            done: true,
          }))
      );
      setPhase(lastPhase?.phase ?? null);
      setFinished(true);
      return;
    }

    // Флаг отмены: асинхронные хвосты не должны писать в state
    // после того, как эффект переигран или размонтирован.
    let cancelled = false;

    const markDone = (id: string) => {
      setEmitted((prev) =>
        prev.map((e) => (e.step.id === id ? { ...e, done: true } : e))
      );
    };

    const runStep = (index: number) => {
      if (cancelled) return;

      if (index >= steps.length) {
        setFinished(true);
        return;
      }

      const step = steps[index];

      stepTimer.current = setTimeout(() => {
        if (cancelled) return;

        // Фаза — не элемент ленты, а состояние визуальной панели.
        if (step.kind === 'phase') {
          setPhase(step.phase);
          runStep(index + 1);
          return;
        }

        setEmitted((prev) => [...prev, { step, streamed: '', done: false }]);

        if (step.kind === 'message') {
          const full = resolveRef.current(step.key);

          // Без стриминга сообщение появляется целиком.
          if (!step.stream) {
            setEmitted((prev) =>
              prev.map((e) =>
                e.step.id === step.id
                  ? { ...e, streamed: full, done: true }
                  : e
              )
            );
            runStep(index + 1);
            return;
          }

          // Чем длиннее реплика, тем крупнее шаг: общая длительность
          // остаётся в пределах MAX_STREAM_MS.
          const ticks = Math.max(1, Math.ceil(MAX_STREAM_MS / STREAM_TICK));
          const chunk = Math.max(1, Math.ceil(full.length / ticks));
          let cursor = 0;

          streamTimer.current = setInterval(() => {
            if (cancelled) return;
            cursor = Math.min(full.length, cursor + chunk);
            const slice = full.slice(0, cursor);

            setEmitted((prev) =>
              prev.map((e) =>
                e.step.id === step.id ? { ...e, streamed: slice } : e
              )
            );

            if (cursor >= full.length) {
              if (streamTimer.current) {
                clearInterval(streamTimer.current);
                streamTimer.current = null;
              }
              markDone(step.id);
              runStep(index + 1);
            }
          }, STREAM_TICK);
          return;
        }

        if (step.kind === 'thought' && step.settleAfter) {
          // Инструмент «думает»: loading → success.
          stepTimer.current = setTimeout(() => {
            if (cancelled) return;
            markDone(step.id);
            runStep(index + 1);
          }, step.settleAfter);
          return;
        }

        markDone(step.id);
        runStep(index + 1);
      }, step.delay);
    };

    runStep(0);

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [scenario, active, reducedMotion, runId, clearTimers]);

  const total = scenario.steps.length || 1;
  const progress = finished ? 1 : Math.min(1, emitted.length / total);

  return { emitted, phase, finished, progress, replay };
}
