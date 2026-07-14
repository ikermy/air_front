import { getAuthToken, refreshToken } from "../../utils/easyUtils";

/**
 * Проверяет наличие сессии.
 * В соответствии с FRONTEND_AUTH_GUIDE.md, не использует эндпоинт валидации.
 * Если Access Token отсутствует, пробуем выполнить обновление через Refresh Token.
 */
export async function checkAuthToken() {
    const token = getAuthToken();

    // Если токен есть, считаем сессию активной (ленивая стратегия)
    if (token) {
        return "success";
    }

    // Если Access Token нет, пробуем получить его через Refresh Token (HttpOnly кука)
    const newToken = await refreshToken();

    if (newToken) {
        return "success";
    }

    return "no_token";
}