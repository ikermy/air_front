export async function setKeyGPT(token, respId, proj, key) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const response = await fetch(`${LAND_URL}/dev-setkeygpt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "proj": proj,
                "key": key,
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при сохранении ключей GPT');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при сохранении ключей GPT:', error);
        throw error.message;
    }
}