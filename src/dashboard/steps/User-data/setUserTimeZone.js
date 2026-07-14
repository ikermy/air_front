import { authFetch } from "../../../utils/easyUtils";

export async function setUserTimeZone(data) {
    try {
        const response = await authFetch(`/v1/user/timezone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "timezone": data,
            }),
        });

        if (!response.ok) {
            // Если статус ответа не 200-299, обрабатываем ошибку
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        // Получаем и парсим данные модели
        return await response.json();
    } catch (error) {
        console.error('Ошибка при сохранении UserTimeZone:', error);
        throw error instanceof Error ? error.message : String(error);
    }
}