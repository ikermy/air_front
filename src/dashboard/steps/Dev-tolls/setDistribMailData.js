export async function setDistribMailData(token, respId, mail, pass, host, port) {
    const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

    try {
        const response = await fetch(`${LAND_URL}/dev-setdistribmail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "token": token,
                "resp_id": respId,
                "mail": mail,
                "pass": pass,
                "host": host,
                "port": port,
            })
        });
        if (!response.ok) {
            throw new Error('Ошибка при сохранении mail данных');
        }
        return await response.json(); // Возвращаем OK
    } catch (error) {
        console.error('Ошибка при сохранении mail данных:', error);
        throw error.message;
    }
}