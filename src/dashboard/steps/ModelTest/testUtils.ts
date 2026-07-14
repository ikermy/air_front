/**
 * Утилиты для работы с API тестирования моделей
 * Функции для управления тестовыми сессиями диалогов
 *
 * RESPONSE TIMING SYSTEM - добавлено 2026-02-14
 * ================================================
 * Система замера времени ответа модели:
 *
 * 1. Компонент ModelTest.tsx замеряет время отправки (sentAt = Date.now())
 * 2. testGetAnswer() замеряет:
 *    - firstDeltaAt: время получения первой дельты (TRUE STREAMING)
 *    - finalAnswerAt: время получения полного ответа
 *
 * Метрики производительности:
 * - Time to First Delta = firstDeltaAt - sentAt (время до начала стриминга)
 * - Time to Final Answer = finalAnswerAt - sentAt (общее время ответа)
 *
 * Все времена в миллисекундах (Date.now())
 */

import { authFetch, getAuthToken } from "../../../utils/easyUtils";


/**
 * Извлекает текст сообщения из частично собранного JSON
 * TRUE STREAMING - вспомогательная функция
 *
 * @param partialJson - Накопленный RAW JSON (может быть неполным)
 * @returns Извлечённый текст сообщения или пустая строка
 *
 * @example
 * extractMessageFromPartialJson('{"action":{...},"message":"Hello')
 * // → "Hello"
 *
 * extractMessageFromPartialJson('{"action":{...},"message":"Hello World!"}')
 * // → "Hello World!"
 */
function extractMessageFromPartialJson(partialJson: string): string {
  try {
    // Пытаемся распарсить как полный JSON
    const parsed = JSON.parse(partialJson);
    return parsed.message || '';
  } catch {
    // JSON еще не полный - извлекаем через regex
    // Регулярное выражение находит "message":"текст" с учётом escape-последовательностей
    const match = partialJson.match(/"message"\s*:\s*"([^"]*)"/);
    if (match && match[1]) {
      // Декодируем escape-последовательности
      return match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    return '';
  }
}

/**
 * Кастомная ошибка для API запросов
 */
export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Конвертирует файл в base64 строку
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Убираем префикс data:audio/...;base64,
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Интерфейс для метаданных сессии
 */
export interface TestSession {
  user_id: number;
  resp_id: number;
  tread_id: string;
  started_at: string;
  [key: string]: any;
}

/**
 * Интерфейс для ответа при запуске сессии
 */
export interface StartSessionResponse {
  user_id: number;
  resp_id: number;
  tread_id: string;
  started_at: string;
  provider: string;
  model_name: string;
  s3_files: boolean;
  image_generation: boolean;
  code_interpreter: boolean;
  web_search: boolean;
  video_generation: boolean;
  calendar: boolean;  // Google Calendar integration
  sheets: boolean;    // Google Sheets integration
  ignore: boolean;    // false = не игнорировать новые вопросы (не блокировать ввод); true = игнорировать (блокировать ввод до ответа модели)
  realtime: boolean;  // true = модель поддерживает Realtime API (голосовой режим через WS)
  greeting: boolean;  // true = модель приветствует пользователя первая при входе в сессию
  [key: string]: any;
}

/**
 * Интерфейс для загружаемого файла
 */
export interface FileUpload {
  url?: string;
  name: string;
  type?: string;
  size?: number;
  originFileObj?: File;  // Оригинальный файл для voice режима
}

/**
 * Интерфейс для содержимого сообщения
 */
export interface AssistResponse {
  message: string;
}

/**
 * Интерфейс для запроса отправки вопроса
 */
export interface AskRequest {
  type: string;  // "user" или "user_voice"
  content: AssistResponse;
  files?: FileUpload[];           // Файлы для обычного режима
  audio_data?: string;            // Base64 данные аудио для user_voice
  audio_name?: string;            // Имя аудио файла
}

/**
 * Интерфейс для ответа при отправке вопроса
 */
export interface AskResponse {
  status: string;
  timestamp: string;
}

/**
 * Интерфейс для файла из ответа сервера
 */
export interface ServerFile {
  type: string;       // "photo", "file", "video", etc.
  url: string;        // URL файла
  file_name: string;  // Имя файла
  caption?: string;   // Подпись к файлу
}

