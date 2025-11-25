export async function updateUserData(token, respId, name, email, pass) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const response = await fetch(`${LAND_URL}/dev-updateuserdata`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "name": name,
                "email": email,
                "pass": pass,
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при обновлении пользовательских данных');

        }
        // Результат аналогичный getDevData?
        return await response.json();
    } catch (error) {
        console.error('Ошибка при обновлении пользовательских данных:', error);
        throw error.message;
    }
}