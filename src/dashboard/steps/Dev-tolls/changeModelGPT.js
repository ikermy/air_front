export async function changeModelGPT(token, modelId, modelName) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const response = await fetch(`${LAND_URL}/dev-changemodel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "mod_id": Number(modelId),
                "name": modelName,
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при изменении GPT модели');

        }
        // Результат аналогичный getDevData?
        return await response.json();
    } catch (error) {
        console.error('Ошибка при изменении GPT модели:', error);
        throw error.message;
    }
}