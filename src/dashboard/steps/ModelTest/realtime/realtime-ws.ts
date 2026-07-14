/**
 * RealtimeWebSocket — WS-соединение с сервером Realtime API
 *
 * Авторизация через Sec-WebSocket-Protocol: <token>  (как /ws/test-model)
 * Входящие binary фреймы → onAudioDelta(ArrayBuffer)
 * Входящие text фреймы  → dispatch по type
 *
 * Reconnect: экспоненциальная задержка 1s → 2s → 4s, максимум 3 попытки
 */

import { RealtimeEvent } from './types';
import { getAuthToken } from '../../../../utils/easyUtils';

const MAX_RECONNECTS = 3;
const BASE_DELAY_MS  = 1000;

type EventHandler = (event: RealtimeEvent) => void;

export class RealtimeWebSocket {
  onAudioDelta: (pcm16: ArrayBuffer) => void = () => {};
  onEvent: EventHandler = () => {};

  private ws: WebSocket | null = null;
  private url = '';
  private token = '';
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false; // намеренное закрытие

  connect(url: string): void {
    this.url    = url;
    this.token  = getAuthToken() || '';
    this.closed = false;
    this.reconnectCount = 0;
    this._open();
  }

  private _open(): void {
    // Авторизация через subprotocol — аналогично /ws/test-model
    this.ws = new WebSocket(this.url, [this.token]);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.reconnectCount = 0;
    };

    this.ws.onmessage = (ev: MessageEvent) => {
      if (ev.data instanceof ArrayBuffer) {
        // Бинарный фрейм — PCM16 аудио от ассистента
        this.onAudioDelta(ev.data);
        return;
      }

      try {
        const msg = JSON.parse(ev.data as string) as RealtimeEvent;
        this.onEvent(msg);
      } catch (e) {
        console.warn('[RealtimeWS] Failed to parse message:', ev.data);
      }
    };

    this.ws.onerror = () => {
      console.error('[RealtimeWS] WebSocket error');
    };

    this.ws.onclose = () => {
      if (this.closed) return;
      console.warn('[RealtimeWS] Disconnected');

      if (this.reconnectCount < MAX_RECONNECTS) {
        const delay = BASE_DELAY_MS * Math.pow(2, this.reconnectCount);
        this.reconnectCount++;
        this.reconnectTimer = setTimeout(() => this._open(), delay);
      } else {
        this.onEvent({ type: 'error', error: 'WebSocket disconnected, reconnect limit reached' });
      }
    };
  }

  sendAudio(pcm16: ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(pcm16);
    }
  }

  sendStop(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'stop' }));
    }
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}
