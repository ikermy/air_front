/**
 * Утилиты для работы с Google OAuth API
 */

import { authFetch } from "../../../utils/easyUtils";
import {
  GoogleAuthUrlResponse,
  GoogleTokenStatusResponse,
  GoogleRevokeResponse
} from "./googleOAuthTypes";


/**
 * Получить URL для авторизации Google
 * @returns Promise с URL для авторизации
 */
export async function getGoogleAuthUrl(): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const response = await authFetch(`/v1/google/oauth/url`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Ошибка при получении Google auth URL: ${response.status}`, errorData);
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const result: GoogleAuthUrlResponse = await response.json();
    console.log("result:", result);
    return { success: true, url: result.url };
  } catch (error) {
    console.error('Ошибка при получении Google auth URL:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Проверить статус токена Google для провайдера
 * @returns Promise со статусом подключения
 */
export async function checkGoogleTokenStatus(): Promise<{ success: boolean; data?: GoogleTokenStatusResponse; error?: string }> {
  try {
    const response = await authFetch(`/v1/google/token/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Ошибка при проверке статуса Google токена: ${response.status}`, errorData);
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const result: GoogleTokenStatusResponse = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Ошибка при проверке статуса Google токена:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Отозвать токен Google для провайдера
 * @returns Promise с результатом отзыва
 */
export async function revokeGoogleToken(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await authFetch(`/v1/google/token/revoke`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Ошибка при отзыве Google токена: ${response.status}`, errorData);
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const result: GoogleRevokeResponse = await response.json();
    return { success: true, message: result.message };
  } catch (error) {
    console.error('Ошибка при отзыве Google токена:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Открыть popup окно для авторизации Google и получить результат через postMessage
 * @param authUrl - URL для авторизации Google
 * @returns Promise с результатом авторизации
 */
export async function openGoogleAuthPopup(authUrl: string): Promise<{
  success: boolean;
  error?: string;
  autoCompleted?: boolean;
}> {
  return new Promise((resolve) => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      authUrl,
      'Google Authorization',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      resolve({ success: false, error: 'Не удалось открыть окно (popup заблокирован)' });
      return;
    }

    let authCompleted = false;
    let checkClosed: NodeJS.Timeout | null = null;

    const timeout = setTimeout(() => {
      if (!authCompleted) {
        try { popup.close(); } catch (e) {}
        if (checkClosed) clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        resolve({ success: false, error: 'Истек срок ожидания (20 минут)' });
      }
    }, 20 * 60 * 1000);

    const messageHandler = (event: MessageEvent) => {
      if (authCompleted) return;

      const data = event.data || {};

      // Обработка успешной авторизации от нашего сервера
      if (data.type === 'google_oauth_success' && data.success) {
        authCompleted = true;
        clearTimeout(timeout);
        if (checkClosed) clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        resolve({ success: true, autoCompleted: true });
        return;
      }

      // Обработка ошибки
      if (data.type === 'google_oauth_error') {
        authCompleted = true;
        clearTimeout(timeout);
        if (checkClosed) clearInterval(checkClosed);
        try { popup.close(); } catch (e) {}
        window.removeEventListener('message', messageHandler);
        resolve({ success: false, error: data.error || 'Ошибка авторизации' });
      }
    };

    window.addEventListener('message', messageHandler, false);

    // Проверяем закрытие popup
    checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed!);
        if (!authCompleted) {
          setTimeout(() => {
            if (!authCompleted) {
              clearTimeout(timeout);
              window.removeEventListener('message', messageHandler);
              resolve({ success: false, error: 'Окно авторизации закрыто пользователем' });
            }
          }, 1000);
        }
      }
    }, 500);
  });
}

/**
 * Полный процесс OAuth авторизации Google
 * @returns Promise с результатом авторизации
 */
export async function authorizeGoogle(): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  try {
    // Шаг 1: Получить auth URL
    const urlResult = await getGoogleAuthUrl();
    if (!urlResult.success || !urlResult.url) {
      return { success: false, error: `Не удалось получить URL: ${urlResult.error}` };
    }

    // Шаг 2: Открыть popup и дождаться авторизации
    const popupResult = await openGoogleAuthPopup(urlResult.url);
    if (!popupResult.success) {
      return { success: false, error: popupResult.error };
    }

    return { success: true, message: 'Google аккаунт успешно подключён' };
  } catch (error) {
    console.error('Ошибка при авторизации Google:', error);
    return { success: false, error: (error as Error).message };
  }
}
