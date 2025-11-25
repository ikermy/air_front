// Функция для получения имени запущенного бота
const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export async function getBotName(token, chName) {
    try {
        const params = new URLSearchParams({ token, name: chName });
        const url = `${LAND_URL}/channel-name?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || 'Ошибка чтения имени бота');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка чтения имени бота:', error);
        throw error;
    }
}