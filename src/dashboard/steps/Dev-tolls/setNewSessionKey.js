export async function setNewSessionKey(token) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const response = await fetch(`${LAND_URL}/dev-setsessionkey`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        if (!response.ok) {
            throw new Error('Ошибка при создании нового SessionKey');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при создании нового SessionKey:', error);
        throw error.message;
    }
}