/**
 * Потоковое сообщение (дельта)
 * TRUE STREAMING - добавлено 2026-02-13
 */
export interface DeltaMessage {
  type: 'delta' | 'assistant_delta';  // Поддержка обоих форматов
  content: string;
  timestamp: string;
}

/**
 * Интерфейс для финального сообщения от ассистента
 * TRUE STREAMING - обновлено 2026-02-13
 */
export interface FinalMessage {
  type: 'assistant' | 'assist';
  message: string;
  operator?: boolean;
  created_at?: string;
  name?: string;
  files?: ServerFile[];
  meta?: boolean;
  file_url?: string;       // URL файла (deprecated - для обратной совместимости)
  file_name?: string;      // Имя файла (deprecated - для обратной совместимости)
  file_type?: string;      // Тип файла (deprecated - для обратной совместимости)
  image_url?: string;      // URL изображения (deprecated - для обратной совместимости)
  [key: string]: any;
}

/**
 * OpenAI Function Call Events - добавлено 2026-02-15
 * Поддержка real-time streaming для вызовов функций
 */

/**
 * Событие начала вызова функции
 * OpenAI format: response.output_item.added
 */
export interface FunctionCallAddedEvent {
  type: 'response.output_item.added';
  response_id: string;
  output_index: number;
  item: {
    type: 'function_call';
    id: string;
    call_id: string;
    name: string;
    arguments: string;
  };
}

/**
 * Событие дельты аргументов функции
 * OpenAI format: response.function_call_arguments.delta
 */
export interface FunctionCallArgumentsDeltaEvent {
  type: 'response.function_call_arguments.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  delta: string;
}

/**
 * Событие завершения формирования аргументов
 * OpenAI format: response.function_call_arguments.done
 */
export interface FunctionCallArgumentsDoneEvent {
  type: 'response.function_call_arguments.done';
  response_id: string;
  item_id: string;
  output_index: number;
  arguments: string;
}

/**
 * Событие завершения вызова функции
 * OpenAI format: response.output_item.done
 */
export interface FunctionCallOutputItemDoneEvent {
  type: 'response.output_item.done';
  response_id: string;
  output_index: number;
  item: {
    type: 'function_call';
    id: string;
    call_id: string;
    name: string;
    arguments: string;
  };
}

/**
 * Событие информации о расходе токенов
 * Добавлено 2026-02-15
 * Формат от сервера (OpenAI-совместимый)
 * Документация: internal/app/model/create/open.go, строки 1161-1188
 */
export interface TokenUsageEvent {
  type: 'token_usage';
  usage: {
    input_tokens: number;
    input_tokens_details?: {
      cached_tokens: number;
    };
    output_tokens: number;
    output_tokens_details?: {
      reasoning_tokens: number;
      accepted_prediction_tokens?: number;
      rejected_prediction_tokens?: number;
    };
    total_tokens: number;
  };
}

/**
 * Объединённый тип для всех OpenAI Function Call событий
 */
export type FunctionCallEvent =
  | FunctionCallAddedEvent
  | FunctionCallArgumentsDeltaEvent
  | FunctionCallArgumentsDoneEvent
  | FunctionCallOutputItemDoneEvent;

/**
 * Объединённый тип для всех WebSocket сообщений
 * TRUE STREAMING - добавлено 2026-02-13
 * FUNCTION CALLS - обновлено 2026-02-15
 * TOKEN USAGE - добавлено 2026-02-15
 */
export type WebSocketMessage = DeltaMessage | FinalMessage | FunctionCallEvent | TokenUsageEvent;

/**
 * Интерфейс для ответа при получении ответа модели
 * @deprecated Используйте FinalMessage для типизации
 */
export interface AnswerResponse {
  message?: string;
  operator?: boolean;
  created_at?: string;
  status?: string;
  error?: string;
  file_url?: string;       // URL файла (deprecated - для обратной совместимости)
  file_name?: string;      // Имя файла (deprecated - для обратной совместимости)
  file_type?: string;      // Тип файла (deprecated - для обратной совместимости)
  image_url?: string;      // URL изображения (deprecated - для обратной совместимости)
  files?: ServerFile[];    // Массив файлов от сервера
  firstDeltaAt?: number;   // Время получения первой дельты (timestamp в мс)
  finalAnswerAt?: number;  // Время получения финального ответа (timestamp в мс)
  functionCalls?: Array<{  // Массив завершённых вызовов функций (добавлено 2026-02-15)
    id: string;
    call_id: string;
    name: string;
    arguments: string;
  }>;
  tokenUsage?: {           // Информация о расходе токенов (добавлено 2026-02-15)
    input_tokens: number;
    input_tokens_details?: {
      cached_tokens: number;
    };
    output_tokens: number;
    output_tokens_details?: {
      reasoning_tokens: number;
      accepted_prediction_tokens?: number;
      rejected_prediction_tokens?: number;
    };
    total_tokens: number;
  };
  [key: string]: any;
}

