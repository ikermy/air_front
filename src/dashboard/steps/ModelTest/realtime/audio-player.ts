/**
 * AudioPlayer — непрерывная очередь воспроизведения сырых PCM16-дельт
 *
 * Каждый фрейм от сервера: int16 LE, 24000 Hz, mono, без заголовка.
 * Планирование встык через source.start(nextPlayTime) — без щелчков.
 *
 * Критические правила:
 * 1. flush() НЕ закрывает AudioContext — только останавливает источники и
 *    сбрасывает nextPlayTime. ctx.close() во время воспроизведения обрывает звук.
 * 2. prewarm() вызывать сразу при user gesture (клик Switch) — разблокирует
 *    ctx до прихода первых фреймов (autoplay policy браузера).
 * 3. destroy() — полное уничтожение при остановке сессии.
 */

const SAMPLE_RATE = 24000;

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  /** Вызывается когда все запланированные буферы доиграли (последний source.onended) */
  onPlaybackDone: () => void = () => {};

  // ─── Внутренние утилиты ───────────────────────────────────────────

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      this.nextPlayTime = 0;
      this.activeSources = [];
    }
    return this.ctx;
  }

  // ─── Публичные методы ─────────────────────────────────────────────

  /**
   * Prewarm — создать и resume AudioContext прямо по user gesture.
   * Вызывать при включении Realtime Switch (клик пользователя),
   * до прихода первых бинарных фреймов — иначе ctx будет suspended.
   */
  async prewarm(): Promise<void> {
    const ctx = this.getCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  /**
   * Добавить сырой PCM16 LE фрейм в очередь воспроизведения.
   * Планирование через Web Audio scheduler — не блокирует UI thread.
   *
   * @param pcm16 - ArrayBuffer с int16 LE сэмплами (без заголовка)
   */
  enqueue(pcm16: ArrayBuffer): void {
    const ctx = this.getCtx();

    // Разблокируем ctx если suspended (fallback — должен быть уже prewarmed)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // int16 LE → float32 [-1.0, 1.0]
    const int16   = new Int16Array(pcm16);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    // Пустой фрейм — пропускаем
    if (float32.length === 0) return;

    // Создаём AudioBuffer
    const audioBuf = ctx.createBuffer(1, float32.length, SAMPLE_RATE);
    audioBuf.copyToChannel(float32, 0);

    // Планируем встык
    const source  = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(ctx.destination);

    const now     = ctx.currentTime;
    const startAt = Math.max(this.nextPlayTime, now);
    source.start(startAt);
    this.nextPlayTime = startAt + audioBuf.duration;

    // Отслеживаем активные источники для flush
    this.activeSources.push(source);
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) this.activeSources.splice(idx, 1);
      // Все буферы доиграли → уведомляем контроллер
      if (this.activeSources.length === 0) {
        this.onPlaybackDone();
      }
    };
  }

  /**
   * Немедленно остановить воспроизведение.
   * НЕ закрывает AudioContext — он переиспользуется для следующего ответа.
   * Вызывать при response_done или команде stop.
   */
  flush(): void {
    for (const src of this.activeSources) {
      try { src.stop(); } catch (_) { /* уже завершён */ }
    }
    this.activeSources = [];
    this.nextPlayTime  = 0;
  }

  /**
   * Полное уничтожение — вызывать при остановке Realtime сессии / unmount.
   */
  destroy(): void {
    this.flush();
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}
