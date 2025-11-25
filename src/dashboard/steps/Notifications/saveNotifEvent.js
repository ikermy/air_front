const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const saveNotifEvent = async (token, start, end, target) => {
    try {
        const response = await fetch(`${LAND_URL}/save-notifications-events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                token: token,
                start: start,
                end: end,
                target: target,
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return false
        } else {
            return true
        }

    } catch (error) {
        console.error("Ошибка при сохранении канала:", error);
        return false
    }
}

