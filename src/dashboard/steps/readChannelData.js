const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const readChannelData = async (type, token) => {
    try {
        // Проверка наличия токена
        if (!token) {
            throw new Error('Токен не предоставлен');
        }

        let url
        switch (type) {
            case "channels":
                url = `${LAND_URL}/channel`
                break
            case "notifications":
                url = `${LAND_URL}/notifications`
                break
            default:
                console.error("Неподдерживаемый тип:", type)
                return false
        }

        const response = await fetch(`${url}?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        // Проверка ответа
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Недействительный токен авторизации');
            } else if (response.status === 429) {
                throw new Error('Слишком много запросов, попробуйте позже');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка получения каналов');
            }
        }

        // Получение данных из ответа
        return await response.json();
    } catch (error) {
        console.error('Ошибка при получении каналов:', error);
        throw error;
    }
}

