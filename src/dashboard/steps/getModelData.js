const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export async function getModelData(token) {
    // Пауза 500 мс перед перезагрузкой списка контактов
    await new Promise(resolve => setTimeout(resolve, 250));
    try {
        const response = await fetch(`${LAND_URL}/model?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            // Если статус ответа не 200-299, обрабатываем ошибку
            const errorData = await response.json();
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }
        // Получаем и парсим данные модели
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении модели:', error);
        throw error;
    }
}

// Вспомогательные функции для работы с новым форматом
export function extractAllModels(data) {
    return data?.models || {};
}

export function getActiveProviderName(data) {
    return data?.active_provider || null;
}

export function getProviderModel(data, provider) {
    return data?.models?.[provider] || null;
}

