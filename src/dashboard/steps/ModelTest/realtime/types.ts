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

/**
 * Все события от сервера.
 *
 * OpenAI:  binary → transcript_delta → token_usage → response_done
 *          binary → transcript_delta → token_usage → assist{files,...}
 * Google:  binary → transcript_delta → response_done
 *          audio_stop (barge-in / конец реплики ассистента)
 */
export interface RealtimeEvent {
  type:
      | 'ready'
      | 'transcript_delta'
      | 'input_transcript_done'
      | 'response_done'
      | 'token_usage'
      | 'assist'
      | 'speech_started'   // OpenAI VAD: пользователь начал говорить
      | 'speech_stopped'   // OpenAI VAD: пользователь замолчал
      | 'audio_stop'       // Google: остановить воспроизведение (barge-in или конец реплики)
      | 'error';
  text?: string;
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
