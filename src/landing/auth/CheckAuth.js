export async function checkAuthToken() {
    const LAND_URL = window.runtimeConfig?.REACT_APP_LAND || process.env.REACT_APP_LAND;
    const token = localStorage.getItem("authToken");

    if (!token) {
        return "no_token";
    }

    try {
        // Пытаемся валидировать текущий токен
        let response = await fetch(`${LAND_URL}/tvalidate?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        // Если токен недействителен, пробуем обновить
        if (response.status === 401) {

            response = await fetch(`${LAND_URL}/trefresh`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include', // Передаем куки с refresh токеном
            });

            if (response.ok) {
                const data = await response.json();
                if (data.s) {
                    localStorage.setItem("authToken", data.s);
                    // console.log("Токен успешно обновлен");
                    return "success";
                }
            } else {
                console.error("Не удалось обновить токен");
                localStorage.removeItem("authToken");
                return "error";
            }
        } else if (response.ok) {
            return "success";
        } else {
            console.error("Неизвестная ошибка при проверке токена");
            localStorage.removeItem("authToken");
            return "error";
        }
    } catch (error) {
        console.error("Ошибка при проверке/обновлении токена:", error);
        return "error";
    }
}

