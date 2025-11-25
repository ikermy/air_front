export async function setBotData(token, respId, name, botToken) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const response = await fetch(`${LAND_URL}/dev-setbotdata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "name": name,
                "bot-token": botToken,
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при сохранении данных TelegramBot');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при сохранении данных TelegramBot:', error);
        throw error.message;
    }
}