import CryptoJS from "crypto-js";

// Для продакшена конфигурация загружается из window.runtimeConfig.
// Для разработки - из process.env (через .env.development).
const LAND_URL = (window.runtimeConfig && window.runtimeConfig.REACT_APP_LAND) || process.env.REACT_APP_LAND;
// const LAND_URL = process.env.REACT_APP_LAND;

export const getCssVariable = (variable, element = document.body) => {
    // Проверяем, есть ли нужный класс на `element`
    const computedStyle = getComputedStyle(element);
    const value = computedStyle.getPropertyValue(variable).trim();

    if (value) {
        return value; // Возвращаем значение переменной, если оно найдено
    } else {
        console.warn(`Переменная ${variable} не найдена для элемента ${element.tagName}`);
        return null; // Возвращаем null, если переменная не определена
    }
};

// export async function encryptPassword(password, encryptionKey) {
//     const encr = CryptoJS.AES.encrypt(password, encryptionKey).toString()
//     return encr.toString()
// }

export async function encryptPassword(password, encryptionKey) {
    // Проверяем валидность входных параметров
    if (!password) {
        throw new Error('Password is required');
    }

    if (!encryptionKey) {
        throw new Error('Encryption key is required');
    }

    if (typeof password !== 'string' || typeof encryptionKey !== 'string') {
        throw new Error('Password and encryption key must be strings');
    }

    try {
        return CryptoJS.AES.encrypt(password, encryptionKey).toString();
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

export async function getKey({userId}) {
    // Проверяем наличие LAND_URL
    if (!LAND_URL) {
        console.error('LAND_URL не определен');
        return {status: "error", message: "LAND_URL не настроен"};
    }

    if (!userId) {
        return {status: "error", message: "userId обязателен"};
    }

    try {
        const response = await fetch(`${LAND_URL}/key`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                "a": userId,
            })
        });

        if (!response.ok) {
            return {status: "error", message: `HTTP ${response.status}`};
        }

        const data = await response.json();

        if (!data.key) {
            return {status: "error", message: "Ключ не получен с сервера"};
        }

        return {status: "ok", key: data.key};
    } catch (error) {
        console.error("Error getting key:", error);
        return {status: "error", message: error.message || "Ошибка сети"};
    }
}

// export async function getKey({userId}) {
//     try {
//         const response = await fetch(`${LAND_URL}/key`, {
//             method: 'POST',
//             headers: {'Content-Type': 'application/json'},
//             body: JSON.stringify({
//                 "a": userId,
//             })
//         });
//
//         if (!response.ok) {
//             return {status: "error"}
//         }
//
//         const data = await response.json();
//
//         return {status: "ok", key: data.key}
//     } catch (error) {
//         console.error("Error: " + JSON.stringify(error))
//         return {status: "error"}
//     }
// }

const refreshToken = async () => {
    try {
        const response = await fetch(`${LAND_URL}/trefresh`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Куки будут отправлены
        });

        if (response.ok) {
            const data = await response.json();
            if (data.s) {
                localStorage.setItem("authToken", data.s);
                // console.log("Токен успешно обновлен");
                return data.s; // Возвращаю обновленный токен
            }
        } else {
            console.error("Не удалось обновить токен");
            localStorage.removeItem("authToken");
            return null
        }
    } catch (error) {
        console.error("Ошибка при обновлении токена:", error);
        localStorage.removeItem("authToken");
        return null
    }
};

export const validateAndRefreshToken = async (token) => {
    // Fallback: если токен не передан, пробуем взять из localStorage
    if (!token) {
        const stored = localStorage.getItem('authToken');
        if (stored) {
            token = stored;
        } else {
            console.warn('validateAndRefreshToken: токен не передан и отсутствует в localStorage');
            return null;
        }
    }
    try {
        const response = await fetch(`${LAND_URL}/tvalidate?token=${encodeURIComponent(token)}`, {
            method: "GET",
            headers: {"Content-Type": "application/json"},
        });

        if (response.status === 401) {
            const newToken = await refreshToken();
            if (newToken) {
                localStorage.setItem("authToken", newToken);
                return newToken;
            } else {
                return null;
            }
        } else if (response.ok) {
            return token;
        } else {
            console.error("Неизвестная ошибка при проверке токена");
            localStorage.removeItem("authToken");
            return null;
        }
    } catch (error) {
        console.error("Ошибка при проверке токена:", error);
        return null;
    }
};
