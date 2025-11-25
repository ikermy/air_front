// Функция для удаления канала пользователя
// const LAND_URL = process.env.REACT_APP_LAND;
const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export async function deleteChannelData(token, channelType) {
    try {
        const response = await fetch(`${LAND_URL}/channel`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: token,       // токен авторизации пользователя
                type: channelType
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка при удалении канала');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка при удалении канала:', error);
        throw error;
    }
}
