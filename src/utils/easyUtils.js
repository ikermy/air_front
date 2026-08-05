import CryptoJS from "crypto-js";
import { getCookie, setCookie, deleteCookie } from './cookieUtils';

/**
 * Безопасное получение токена доступа с поддержкой SSR и fallback на localStorage
 */
export const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return getCookie('accessToken') || localStorage.getItem('authToken');
};

export const getCssVariable = (variable, element) => {
    if (typeof document === 'undefined') return null;
    element = element || document.body;
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
    if (!userId) {
        return {status: "error", message: "userId обязателен"};
    }

    try {
        const response = await fetch(`/v1/auth/session-key`, {
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

/**
 * Завершение сессии на стороне сервера и клиента
 */
export const apiLogout = async () => {
    try {
        // Пробуем отправить запрос на логаут на сервер
        await fetch('/v1/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Если есть STA, можем передать его и в заголовке, если сервер того требует
                'Authorization': `Bearer ${getCookie('accessToken')}`
            },
            credentials: 'include'
        });
    } catch (e) {
        console.error('Logout error:', e);
    } finally {
        // Максимально полная очистка на стороне клиента
        deleteCookie("accessToken");

        // Пытаемся удалить LTA куку, если она не HttpOnly
        deleteCookie("MarusiaRefreshToken");

        if (typeof window !== 'undefined') {
            localStorage.removeItem("authToken");
            localStorage.removeItem("accessToken"); // На всякий случай

            // Очистка сессионного хранилища, если там что-то было
            sessionStorage.clear();
        }
    }
};

/**
 * Принудительное обновление токена через Refresh Token (LTA)
 * Возвращает новый Access Token (STA) или null
 */
export const refreshToken = async () => {
    try {
        const response = await fetch(`/v1/auth/token/refresh`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Куки будут отправлены (MarusiaRefreshToken)
        });

        if (response.ok) {
            const data = await response.json();
            if (data.s) {
                const maxAge = process.env.REACT_APP_ACCESS_TOKEN_MAX_AGE || 900;
                setCookie("accessToken", data.s, { maxAge, secure: true, sameSite: 'lax' });
                return data.s;
            }
        }

        // Если рефреш не удался (например, 401) — чистим всё и выходим
        await apiLogout();
        return null;
    } catch (error) {
        console.error("Ошибка при обновлении токена:", error);
        await apiLogout();
        return null;
    }
};

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

function onRefreshed(token) {
    refreshSubscribers.map(cb => cb(token));
    refreshSubscribers = [];
}

/**
 * Универсальная обёртка для fetch-запросов с автоматическим обновлением токена при 4xx ошибках.
 * Теперь аргумент token необязателен — если он не передан, функция сама получит его.
 */
export const withTokenRefresh = async (fetchFunction, ...args) => {
    // Получаем текущий токен (из аргументов, кук или localStorage)
    let currentToken = getAuthToken();

    // Если токена нет совсем, пробуем превентивно обновиться (LTA -> STA)
    if (!currentToken) {
        if (!isRefreshing) {
            isRefreshing = true;
            currentToken = await refreshToken();
            isRefreshing = false;
            if (currentToken) {
                onRefreshed(currentToken);
            }
        } else {
            // Ждем завершения обновления, которое уже запущено другим запросом
            currentToken = await new Promise((resolve) => {
                subscribeTokenRefresh(resolve);
            });
        }
    }

    // Если после всех попыток токена нет, имитируем 401 для совместимости с обработкой ошибок
    if (!currentToken) {
        return {
            status: 401,
            ok: false,
            json: async () => ({ error: 'Unauthorized', message: 'Auth token not found' })
        };
    }

    // Первая попытка с текущим токеном
    let response = await fetchFunction(currentToken, ...args);

    // Если получили 401, запускаем механизм очереди и обновления
    if (response.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true;
            const newToken = await refreshToken();
            isRefreshing = false;

            if (newToken) {
                onRefreshed(newToken);
                return fetchFunction(newToken, ...args);
            } else {
                refreshSubscribers = [];
                return response;
            }
        }

        return new Promise((resolve) => {
            subscribeTokenRefresh(async (newToken) => {
                resolve(newToken ? await fetchFunction(newToken, ...args) : response);
            });
        });
    }

    return response;
};

/**
 * Авторизованный fetch, который сам добавляет заголовок Authorization
 * и использует withTokenRefresh для автоматического обновления токена.
 */
export const authFetch = async (url, options = {}) => {
    const performRequest = async (authToken) => {
        const authOptions = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${authToken}`
            }
        };
        return fetch(url, authOptions);
    };

    return withTokenRefresh(performRequest);
};
