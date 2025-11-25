export async function checkSettings(token) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const response = await fetch(`${LAND_URL}/dev-checksettings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Ошибка сервера: ${response.status}` }));
            throw new Error(errorData.error || `Ошибка сервера: ${response.status}`);
        }

        const textData = await response.text();
        try {
            const data = JSON.parse(textData);
            return data;
        } catch (jsonError) {
            throw new Error('Некорректный JSON-ответ от сервера');
        }
    } catch (error) {
        console.error('Ошибка при получении dev settings:', error);
        throw error.message || 'Неизвестная ошибка';
    }
}