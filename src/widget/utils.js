const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;

export const validateAndRefreshWidgetToken = async (token) => {
    if (token === "no_balance") { return token } // Такого не бывает

    try {
        // Пытаемся валидировать текущий токен
        const response = await fetch(`${LAND_URL}/widget/validate?token=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            // credentials: 'include', // Куки будут отправлены
        });

        if (response.status === 401) {
            const newToken = await refreshToken({oldtoken: token});
            if (newToken) {
                return newToken; // Возвращаем новый токен
            } else {
                return null; // Ошибка обновления токена
            }
        } else if (response.ok) {
            return token; // Возвращаем существующий токен
        } else {
            console.error("Неизвестная ошибка при проверке токена");
            localStorage.removeItem("authToken");
            return null; // Ошибка при валидации токена
        }
    } catch (error) {
        console.error("Ошибка при проверке токена:", error);
        return null; // Исключение при валидации
    }
};

const refreshToken = async ({oldtoken}) => {
    try {
        const response = await fetch(`${LAND_URL}/widget/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "oldToken": oldtoken }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                return data.token; // Возвращаю обновленный токен
            }
        } else {
            console.error("Не удалось обновить токен");
            return null
        }
    } catch (error) {
        console.error("Ошибка при обновлении токена:", error);
        return null
    }
};

export async function fetchUserName({ token, setToken, setUserName}, maxRetries = 3) {
    // TODO Пауза 250 для теста
    await new Promise(resolve => setTimeout(resolve, 250));

    const newtoken = await validateAndRefreshWidgetToken(token)
    if (newtoken === null) {
        console.error('Ошибка при обновлении токена');
        return;
    }

    setToken(newtoken)

    let response
    let retryCount = 0;

    const makeRequest = async () => {
        try {
            response = await fetch(`${LAND_URL}/widget/username?token=${encodeURIComponent(newtoken)}`, {
                method: "GET",
                headers: {"Content-Type": "application/json"},
            });

            if (response.status === 404) {
                console.error('Имя пользователя не найдено');
                return; // Остановка обработки
            }

            if (response.status === 429) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    const delay = Math.pow(2, retryCount) * 1000; // Экспоненциальная задержка: 2s, 4s, 8s
                    console.warn(`Слишком много запросов. Повторная попытка ${retryCount}/${maxRetries} через ${delay}ms`);

                    await new Promise(resolve => setTimeout(resolve, delay));
                    return await makeRequest(); // Рекурсивный вызов для повторной попытки
                } else {
                    console.error('Превышено максимальное количество попыток для статуса 429');
                    return;
                }
            }

            const data = await response.json();

            if (data.name) {
                setUserName(data.name);
            } else if (data.message === 'No user name') {
                // Если сервер вернул сообщение об отсутствии имени
                setUserName(null);
            } else {
                // Если формат данных неверный
                console.error("Неверный формат данных:", data);
                setUserName(null);
            }

        } catch (error) {
            console.error("ERROR_:", response?.status || 'Network error');
        }
    };

    await makeRequest();
}

export function generateRandomThreeDigitNumber() {
    return Math.floor(100 + Math.random() * 900);
}

export const formatTgubotData = (data, uids) => {
    if (!uids || uids.length === 0)
        return typeof data === 'string' ? data : JSON.stringify(data);

    const uidsString = uids.join(" ");

    if (typeof data === 'string') {
        try {
            // Попытка разобрать корректный JSON
            const dataObj = JSON.parse(data);
            dataObj.uids = uidsString;
            return JSON.stringify({
                token: JSON.stringify(dataObj)
            });
        } catch {
            // Если парсинг не проходит и строка начинается с "{", вставляем uids вручную
            if (data.trim().startsWith("{")) {
                // Вставляем ключ uids после первой открывающей фигурной скобки
                const modifiedData = data.replace(/^{/, `{"uids":"${uidsString}",`);
                return JSON.stringify({ token: modifiedData });
            }
            // В остальных случаях возвращаем исходную строку в качестве token
            return JSON.stringify({ token: data });
        }
    } else {
        const dataObj = { ...data, uids: uidsString };
        return JSON.stringify({
            token: JSON.stringify(dataObj)
        });
    }
};

export const formatWhatsBotData = (data, uids) => {
    // Преобразуем входные данные в объект, если они представлены строкой
    let dataObj = typeof data === 'string' ? JSON.parse(data) : data;

    // Добавляем Uids в объект
    dataObj = {
        ...dataObj,
        Uids: Array.isArray(uids) ? uids.join(" ") : uids || ""
    };

    // Всегда возвращаем строку JSON
    return JSON.stringify(dataObj);
};

