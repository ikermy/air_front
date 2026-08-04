/**
 * RealtimeController — фасад / FSM для OpenAI Realtime API и Google Multimodal Live API
 *
 * Оркестрирует AudioCapture → RealtimeWebSocket → AudioPlayer
 *
 * FSM:
 *   idle → connecting → ready → listening ⇄ speaking
 *        ↘ error (любой момент) → idle (через 3с)
 *
 * Протокол событий от сервера:
 *   OpenAI:  binary → transcript_delta → token_usage → response_done
 *            binary → transcript_delta → token_usage → assist{files,...}
 *   Google:  binary → transcript_delta → response_done
 *            audio_stop (barge-in: остановить воспроизведение, вернуться в listening)
 */

import {
  RealtimeState,
  RealtimeEvent,
  RealtimeTokenUsage,
  RealtimeResponseResult,
  RealtimeProvider,
  SessionInfo,
} from './types';
import { AudioCapture }      from './audio-capture';
import { AudioPlayer }       from './audio-player';
import { RealtimeWebSocket } from './realtime-ws';


export class RealtimeController {
  // ─── Callbacks для UI ────────────────────────────────────────────
  onStateChange:     (state: RealtimeState) => void           = () => {};
  onTranscriptDelta: (text: string) => void                   = () => {};
  onInputTranscript: (text: string) => void                   = () => {};
  onResponseDone:    (result: RealtimeResponseResult) => void = () => {};
  onTokenUsage:      (usage: RealtimeTokenUsage) => void      = () => {};
  onError:           (message: string) => void                = () => {};
  /** VAD: пользователь начал говорить — UI должен сбросить streaming bubble */
  onSpeechStarted:   () => void                               = () => {};

  // ─── Приватное состояние ─────────────────────────────────────────
  private state: RealtimeState = 'idle';
  private provider: RealtimeProvider = 'openai';
  private capture  = new AudioCapture();
  private player   = new AudioPlayer();
  private ws       = new RealtimeWebSocket();
  private errorTimer: ReturnType<typeof setTimeout> | null = null;

  private transcriptBuffer   = '';
  private pendingTokenUsage: RealtimeTokenUsage | undefined = undefined;
  private firstAudioAt:      number | undefined = undefined;
  private responseDoneAt:    number | undefined = undefined;
  private sentAt:            number | undefined = undefined;
  /**
   * true после response_done/assist/speech_started/input_transcript_done —
   * означает что следующий бинарный фрейм начинает НОВЫЙ ответ.
   * При этом нужно flush() чтобы прервать старое воспроизведение.
   */
  private _expectingNewResponse = false;

  // ─── Публичные методы ────────────────────────────────────────────

