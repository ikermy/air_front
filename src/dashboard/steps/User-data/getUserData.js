const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const getUserData = async (token) => {
    try {
        const response = await fetch(`${LAND_URL}/user/data?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
        throw error;
    }
};

