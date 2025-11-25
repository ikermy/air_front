// Функция для перезапуска контейнера
export async function restartContainer(token) {
    try {
        const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

        const response = await fetch(`${LAND_URL}/api/restart-container`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Неизвестная ошибка' }));
            throw new Error(errorData.message || 'Ошибка при перезапуске контейнера');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка при перезапуске контейнера:', error);
        throw error;
    }
}
