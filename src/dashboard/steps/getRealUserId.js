// Для продакшена конфигурация загружается из window.runtimeConfig.
// Для разработки - из process.env (через .env.development).
const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

/**
 * Получает реальный ID пользователя с сервера
 * @param {string} token - Токен авторизации
 * @returns {Promise<number|null>} - Возвращает ID пользователя или null в случае ошибки
 */
export async function getRealUserId(token) {
    try {
        const response = await fetch(`${LAND_URL}/realuserid?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при получении реального ID пользователя: ${response.status}`);
            return null;
        }

        return await response.text();
    } catch (error) {
        console.error('Ошибка при запросе реального ID пользователя:', error);
        return null;
    }
}
