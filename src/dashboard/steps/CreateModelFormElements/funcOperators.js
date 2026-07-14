import { authFetch } from "../../../utils/easyUtils";

/**
 * Получает список ID Telegram аккаунтов операторов.
 */
export const funcOperators = async () => {
    // Параметр token оставлен для обратной совместимости, authFetch сам управляет токеном
    try {
        const response = await authFetch(`/v1/operators`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });

        if (!response.ok) {
            console.error(`Ошибка при получении списка операторов: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при запросе списка операторов:', error);
        return null;
    }
}

/**
 * Сохраняет список ID Telegram аккаунтов операторов.
 */
export const saveOperators = async (data) => {
    // Параметр token оставлен для обратной совместимости, но authFetch сам управляет токеном
    try {
        const response = await authFetch(`/v1/operators`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                data: data,
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку при сохранении операторов:", response.status);
            return false
        }

        return true;
    } catch (error) {
        console.error("Ошибка при сохранении списка операторов:", error);
        return false
    }
}