/**
 * Интерфейс для ответа при остановке сессии
 */
export interface StopSessionResponse {
  status: string;
}

/**
 * Запуск новой тестовой сессии
 */
export const testStartSession = async (
    provider: string
): Promise<StartSessionResponse> => {
  try {
    const response = await authFetch(`/v1/api/test/start?provider=${encodeURIComponent(provider)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error starting test session:", error);
    throw error;
  }
};

/**
 * Отправка вопроса в активную тестовую сессию
 */
export const testAsk = async (
    text: string,
    voice?: boolean,
    files?: FileUpload[]
): Promise<AskResponse> => {
  try {
    // Проверяем что есть либо текст либо файлы
    if (!text.trim() && (!files || files.length === 0)) {
      throw new Error("Text or files are required");
    }

    const request: AskRequest = {
      type: voice ? "user_voice" : "user",
      content: {
        message: text.trim()
      }
    };

    // В voice режиме первый файл отправляем как audio_data
    if (voice && files && files.length > 0) {
      const audioFile = files[0];

      // Если есть originFileObj, читаем его как base64
      if (audioFile.originFileObj) {
        try {
          request.audio_data = await fileToBase64(audioFile.originFileObj);
          request.audio_name = audioFile.name;
        } catch (error) {
          console.error("Error converting file to base64:", error);
        }
      }
    } else if (!voice && files && files.length > 0) {
      // В обычном режиме отправляем как files
      request.files = files;
    }

    const response = await authFetch(`/v1/api/test/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      let errorData: any;
      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new ApiError(errorMessage, response.status, errorData);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending question:", error);
    throw error;
  }
};

/**
 * Получение ответа от модели через WebSocket с поддержкой TRUE STREAMING
 * GET /ws/test-model
 *
 * TRUE STREAMING - обновлено 2026-02-13
 * RESPONSE TIMING - добавлено 2026-02-14
 * FUNCTION CALLS - добавлено 2026-02-15
 * TOKEN USAGE - добавлено 2026-02-15
 *
 * Поток данных от сервера:
 * 1. Дельты: {"type":"delta", "content":'{"action":{...}'}  ← RAW JSON chunks
 * 2. Function Calls: {"type":"response.output_item.added", ...}  ← OpenAI events
 * 3. Token Usage: {"type":"token_usage", "usage":{...}}  ← Token consumption info
 * 4. Финал: {"type":"assistant", "message":"Полный текст"}
 *
 * Логика обработки:
 * - Накапливаем RAW JSON из дельт
 * - Извлекаем поле "message" из частичного JSON
 * - Отправляем в onDelta ТОЛЬКО НОВЫЕ СИМВОЛЫ текста (не JSON!)
 * - Отправляем в onFunctionCall события вызовов функций OpenAI формата
 * - Отправляем в onTokenUsage информацию о расходе токенов
 *
 * Замер времени ответа:
 * - firstDeltaAt: время получения ПЕРВОЙ дельты (для TRUE STREAMING)
 * - finalAnswerAt: время получения финального ответа модели
 * - Для расчёта времени ответа используйте разницу с sentAt из testAsk()
 *
 * @param onMessage - Callback для финального сообщения (включает firstDeltaAt и finalAnswerAt)
 * @param onError - Callback для ошибок
 * @param onClose - Callback при закрытии соединения
 * @param onDelta - Callback для новых символов текста (не JSON!)
 * @param onFunctionCall - Callback для событий вызовов функций (OpenAI format)
 * @param onTokenUsage - Callback для информации о расходе токенов
 */
export const testGetAnswer = (
    onMessage: (message: AnswerResponse) => void,
    onError?: (error: Event | Error) => void,
    onClose?: () => void,
    onDelta?: (delta: string) => void,  // ← Теперь получает только новый текст!
    onFunctionCall?: (event: FunctionCallEvent) => void,  // ← Function calls events
    onTokenUsage?: (usage: {
      input_tokens: number;
      input_tokens_details?: { cached_tokens: number };
      output_tokens: number;
      output_tokens_details?: { reasoning_tokens: number };
      total_tokens: number;
    }) => void  // ← Token usage
): WebSocket => {
  
const wsUrl = `/v1/ws/test-model`;
  // Используем токен, переданный в функцию; если пустой, пробуем читать из localStorage
  const wsToken = getAuthToken();
  if (!wsToken) {
    throw new Error('Token not provided for WebSocket');
  }
  const ws = new WebSocket(wsUrl, [wsToken]);

  // TRUE STREAMING: Накопители
  let accumulatedJson = '';      // Накопленный RAW JSON
  let lastExtractedText = '';    // Последний извлечённый текст
  let firstDeltaAt: number | null = null;  // Время получения первой дельты
  let completedFunctionCalls: Array<{id: string; call_id: string; name: string; arguments: string}> = [];  // Завершённые вызовы функций
  let tokenUsage: {
    input_tokens: number;
    input_tokens_details?: { cached_tokens: number };
    output_tokens: number;
    output_tokens_details?: { reasoning_tokens: number };
    total_tokens: number;
  } | null = null;  // Расход токенов

  ws.onerror = (error) => {
    console.error('❌ WebSocket ERROR:', error);
    console.error('WebSocket URL:', wsUrl);
    console.error('WebSocket readyState:', ws.readyState);
    console.error('Возможные причины:');
    console.error('1. Сервер не запущен на localhost');
    console.error('2. WebSocket handler не настроен на сервере');
    console.error('3. Проблема с SSL сертификатом (wss://)');
    console.error('4. CORS или firewall блокирует соединение');

    if (onError) {
      onError(error);
    }
  };

  ws.onmessage = (event) => {

    try {
      const data: WebSocketMessage = JSON.parse(event.data);

      // FUNCTION CALLS: Обработка OpenAI событий вызовов функций
      // response.output_item.added - начало вызова функции
      if (data.type === 'response.output_item.added') {
        if (onFunctionCall) {
          onFunctionCall(data as FunctionCallAddedEvent);
        }
        return;
      }

      // response.function_call_arguments.delta - дельта аргументов функции
      if (data.type === 'response.function_call_arguments.delta') {
        if (onFunctionCall) {
          onFunctionCall(data as FunctionCallArgumentsDeltaEvent);
        }
        return;
      }

      // response.function_call_arguments.done - завершение формирования аргументов
      if (data.type === 'response.function_call_arguments.done') {
        if (onFunctionCall) {
          onFunctionCall(data as FunctionCallArgumentsDoneEvent);
        }
        return;
      }
      // response.output_item.done - завершение вызова функции
      if (data.type === 'response.output_item.done') {
        const event = data as FunctionCallOutputItemDoneEvent;
        // Сохраняем завершённый вызов функции
        completedFunctionCalls.push({
          id: event.item.id,
          call_id: event.item.call_id,
          name: event.item.name,
          arguments: event.item.arguments
        });
        if (onFunctionCall) {
          onFunctionCall(event);
        }
        return;
      }

      // TOKEN USAGE: Обработка информации о расходе токенов
      if (data.type === 'token_usage') {
        const event = data as TokenUsageEvent;
        // Сохраняем информацию о токенах
        tokenUsage = event.usage;
        if (onTokenUsage) {
          onTokenUsage(event.usage);
        }
        return;
      }

      // TRUE STREAMING: Обработка дельт
      // Сервер может отправлять type: "delta" или type: "assistant_delta"
      if (data.type === 'delta' || data.type === 'assistant_delta') {
        // Замеряем время получения ПЕРВОЙ дельты
        if (firstDeltaAt === null) {
          firstDeltaAt = Date.now();
        }

        // ВАЖНО: Проверяем, не является ли содержимое дельты событием token_usage
        // Сервер может отправлять token_usage как JSON-строку внутри content
        const deltaContent = data.content;

        // Проверяем каждую дельту на наличие token_usage
        if (deltaContent && typeof deltaContent === 'string' && deltaContent.includes('token_usage')) {
          console.log('🔍 [DELTA] Найдена дельта с "token_usage"!');
          console.log('🔍 [DELTA] content:', deltaContent);

          try {
            // ВАЖНО: Дельта может содержать НЕСКОЛЬКО JSON объектов подряд
            // Например: }{"type":"token_usage",...}
            // Ищем начало JSON с "type":"token_usage"
            const tokenUsageStart = deltaContent.indexOf('{"type":"token_usage"');

            if (tokenUsageStart !== -1) {
              // Извлекаем подстроку начиная с найденной позиции
              const fromTokenUsage = deltaContent.substring(tokenUsageStart);

              // Ищем конец JSON объекта (считаем скобки)
              let depth = 0;
              let endPos = -1;

              for (let i = 0; i < fromTokenUsage.length; i++) {
                if (fromTokenUsage[i] === '{') depth++;
                if (fromTokenUsage[i] === '}') {
                  depth--;
                  if (depth === 0) {
                    endPos = i + 1;
                    break;
                  }
                }
              }

              if (endPos !== -1) {
                const tokenUsageJson = fromTokenUsage.substring(0, endPos);
                console.log('🔍 [DELTA] Извлечен JSON:', tokenUsageJson);

                const possibleEvent = JSON.parse(tokenUsageJson);

                console.log('🔍 [DELTA] Парсинг успешен:', possibleEvent);
                console.log('🔍 [DELTA] possibleEvent.usage:', possibleEvent.usage);

                // Проверяем, это token_usage событие?
                if (possibleEvent.type === 'token_usage' && possibleEvent.usage) {
                  console.log('💰 [TOKEN_USAGE] НАЙДЕН! Токены:', possibleEvent.usage.total_tokens);

                  // Сохраняем информацию о токенах
                  tokenUsage = possibleEvent.usage;

                  if (onTokenUsage) {
                    onTokenUsage(possibleEvent.usage);
                  }

                  // НЕ добавляем этот content в accumulatedJson
                  // Это служебная информация, не текст ответа
                  return;
                }
              } else {
                console.warn('⚠️ [DELTA] Не найден конец JSON объекта');
              }
            }
          } catch (e) {
            console.error('❌ [DELTA] Ошибка парсинга JSON:', e);
          }
        }

        // Если не token_usage - пробуем обычный парсинг (для других событий)
        if (deltaContent && typeof deltaContent === 'string') {
          try {
            const possibleEvent = JSON.parse(deltaContent);
            if (possibleEvent.type === 'token_usage' && possibleEvent.usage) {
              console.log('💰 [TOKEN_USAGE] НАЙДЕН (обычный парсинг)! Токены:', possibleEvent.usage.total_tokens);
              tokenUsage = possibleEvent.usage;
              if (onTokenUsage) {
                onTokenUsage(possibleEvent.usage);
              }
              return;
            }
          } catch (e) {
            // Это не JSON - продолжаем как обычную дельту
          }
        }

        // Накапливаем RAW JSON
        accumulatedJson += data.content;

        if (onDelta) {
          // Извлекаем текст из накопленного JSON
          const extractedText = extractMessageFromPartialJson(accumulatedJson);

          // Отправляем только НОВЫЕ символы (дельта текста)
          if (extractedText !== lastExtractedText) {
            const newDelta = extractedText.substring(lastExtractedText.length);
            if (newDelta) {
              onDelta(newDelta);
            }
            lastExtractedText = extractedText;
          }
        }
        return;
      }

      // Обработка закрытия канала
      if ((data as any).status === "channel_closed") {
        ws.close();
        if (onClose) {
          onClose();
        }
        return;
      }

      // TRUE STREAMING: Обработка финального сообщения
      if (data.type === 'assistant' || data.type === 'assist') {
        // Замеряем время получения финального ответа
        const finalAnswerAt = Date.now();

        // Если не было ни одной дельты (модель ответила сразу целиком),
        // используем время финального ответа как время первой дельты
        if (firstDeltaAt === null) {
          firstDeltaAt = finalAnswerAt;
        }

        // Сбрасываем накопители
        accumulatedJson = '';
        lastExtractedText = '';

        const finalMsg = data as FinalMessage;

        console.log('📊 [FINAL] tokenUsage:', tokenUsage);

        const response: AnswerResponse = {
          message: finalMsg.message,
          operator: finalMsg.operator,
          created_at: finalMsg.created_at,
          firstDeltaAt: firstDeltaAt || undefined,
          finalAnswerAt,
          // Добавляем завершённые вызовы функций если есть
          ...(completedFunctionCalls.length > 0 && {
            functionCalls: completedFunctionCalls
          }),
          // Добавляем информацию о расходе токенов если есть
          ...(tokenUsage && {
            tokenUsage
          })
        };

        console.log('📊 [FINAL] response.tokenUsage:', response.tokenUsage);

        // Сбрасываем таймер, function calls и token usage для следующего сообщения
        firstDeltaAt = null;
        completedFunctionCalls = [];
        tokenUsage = null;

        // Обработка файлов из payload.files
        if (finalMsg.files && Array.isArray(finalMsg.files) && finalMsg.files.length > 0) {
          response.files = finalMsg.files.map((file: any) => ({
            type: file.type,
            url: file.url,
            file_name: file.file_name,
            caption: file.caption
          }));

          // Для обратной совместимости: первый файл в прямые поля
          const firstFile = finalMsg.files[0];
          if (firstFile.type === "photo") {
            response.image_url = firstFile.url;
            response.file_name = firstFile.file_name;
            response.file_type = 'image';
          } else {
            response.file_url = firstFile.url;
            response.file_name = firstFile.file_name;
            response.file_type = 'file';
          }
        }
        // Fallback: проверяем прямые поля file_url/image_url
        else if (finalMsg.file_url || finalMsg.image_url) {
          if (finalMsg.image_url) {
            response.image_url = finalMsg.image_url;
            response.file_name = finalMsg.file_name;
            response.file_type = 'image';
          } else {
            response.file_url = finalMsg.file_url;
            response.file_name = finalMsg.file_name;
            response.file_type = finalMsg.file_type || 'file';
          }
        }

        onMessage(response);
        return;
      }

      // ОБРАТНАЯ СОВМЕСТИМОСТЬ: Старый формат сообщений (без типа)
      if ((data as any).message !== undefined) {
        // Замеряем время получения финального ответа
        const finalAnswerAt = Date.now();

        // Если не было ни одной дельты, используем время финального ответа
        if (firstDeltaAt === null) {
          firstDeltaAt = finalAnswerAt;
        }

        // Сбрасываем накопители
        accumulatedJson = '';
        lastExtractedText = '';

        const legacyData = data as any;
        const response: AnswerResponse = {
          message: legacyData.message,
          operator: legacyData.operator,
          created_at: legacyData.created_at,
          firstDeltaAt: firstDeltaAt || undefined,
          finalAnswerAt,
        };

        // Сбрасываем таймер
        firstDeltaAt = null;

        // Обработка файлов
        if (legacyData.files && Array.isArray(legacyData.files) && legacyData.files.length > 0) {
          response.files = legacyData.files.map((file: any) => ({
            type: file.type,
            url: file.url,
            file_name: file.file_name,
            caption: file.caption
          }));

          const firstFile = legacyData.files[0];
          if (firstFile.type === "photo") {
            response.image_url = firstFile.url;
            response.file_name = firstFile.file_name;
            response.file_type = 'image';
          } else {
            response.file_url = firstFile.url;
            response.file_name = firstFile.file_name;
            response.file_type = 'file';
          }
        }
        else if (legacyData.file_url || legacyData.image_url) {
          if (legacyData.image_url) {
            response.image_url = legacyData.image_url;
            response.file_name = legacyData.file_name;
            response.file_type = 'image';
          } else {
            response.file_url = legacyData.file_url;
            response.file_name = legacyData.file_name;
            response.file_type = legacyData.file_type || 'file';
          }
        }

        onMessage(response);
      } else if ((data as any).error) {
        if (onError) {
          onError(new Error((data as any).error));
        }
      }
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  ws.onclose = () => {
    // Очищаем накопители при закрытии
    accumulatedJson = '';
    lastExtractedText = '';
    firstDeltaAt = null;
    completedFunctionCalls = [];
    tokenUsage = null;

    if (onClose) {
      onClose();
    }
  };

  return ws;
};

/**
 * Остановка тестовой сессии
 */
export const testStopSession = async (): Promise<StopSessionResponse> => {
  try {
    const response = await authFetch(`/v1/api/test/stop`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Error stopping test session:", error);
    throw error;
  }
};

