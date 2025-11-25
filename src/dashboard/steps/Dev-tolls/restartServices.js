export async function restartServices(token) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const response = await fetch(`${LAND_URL}/dev-restartservice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });
        if (!response.ok) {
            throw new Error('Ошибка перезапуска сервисов');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка перезапуска сервисов:', error);
        throw error.message;
    }
}