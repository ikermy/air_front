export async function setUserTimeZone(token, data) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const response = await fetch(`${LAND_URL}/user/timezone?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "data": data,
            }),
        });

        if (!response.ok) {
            // Если статус ответа не 200-299, обрабатываем ошибку
            const errorData = await response.json();
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        // Получаем и парсим данные модели
        return await response.json();
    } catch (error) {
        console.error('Ошибка при сохранении UserTimeZone:', error);
        throw error.message;
    }
}