const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const deleteNotifChanel = async (token, chanel) => {
    try {
        const response = await fetch(`${LAND_URL}/notifications`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                token: token,
                chan: chanel,
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return false
        } else {
            return true
        }

    } catch (error) {
        console.error("Ошибка при удалении канала:", error);
        return false
    }
}

