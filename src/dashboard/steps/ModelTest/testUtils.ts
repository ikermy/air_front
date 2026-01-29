/**
 * Утилиты для работы с API тестирования моделей
 * Функции для управления тестовыми сессиями диалогов
 */

import {validateAndRefreshToken} from "../../../utils/easyUtils";

const LAND_URL = (window as any).runtimeConfig?.REACT_APP_LAND || process.env.REACT_APP_LAND;
const LAND_WSS = (window as any).runtimeConfig?.REACT_APP_LAND_WSS || process.env.REACT_APP_LAND_WSS;

// Логирование для отладки (можно удалить после проверки)
console.log('[testUtils] Using LAND_URL:', LAND_URL);
console.log('[testUtils] Using LAND_WSS:', LAND_WSS);

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
  dialog_id: string;
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
  dialog_id: string;
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
 * Интерфейс для ответа при получении ответа модели
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
 * POST /api/test/start?token=...
 */
export const testStartSession = async (
    token: string,
    provider: string
): Promise<StartSessionResponse> => {
  try {
    const validToken = await validateAndRefreshToken(token);
    if (!validToken) {
      throw new Error("Token validation failed");
    }

    const response = await fetch(
        `${LAND_URL}/api/test/start?provider=${encodeURIComponent(provider)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${validToken}`,
          },
          credentials: "include",
        }
    );

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
 * POST /api/test/ask?token=...
 */
export const testAsk = async (
    token: string,
    text: string,
    voice?: boolean,
    files?: FileUpload[]
): Promise<AskResponse> => {
  try {
    // Проверяем что есть либо текст либо файлы
    if (!text.trim() && (!files || files.length === 0)) {
      throw new Error("Text or files are required");
    }

    const validToken = await validateAndRefreshToken(token);
    if (!validToken) {
      throw new Error("Token validation failed");
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

    const response = await fetch(
        `${LAND_URL}/api/test/ask?token=${encodeURIComponent(validToken)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(request),
        }
    );

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
 * Получение ответа от модели через WebSocket
 * GET /ws/test-model
 */
export const testGetAnswer = (
    token: string,
    onMessage: (message: AnswerResponse) => void,
    onError?: (error: Event | Error) => void,
    onClose?: () => void
): WebSocket => {
  if (!LAND_WSS) {
    throw new Error("WebSocket URL is not configured");
  }

  // Формируем WebSocket URL (wss:// для https, ws:// для http)
  const wsUrl = `${LAND_WSS}/ws/test-model?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(wsUrl);

  // ws.onopen = () => {
  //   console.log("WebSocket connected to test model");
  //   console.log("WebSocket URL:", wsUrl);
  //   console.log("WebSocket readyState:", ws.readyState);
  // };

  ws.onmessage = (event) => {

    try {
      const data = JSON.parse(event.data);

      if (data.status === "channel_closed") {
        ws.close();
        if (onClose) {
          onClose();
        }
        return;
      }

      // Обработка сообщения от модели
      if (data.message !== undefined) {
        const response: AnswerResponse = {
          message: data.message,
          operator: data.operator,
          created_at: data.created_at,
        };

        // Обработка файлов из payload.files (массив файлов от сервера)
        if (data.files && Array.isArray(data.files) && data.files.length > 0) {

          // Сохраняем весь массив файлов
          response.files = data.files.map((file: any) => ({
            type: file.type,
            url: file.url,
            file_name: file.file_name,
            caption: file.caption
          }));

          // Для обратной совместимости: первый файл в прямые поля
          const firstFile = data.files[0];
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
        // Fallback: проверяем прямые поля file_url/image_url (для обратной совместимости)
        else if (data.file_url || data.image_url) {
          if (data.image_url) {
            response.image_url = data.image_url;
            response.file_name = data.file_name;
            response.file_type = 'image';
          } else {
            response.file_url = data.file_url;
            response.file_name = data.file_name;
            response.file_type = data.file_type || 'file';
          }
        }

        onMessage(response);
      } else if (data.error) {
        console.error("WebSocket error message:", data.error);
        if (onError) {
          onError(new Error(data.error));
        }
      } else {
        console.warn("WebSocket received unknown data format:", data);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      console.error("Failed to parse:", event.data);
      if (onError && error instanceof Error) {
        onError(error);
      }
    }
  };

  ws.onerror = (error) => {
    console.error("=== WebSocket ERROR ===");
    console.error("Error event:", error);
    console.error("WebSocket readyState:", ws.readyState);
    if (onError) {
      onError(error);
    }
  };

  ws.onclose = (event) => {
    if (onClose) {
      onClose();
    }
  };

  return ws;
};

/**
 * Остановка тестовой сессии
 * DELETE /api/test/stop?token=...
 */
export const testStopSession = async (
    token: string
): Promise<StopSessionResponse> => {
  try {
    const validToken = await validateAndRefreshToken(token);
    if (!validToken) {
      throw new Error("Token validation failed");
    }

    const response = await fetch(
        `${LAND_URL}/api/test/stop`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${validToken}`,
          },
          credentials: "include",
        }
    );

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




