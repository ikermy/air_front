const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const sendVerifCode = async (token, telegramId, pin) => {
    try {
        const response = await fetch(`${LAND_URL}/sendverifcode`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                token: token,
                id: telegramId,
                pin: String(pin)
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return
        }

        const result = await response.json();
        return response.ok && result.send === "ok";
    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
    }
}