  async start(sessionInfo: SessionInfo): Promise<void> {
    if (this.state !== 'idle') {
      console.warn('[RealtimeController] Already started, state:', this.state);
      return;
    }

    this.provider = sessionInfo.provider ?? 'openai';
    this._setState('connecting');

    // Prewarm AudioContext прямо в контексте user gesture (клик Switch)
    await this.player.prewarm();

    // Переключаем в listening когда буферы реально доиграли
    this.player.onPlaybackDone = () => {
      if (this.state === 'speaking') this._setState('listening');
    };

    const wsPath = `/v1/ws/test-realtime?tread_id=${encodeURIComponent(sessionInfo.treadId)}`;
    // Next dev server (3001) proxies HTTP requests to the local HTTPS Envoy,
    // but it does not proxy WebSocket upgrades. Connect to Envoy directly.
    const wsUrl = window.location.port === '3001'
      ? `wss://localhost${wsPath}`
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${wsPath}`;

    this.ws.onAudioDelta = (pcm16) => {
      // Первый фрейм нового ответа — прерываем всё что ещё играет
      if (this._expectingNewResponse) {
        this.player.flush();
        this._expectingNewResponse = false;
      }
      if (this.state !== 'speaking') this._setState('speaking');
      if (this.firstAudioAt === undefined) this.firstAudioAt = Date.now();
      this.player.enqueue(pcm16);
    };

    this.ws.onEvent = (event: RealtimeEvent) => this._handleEvent(event);
    this.ws.connect(wsUrl);
  }

  stop(): void {
    this._cleanup();
    this._setState('idle');
  }

  toggle(sessionInfo: SessionInfo): void {
    if (this.state === 'idle' || this.state === 'error') {
      this.start(sessionInfo);
    } else {
      this.stop();
    }
  }

  // ─── Обработка событий WS ────────────────────────────────────────

  private async _handleEvent(event: RealtimeEvent): Promise<void> {
    switch (event.type) {

      case 'ready':
        this._setState('ready');
        try {
          this.capture.onChunk = (pcm16) => this.ws.sendAudio(pcm16);
          await this.capture.start();
          this._setState('listening');
        } catch (e: any) {
          this._handleError(`Ошибка микрофона: ${e?.message || e}`);
        }
        break;

      case 'transcript_delta':
        if (event.text) {
          this.transcriptBuffer += event.text;
          this.onTranscriptDelta(event.text);
        }
        break;

      case 'input_transcript_done':
        if (event.text) this.onInputTranscript(event.text);
        this.sentAt = Date.now();
        this.firstAudioAt = undefined;
        // НЕ выставляем _expectingNewResponse — это делает speech_started / audio_stop
        break;

      case 'token_usage':
        if (event.usage) {
          this.pendingTokenUsage = event.usage;
          this.onTokenUsage(event.usage);
        }
        break;

      case 'response_done':
        this._finishResponse(event);
        break;

        /**
         * Google Multimodal Live: сервер сигнализирует что нужно остановить
         * воспроизведение — либо barge-in (пользователь перебил), либо
         * естественный конец реплики ассистента перед паузой ожидания.
         *
         * Действия:
         *   1. Немедленно flush() — очищаем очередь PCM и останавливаем плеер
         *   2. Следующий бинарный фрейм начнёт новый ответ
         *   3. Переходим в listening
         */
      case 'audio_stop':
        this.player.flush();
        this._expectingNewResponse = true;
        this.transcriptBuffer  = '';
        this.pendingTokenUsage = undefined;
        this.firstAudioAt      = undefined;
        this.onSpeechStarted();   // сброс streaming bubble в UI
        this._setState('listening');
        break;

        /**
         * OpenAI VAD: пользователь начал говорить.
         * У Google аналогом является audio_stop.
         */
      case 'speech_started':
        if (this.provider === 'google') {
          // Google не должен слать speech_started, но на всякий случай
          // обрабатываем как audio_stop
          this.player.flush();
        }
        this.transcriptBuffer      = '';
        this.pendingTokenUsage     = undefined;
        this.firstAudioAt          = undefined;
        // flush произойдёт при первом бинарном фрейме нового ответа
        this._expectingNewResponse = true;
        this.onSpeechStarted();
        this._setState('listening');
        break;

      case 'speech_stopped':
        this.sentAt = Date.now();
        this.firstAudioAt = undefined;
        console.log('[RealtimeController] speech_stopped → ждём ответа');
        break;

      case 'assist':
        this._finishResponse(event);
        break;

      case 'error':
        this._handleError(event.error || 'Realtime ошибка');
        break;

      default:
        break;
    }
  }

  /**
   * Общий финализатор: собирает RealtimeResponseResult из накопленного состояния
   * и данных события, вызывает onResponseDone, сбрасывает накопители.
   */
  private _finishResponse(event: RealtimeEvent): void {
    this.responseDoneAt = Date.now();

    // Вызываем onResponseDone всегда — даже если transcriptBuffer пустой
    // (ответ может состоять только из файлов без текста)
    const result: RealtimeResponseResult = {
      fullText:       this.transcriptBuffer,
      tokenUsage:     this.pendingTokenUsage,
      files:          (event.files && event.files.length > 0) ? event.files : undefined,
      image_url:      event.image_url,
      file_url:       event.file_url,
      file_type:      event.file_type,
      file_name:      event.file_name,
      firstAudioAt:   this.firstAudioAt,
      responseDoneAt: this.responseDoneAt,
      sentAt:         this.sentAt,
    };

    this.onResponseDone(result);

    this.transcriptBuffer      = '';
    this.pendingTokenUsage     = undefined;
    this.firstAudioAt          = undefined;
    this.responseDoneAt        = undefined;
    this.sentAt                = undefined;
    // После завершения ответа — следующий бинарный фрейм начнёт новый ответ
    this._expectingNewResponse = true;
  }

  // ─── Утилиты ─────────────────────────────────────────────────────

  private _setState(state: RealtimeState): void {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange(state);
    console.log('[RealtimeController] State →', state);
  }

  private _handleError(msg: string): void {
    console.error('[RealtimeController] Error:', msg);
    this.onError(msg);
    this._cleanup();
    this._setState('error');
    this.errorTimer = setTimeout(() => {
      if (this.state === 'error') this._setState('idle');
    }, 3000);
  }

  private _cleanup(): void {
    if (this.errorTimer !== null) {
      clearTimeout(this.errorTimer);
      this.errorTimer = null;
    }
    this.capture.stop();
    this.ws.sendStop();
    this.ws.close();
    this.player.destroy();
    this.transcriptBuffer      = '';
    this.pendingTokenUsage     = undefined;
    this.firstAudioAt          = undefined;
    this.responseDoneAt        = undefined;
    this.sentAt                = undefined;
    this._expectingNewResponse = false;
    this.provider              = 'openai';
  }
}
