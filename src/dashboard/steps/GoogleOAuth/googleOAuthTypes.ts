/**
 * TypeScript интерфейсы для Google OAuth интеграции
 */

/**
 * Ответ от API при получении URL для авторизации Google
 */
export interface GoogleAuthUrlResponse {
  url: string;
}

/**
 * Ответ от API при проверке статуса токена Google
 */
export interface GoogleTokenStatusResponse {
  connected: boolean;
  google_email?: string;
  expiry?: string;
  valid?: boolean;
  calendar_enabled?: boolean;
  sheets_enabled?: boolean;
}

/**
 * Ответ от API при отзыве токена Google
 */
export interface GoogleRevokeResponse {
  success: boolean;
  message: string;
}

/**
 * Информация о подключенном Google аккаунте
 */
export interface GoogleAccountInfo {
  email: string;
  expiry: Date;
  valid: boolean;
  calendar_enabled?: boolean;
  sheets_enabled?: boolean;
}

/**
 * Значение Google OAuth (поддерживает оба формата: calendar/Calendar, sheets/Sheets)
 */
export interface GoogleOAuthValue {
  calendar?: boolean;
  sheets?: boolean;
  Calendar?: boolean;  // Поддержка формата с бэкенда
  Sheets?: boolean;    // Поддержка формата с бэкенда
}

/**
 * Props для компонента GoogleOAuth
 */
export interface GoogleOAuthProps {
  provider: string;
  onChange?: (value: { calendar: boolean; sheets: boolean } | false) => void;
  disabled?: boolean;
  hasModel?: boolean; // Флаг наличия созданной модели
  value?: GoogleOAuthValue | boolean; // Значение из формы
}

