export async function setUserKeyFn(token, respId, key) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        // Используем AbortController с таймаутом
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(`${LAND_URL}/dev-setuserkey`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "key": key,
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('Ошибка при сохранении UserKey');
        }

        return { success: true }; // Просто возвращаем успешный результат
    } catch (error) {
        // Если ошибка связана с перезапуском сервера, считаем операцию успешной
        if (error.name === 'AbortError' ||
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('reset')) {
            console.warn("Сервер перезапускается после сохранения UserKey");
            return { success: true }; // Операция успешна, несмотря на разрыв соединения
        }

        console.error('Ошибка при сохранении UserKey:', error);
        throw error.message;
    }
}