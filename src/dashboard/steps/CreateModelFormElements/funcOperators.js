const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export async function funcOperators(token) {
    try {
        const response = await fetch(`${LAND_URL}/operators?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            console.error(`Ошибка при получении списка операторов: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при запросе списка операторов:', error);
        return null;
    }
}

export const saveOperators = async (token, data) => {
    try {
        const response = await fetch(`${LAND_URL}/operators?token=${token}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                data: data,
            }),
        });

        if (!response.ok) {
            console.error("Сервер вернул ошибку:", response.status);
            return false
        } else {
            return true
        }

    } catch (error) {
        console.error("Ошибка при сохранении списка операторов:", error);
        return false
    }
}