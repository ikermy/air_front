/**
 * Общие типы для Realtime API интеграции (OpenAI + Google Multimodal Live)
 */

export type RealtimeState =
    | 'idle'
    | 'connecting'
    | 'ready'
    | 'listening'
    | 'speaking'
    | 'error';

export type RealtimeProvider = 'openai' | 'google';

export interface RealtimeTokenUsage {
  input_tokens: number;
  input_tokens_details?: {
    text_tokens?: number;
    audio_tokens?: number;
    cached_tokens: number;
    cached_tokens_details?: { text_tokens: number; audio_tokens: number };
  };
  output_tokens: number;
  output_tokens_details?: {
    text_tokens?: number;
    audio_tokens?: number;
    reasoning_tokens?: number;
    accepted_prediction_tokens?: number;
    rejected_prediction_tokens?: number;
  };
  total_tokens: number;
}

/** Файл от сервера — идентичен ServerFile из testUtils */
export interface RealtimeServerFile {
  type: string;
  url: string;
  file_name: string;
  caption?: string;
}

/**
 * Данные завершённого ответа — передаются в onResponseDone
 */
export interface RealtimeResponseResult {
  fullText: string;
  tokenUsage?: RealtimeTokenUsage;
  files?: RealtimeServerFile[];
  image_url?: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  firstAudioAt?: number;
  responseDoneAt?: number;
  sentAt?: number;
}

export type RealtimeEventType =
    | 'ready'
    | 'transcript'
    | 'response'
    | 'speech'
    | 'token_usage'
    | 'audio_stop'
    | 'error';

export type RealtimeEventRole = 'user' | 'assistant';

export type RealtimeEventPhase =
    | 'delta'
    | 'done'
    | 'started'
    | 'stopped';

/**
 * Все события от сервера (пост-миграция).
 *
 * Поток ответа: binary → transcript(delta) → token_usage → response(done)
 * Поток ввода:  binary → transcript(user/delta) → transcript(user/done)
 */
export interface RealtimeEvent {
  type: RealtimeEventType;
  role?: RealtimeEventRole;
  phase?: RealtimeEventPhase;
  text?: string;
  delta?: string;
  error?: string;
  usage?: RealtimeTokenUsage;
  message?: string;
  files?: RealtimeServerFile[];
  image_url?: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
}

export interface SessionInfo {
  userId: number;
  respId: number;
  treadId: string;
  realtimeEnabled: boolean;
  /** Провайдер сессии — определяет протокол событий */
  provider?: RealtimeProvider;
}
